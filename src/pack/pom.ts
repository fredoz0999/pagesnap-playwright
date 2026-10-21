/**
 * Deterministic Playwright page-object generator.
 *
 * Every captured control already has a live-verified locator, so the page
 * objects can be written without an LLM. The agent then only writes the test
 * flow against named members, which costs fewer tokens and leaves no room to
 * invent selectors.
 *
 * Output (default tests/pages/):
 *   base.page.ts       controls shared by 2+ pages (header, nav, footer)
 *   <name>.page.ts     one class per distinct URL path
 *   index.ts           barrel export
 *   PAGES.md           member -> locator map (small, for the agent)
 */
import fs from "node:fs";
import path from "node:path";
import { parseSnapshot, walk, type Locator, type SnapNode } from "./parse.js";
import { snapshotFiles } from "./index.js";

export interface PomMember {
  prop: string;
  role: string;
  name: string;
  locator: Locator;
  code: string;
  fragile: boolean;
}

export interface PomPage {
  className: string;
  file: string;
  urlPath: string;
  steps: number[];
  members: PomMember[];
}

export interface PomResult {
  base: PomMember[];
  pages: PomPage[];
  testIdAttribute: string | null;
  files: string[];
}

const KEEP_ROLES = new Set([
  "button", "link", "textbox", "searchbox", "combobox", "listbox", "checkbox", "radio", "switch",
  "tab", "menuitem", "slider", "spinbutton", "option",
]);
const SUFFIX: Record<string, string> = {
  button: "Button", link: "Link", textbox: "Input", searchbox: "Search", combobox: "Select", listbox: "List",
  checkbox: "Checkbox", radio: "Radio", switch: "Switch", tab: "Tab", menuitem: "MenuItem", slider: "Slider",
  spinbutton: "Input", option: "Option", generic: "", heading: "Heading", alert: "Alert", table: "Table",
};

function words(s: string): string[] {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
}

function camel(parts: string[]): string {
  const w = parts.map((p) => p.toLowerCase());
  const out = w.map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1))).join("");
  return /^[0-9]/.test(out) ? "n" + out : out || "element";
}

function pascal(parts: string[]): string {
  const c = camel(parts);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function js(s: string): string {
  return "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}

/** Playwright code for a PageSnap locator, relative to `this.page`. */
export function locatorCode(l: Locator): string {
  switch (l.by) {
    case "testid": return "this.page.getByTestId(" + js(l.value) + ")";
    case "id": return "this.page.locator(" + js("#" + l.value) + ")";
    case "name": return "this.page.locator(" + js('[name="' + l.value + '"]') + ")";
    case "role": return "this.page.getByRole(" + js(l.value) + (l.name ? ", { name: " + js(l.name) + ", exact: true }" : "") + ")";
    case "label": return "this.page.getByLabel(" + js(l.value) + ", { exact: true })";
    case "placeholder": return "this.page.getByPlaceholder(" + js(l.value) + ", { exact: true })";
    case "linkText": return "this.page.getByRole('link', { name: " + js(l.value) + ", exact: true })";
    case "xpath": return "this.page.locator(" + js("xpath=" + l.value) + ")";
    default: return "this.page.locator(" + js(l.value) + ")";
  }
}

function urlPathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.replace(/;jsessionid=[^/]*/i, "") || "/";
  } catch {
    return url;
  }
}

function classNameFor(urlPath: string, title: string): string {
  const last = urlPath.split("/").filter(Boolean).pop() || "";
  const stem = last.replace(/\.(html?|htm|jsp|php|aspx?)$/i, "");
  const parts = words(stem);
  if (!parts.length || /^index$/i.test(stem)) {
    const t = words(title);
    return (t.length ? pascal(t) : "Home") + "Page";
  }
  return pascal(parts) + "Page";
}

function bestLocator(n: SnapNode): Locator | null {
  const ok = n.locators.filter((l) => l.matches == null);
  if (!ok.length) return null;
  return ok[0];
}

