/**
 * Check role locators with Playwright's own engine right after capture.
 *
 * capture-tree.js approximates the accessible name in the page; for composite
 * widgets (a menuitem wrapping a dropdown, custom components) the approximation
 * can differ from what getByRole matches. Every role locator is counted with
 * page.getByRole(...); ones that do not resolve to exactly one element are
 * dropped from the sidecar and replaced in the YAML by the control's next
 * verified locator (test id, id, name, ...), or removed when there is none.
 */
import type { Page } from "playwright";
import { parseLocator } from "./pack/parse.js";
import { toPlaywright } from "./pack/verify.js";
import type { AltLocator } from "./snapshot-write.js";

export interface RoleCheckResult {
  tree: string;
  locators: AltLocator[];
  checked: number;
  replaced: number;
  removed: number;
}

const NAME_BASED = new Set(["linkText", "label", "placeholder"]);
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const key = (role: string, name: string, scope = "") => role + "\u0000" + name + "\u0000" + scope;
const scopeKey = (l: { scopeBy?: string; scopeValue?: string; scopeText?: string; frame?: string }) =>
  (l.frame ? "frame:" + l.frame + "|" : "") + (l.scopeBy ? l.scopeBy + "=" + l.scopeValue + "|" + (l.scopeText ?? "") : "");

function stabilityOf(l: AltLocator): string {
  if (l.by === "testid" || l.by === "id" || l.by === "name") return "high";
  if (l.by === "xpath" || (l.by === "css" && /nth-child/.test(l.value))) return "low";
  return "medium";
}

function formatLine(indent: string, l: AltLocator): string {
  return indent + "- {by: " + l.by + ', value: "' + esc(l.value) + '"'
    + (l.locName ? ', name: "' + esc(l.locName) + '"' : "")
    + (l.by === "testid" && l.attr && l.attr !== "data-testid" ? ", attr: " + l.attr : "")
    + (l.scopeBy ? ", scopeBy: " + l.scopeBy + ', scopeValue: "' + esc(l.scopeValue ?? "") + '"'
      + (l.scopeName ? ', scopeName: "' + esc(l.scopeName) + '"' : "")
      + (l.scopeAttr && l.scopeAttr !== "data-testid" ? ", scopeAttr: " + l.scopeAttr : "")
      + (l.scopeText ? ', scopeText: "' + esc(l.scopeText) + '"' : "") : "")
    + ", stability: " + stabilityOf(l)
    + ", score: " + (l.score ?? 60) + "}";
}

export async function checkRoleLocators(page: Page, tree: string, locators: AltLocator[]): Promise<RoleCheckResult> {
  const roleRows = locators.filter((l) => l.by === "role");
  const bad = new Set<string>();
  const seen = new Set<string>();
  for (const l of roleRows) {
    const k = key(l.value, l.locName ?? "", scopeKey(l));
    if (seen.has(k)) continue;
    seen.add(k);
    let n = -1;
    try {
      n = await toPlaywright(page, { by: "role", value: l.value, name: l.locName, scopeBy: l.scopeBy, scopeValue: l.scopeValue, scopeName: l.scopeName, scopeAttr: l.scopeAttr, scopeText: l.scopeText, frame: l.frame }).count();
    } catch { /* unknown role or bad name: treat as unusable */ }
    if (n !== 1) bad.add(k);
  }
  if (!bad.size) return { tree, locators, checked: seen.size, replaced: 0, removed: 0 };

  const badCtl = new Set(roleRows.filter((l) => bad.has(key(l.value, l.locName ?? "", scopeKey(l)))).map((l) => l.ctl));
  let kept = locators.filter((l) => !(l.by === "role" && bad.has(key(l.value, l.locName ?? "", scopeKey(l)))));
  // Best remaining locator for each control whose role locator failed, itself checked
  // with Playwright (link text and labels are name-based too and can be just as wrong).
  const fallback = new Map<string, AltLocator>();
  const rejected = new Set<AltLocator>();
  for (const ctl of badCtl) {
    const role = locators.find((x) => x.ctl === ctl && x.by === "role");
    if (!role) continue;
    const alts = kept.filter((l) => l.ctl === ctl).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    for (const l of alts) {
      let n = -1;
      try { n = await toPlaywright(page, { by: l.by, value: l.value, name: l.locName, attr: l.attr, scopeBy: l.scopeBy, scopeValue: l.scopeValue, scopeName: l.scopeName, scopeAttr: l.scopeAttr, scopeText: l.scopeText, frame: l.frame }).filter({ visible: true }).count(); } catch { /* bad selector */ }
      if (n === 1) { fallback.set(key(role.value, role.locName ?? "", scopeKey(role)), l); break; }
      if (NAME_BASED.has(l.by)) rejected.add(l);
    }
  }
  kept = kept.filter((l) => !rejected.has(l));

  let replaced = 0;
  let removed = 0;
  const out: string[] = [];
  let frame = ""; // every node inside an iframe carries [in-iframe=path]
  for (const line of tree.split("\n")) {
    if (/^\s*- [a-zA-Z]/.test(line)) frame = /\[(?:[^\]]*, )?in-iframe=([^\],]+)/.exec(line)?.[1] ?? "";
    const m = /^(\s*)- \{by: role,/.exec(line);
    if (m) {
      const loc = parseLocator(line.trim());
      if (loc && frame) loc.frame = frame;
      if (loc && bad.has(key(loc.value, loc.name ?? "", scopeKey(loc)))) {
        const fb = fallback.get(key(loc.value, loc.name ?? "", scopeKey(loc)));
        if (fb && !out.includes(formatLine(m[1], fb))) {
          out.push(formatLine(m[1], fb));
          replaced++;
        } else {
          removed++;
        }
        continue;
      }
    }
    out.push(line);
  }
  // drop "locators:" headers left with no entries
  const ind = (l: string) => l.length - l.trimStart().length;
  const hasEntry = (i: number) => {
    const next = out[i + 1] ?? "";
    return next.trim().startsWith("- {") && ind(next) > ind(out[i]);
  };
  const cleaned = out.filter((l, i) => l.trim() !== "locators:" || hasEntry(i));
  return { tree: cleaned.join("\n"), locators: kept, checked: seen.size, replaced, removed };
}
