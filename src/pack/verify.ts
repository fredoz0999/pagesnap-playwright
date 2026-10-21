/**
 * Live drift check: reopen each captured page and count how many elements
 * every recorded locator matches now. 1 = ok, 0 = gone, >1 = ambiguous.
 *
 * Pages that need app state (login, cart contents) need --storage with a
 * Playwright storageState saved during capture (--save-storage). Steps whose
 * URL lands somewhere else (redirect to login) are reported, not counted.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, selectors, type Page } from "playwright";
import { launchOptions } from "../browser-session.js";
import { parseSnapshot, walk, type Locator } from "./parse.js";
import { snapshotFiles } from "./index.js";

export interface VerifyItem {
  step: number;
  url: string;
  label: string;
  locator: Locator;
  count: number;
  status: "ok" | "gone" | "ambiguous" | "error";
}

export interface VerifyPage {
  step: number;
  url: string;
  landedOn: string;
  skipped?: string;
}

export interface VerifyReport {
  pages: VerifyPage[];
  items: VerifyItem[];
  counts: { ok: number; gone: number; ambiguous: number; error: number };
  text: string;
}

const ACTIONABLE = new Set(["button", "link", "textbox", "searchbox", "combobox", "listbox", "checkbox", "radio", "switch", "tab", "menuitem", "slider", "spinbutton"]);

/** Same mapping the page objects use, applied to a live page. */
export function toPlaywright(page: Page, l: Locator) {
  switch (l.by) {
    case "testid": return page.getByTestId(l.value);
    case "id": return page.locator("#" + cssId(l.value));
    case "name": return page.locator('[name="' + l.value.replace(/"/g, '\\"') + '"]');
    case "role": return page.getByRole(l.value as Parameters<Page["getByRole"]>[0], l.name ? { name: l.name, exact: true } : {});
    case "label": return page.getByLabel(l.value, { exact: true });
    case "placeholder": return page.getByPlaceholder(l.value, { exact: true });
    case "linkText": return page.getByRole("link", { name: l.value, exact: true });
    case "xpath": return page.locator("xpath=" + l.value);
    default: return page.locator(l.value);
  }
}

function cssId(id: string): string {
  return /^[A-Za-z_][\w-]*$/.test(id) ? id : id.replace(/([^\w-])/g, "\\$1");
}

function samePath(a: string, b: string): boolean {
  try {
    const x = new URL(a), y = new URL(b);
    return x.host === y.host && x.pathname.replace(/;jsessionid=[^/]*/i, "") === y.pathname.replace(/;jsessionid=[^/]*/i, "");
  } catch {
    return a === b;
  }
}

export interface VerifyOptions {
  storage?: string;
  /** only these steps */
  steps?: number[];
  headless?: boolean;
  timeoutMs?: number;
}

export async function verifySession(sessionDir: string, opts: VerifyOptions = {}): Promise<VerifyReport> {
  const files = snapshotFiles(sessionDir);
  const browser = await chromium.launch(launchOptions(opts.headless !== false));
  const items: VerifyItem[] = [];
  const pages: VerifyPage[] = [];
  let testIdAttr: string | null = null;
  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      storageState: opts.storage && fs.existsSync(opts.storage) ? opts.storage : undefined,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(opts.timeoutMs ?? 15000);
    for (const f of files) {
      const snap = parseSnapshot(fs.readFileSync(path.join(sessionDir, f), "utf8"), f);
      if (opts.steps && !opts.steps.includes(snap.step)) continue;
      const locs: { label: string; l: Locator }[] = [];
      walk(snap.roots, (n) => {
        if (!ACTIONABLE.has(n.role)) return;
        const l = n.locators.find((x) => x.matches == null);
        if (!l) return;
        if (l.by === "testid" && l.attr && l.attr !== "data-testid") testIdAttr = l.attr;
        locs.push({ label: n.role + (n.name ? ' "' + n.name + '"' : ""), l });
      });
      if (testIdAttr) selectors.setTestIdAttribute(testIdAttr);
      let landed = "";
      try {
        await page.goto(snap.url, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
        landed = page.url();
      } catch (e) {
        pages.push({ step: snap.step, url: snap.url, landedOn: "", skipped: "navigation failed: " + (e instanceof Error ? e.message.split("\n")[0] : String(e)) });
        continue;
      }
      if (!samePath(landed, snap.url)) {
        pages.push({ step: snap.step, url: snap.url, landedOn: landed, skipped: "redirected (needs --storage or app state)" });
        continue;
      }
      pages.push({ step: snap.step, url: snap.url, landedOn: landed });
      for (const { label, l } of locs) {
        let count = -1;
        try { count = await toPlaywright(page, l).count(); } catch { /* invalid selector */ }
        items.push({
          step: snap.step, url: snap.url, label, locator: l, count,
          status: count === 1 ? "ok" : count === 0 ? "gone" : count > 1 ? "ambiguous" : "error",
        });
      }
    }
  } finally {
    await browser.close();
  }
  const counts = { ok: 0, gone: 0, ambiguous: 0, error: 0 };
  items.forEach((i) => counts[i.status]++);
  const lines = ["pagesnap verify: " + path.basename(sessionDir)];
  for (const p of pages) {
    const mine = items.filter((i) => i.step === p.step);
    lines.push("step " + p.step + " " + p.url + (p.skipped ? "  SKIPPED: " + p.skipped + (p.landedOn ? " -> " + p.landedOn : "")
      : "  " + mine.filter((i) => i.status === "ok").length + "/" + mine.length + " ok"));
    for (const i of mine.filter((x) => x.status !== "ok")) {
      lines.push("  " + i.status.toUpperCase() + " " + i.label + "  " + i.locator.by + "=" + i.locator.value + (i.count > 1 ? " (" + i.count + " matches)" : ""));
    }
  }
  lines.push("", "ok " + counts.ok + " | gone " + counts.gone + " | ambiguous " + counts.ambiguous + " | error " + counts.error);
  if (counts.gone) lines.push("Gone locators: recapture the page, then `pack heal` suggests replacements.");
  return { pages, items, counts, text: lines.join("\n") + "\n" };
}