function memberBase(n: SnapNode, l: Locator): string[] {
  const idLike = l.by === "testid" || l.by === "id" || l.by === "name";
  // Repeated names (6x "Add to cart") and data text ("$29.99") make bad member names:
  // the test id / id carries the identity there.
  const repeated = n.flags.some((f) => /^dup \d+\/\d+$/.test(f) || f.startsWith("in="));
  const dataText = !KEEP_ROLES.has(n.role) || !/[a-z]{2}/i.test(n.name);
  if (idLike && (repeated || dataText)) {
    const w = words(l.value);
    if (w.length) return w;
  }
  const base = n.name && n.name.length <= 40 ? words(n.name) : [];
  if (base.length) return base;
  if (l.by === "testid" || l.by === "id" || l.by === "name") return words(l.value);
  if (l.by === "label" || l.by === "placeholder") return words(l.value);
  return [n.role];
}

function wanted(n: SnapNode): boolean {
  if (KEEP_ROLES.has(n.role)) return true;
  // testid'd text the test may assert on (title, badge, error, balance)
  if ((n.role === "generic" || n.role === "heading" || n.role === "alert" || n.role === "table") && n.locators.some((l) => l.by === "testid" || l.by === "id")) {
    return true;
  }
  return false;
}

export function buildPom(sessionDir: string): Omit<PomResult, "files"> {
  const files = snapshotFiles(sessionDir);
  type Raw = { node: SnapNode; loc: Locator; key: string };
  const byPage = new Map<string, { title: string; steps: number[]; raws: Map<string, Raw> }>();
  const pagesPerKey = new Map<string, Set<string>>();
  let testIdAttribute: string | null = null;

  for (const f of files) {
    const snap = parseSnapshot(fs.readFileSync(path.join(sessionDir, f), "utf8"), f);
    const up = urlPathOf(snap.url);
    const entry = byPage.get(up) || { title: snap.title, steps: [] as number[], raws: new Map<string, Raw>() };
    entry.steps.push(snap.step);
    walk(snap.roots, (n) => {
      if (!wanted(n)) return;
      const l = bestLocator(n);
      if (!l) return;
      if (l.by === "testid" && l.attr && l.attr !== "data-testid") testIdAttribute = l.attr;
      const key = l.by + "|" + l.value + "|" + (l.name || "");
      if (!entry.raws.has(key)) entry.raws.set(key, { node: n, loc: l, key });
      const set = pagesPerKey.get(key) || new Set<string>();
      set.add(up);
      pagesPerKey.set(key, set);
    });
    byPage.set(up, entry);
  }

  const shared = new Set([...pagesPerKey.entries()].filter(([, s]) => s.size >= 2).map(([k]) => k));
  const toMembers = (raws: Raw[], taken: Set<string>): PomMember[] => {
    const out: PomMember[] = [];
    for (const r of raws) {
      const suffix = SUFFIX[r.node.role] ?? "";
      const baseWords = memberBase(r.node, r.loc);
      let prop = camel(baseWords) + (suffix && !camel(baseWords).toLowerCase().endsWith(suffix.toLowerCase()) ? suffix : "");
      let i = 2;
      while (taken.has(prop)) prop = prop.replace(/\d+$/, "") + i++;
      taken.add(prop);
      out.push({
        prop,
        role: r.node.role,
        name: r.node.name,
        locator: r.loc,
        code: locatorCode(r.loc),
        fragile: r.loc.by === "xpath" || (r.loc.by === "css" && /nth-child/.test(r.loc.value)),
      });
    }
    return out;
  };

  // Shared members: take the node from the first page that has them.
  const sharedRaws: Raw[] = [];
  const seenShared = new Set<string>();
  for (const { raws } of byPage.values()) {
    for (const r of raws.values()) {
      if (shared.has(r.key) && !seenShared.has(r.key)) { seenShared.add(r.key); sharedRaws.push(r); }
    }
  }
  const baseTaken = new Set<string>(["page", "goto", "path"]);
  const base = toMembers(sharedRaws, baseTaken);

  const usedClass = new Set<string>();
  const pages: PomPage[] = [];
  for (const [urlPath, e] of byPage) {
    let className = classNameFor(urlPath, e.title);
    let i = 2;
    while (usedClass.has(className)) className = className.replace(/Page\d*$/, "") + "Page" + i++;
    usedClass.add(className);
    const own = [...e.raws.values()].filter((r) => !shared.has(r.key));
    const taken = new Set(baseTaken);
    for (const b of base) taken.add(b.prop);
    const fileStem = className.replace(/Page\d*$/, (m) => m.replace("Page", "")).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase() || "page";
    pages.push({ className, file: fileStem + ".page.ts", urlPath, steps: e.steps, members: toMembers(own, taken) });
  }
  return { base, pages, testIdAttribute };
}

function memberLines(ms: PomMember[]): string[] {
  const out: string[] = [];
  for (const m of ms) {
    const label = m.name ? m.role + ' "' + m.name.replace(/\*\//g, "") + '"' : m.role;
    out.push("  /** " + label + (m.fragile ? " - FRAGILE structural locator, ask dev for a test id" : "") + " */");
    out.push("  get " + m.prop + "(): Locator {");
    out.push("    return " + m.code + ";");
    out.push("  }");
    out.push("");
  }
  if (out.length) out.pop();
  return out;
}

export function renderPom(p: Omit<PomResult, "files">, sessionDir: string): Map<string, string> {
  const files = new Map<string, string>();
  const header = "// Generated by pagesnap pack pom from " + path.basename(sessionDir) + ". Regenerate instead of editing locators by hand.\n";
  files.set("base.page.ts", [
    header + "import type { Locator, Page } from '@playwright/test';",
    "",
    "/** Controls present on two or more captured pages (header, nav, footer). */",
    "export class BasePage {",
    "  constructor(readonly page: Page) {}",
    ...(p.base.length ? [""] : []),
    ...memberLines(p.base),
    "}",
    "",
  ].join("\n"));
  for (const pg of p.pages) {
    files.set(pg.file, [
      header + "import type { Locator } from '@playwright/test';",
      "import { BasePage } from './base.page';",
      "",
      "/** " + pg.urlPath + " (captured at step " + pg.steps.join(", ") + ") */",
      "export class " + pg.className + " extends BasePage {",
      "  static readonly path = " + js(pg.urlPath) + ";",
      "",
      "  async goto(): Promise<void> {",
      "    await this.page.goto(" + pg.className + ".path);",
      "  }",
      ...(pg.members.length ? [""] : []),
      ...memberLines(pg.members),
      "}",
      "",
    ].join("\n"));
  }
  files.set("index.ts", header + ["export { BasePage } from './base.page';",
    ...p.pages.map((pg) => "export { " + pg.className + " } from './" + pg.file.replace(/\.ts$/, "") + "';"), ""].join("\n"));
  const md: string[] = [
    "# Page objects (generated)",
    "",
    "Use these members in specs instead of raw selectors. `import { LoginPage } from './pages';`",
  ];
  if (p.testIdAttribute) md.push("", "playwright.config: `use: { testIdAttribute: '" + p.testIdAttribute + "' }`");
  const section = (title: string, ms: PomMember[]) => {
    md.push("", "## " + title);
    for (const m of ms) md.push("- " + m.prop + " = " + m.role + (m.name ? ' "' + m.name + '"' : "") + (m.fragile ? " (fragile)" : ""));
  };
  section("BasePage (on 2+ pages; every page class extends it)", p.base);
  for (const pg of p.pages) section(pg.className + " " + pg.urlPath + " (steps " + pg.steps.join(",") + ")", pg.members);
  files.set("PAGES.md", md.join("\n") + "\n");
  return files;
}

export function writePom(sessionDir: string, outDir: string): PomResult {
  const p = buildPom(sessionDir);
  const rendered = renderPom(p, sessionDir);
  fs.mkdirSync(outDir, { recursive: true });
  const written: string[] = [];
  for (const [f, body] of rendered) {
    const target = path.join(outDir, f);
    fs.writeFileSync(target, body, "utf8");
    written.push(target);
  }
  return { ...p, files: written };
}
