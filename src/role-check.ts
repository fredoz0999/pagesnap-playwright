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
import type { AltLocator } from "./snapshot-write.js";

export interface RoleCheckResult {
  tree: string;
  locators: AltLocator[];
  checked: number;
  replaced: number;
  removed: number;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const key = (role: string, name: string) => role + "\u0000" + name;

function stabilityOf(l: AltLocator): string {
  if (l.by === "testid" || l.by === "id" || l.by === "name") return "high";
  if (l.by === "xpath" || (l.by === "css" && /nth-child/.test(l.value))) return "low";
  return "medium";
}

function formatLine(indent: string, l: AltLocator): string {
  return indent + "- {by: " + l.by + ', value: "' + esc(l.value) + '"'
    + (l.locName ? ', name: "' + esc(l.locName) + '"' : "")
    + (l.by === "testid" && l.attr && l.attr !== "data-testid" ? ", attr: " + l.attr : "")
    + ", stability: " + stabilityOf(l)
    + ", score: " + (l.score ?? 60) + "}";
}

export async function checkRoleLocators(page: Page, tree: string, locators: AltLocator[]): Promise<RoleCheckResult> {
  const roleRows = locators.filter((l) => l.by === "role");
  const bad = new Set<string>();
  const seen = new Set<string>();
  for (const l of roleRows) {
    const k = key(l.value, l.locName ?? "");
    if (seen.has(k)) continue;
    seen.add(k);
    let n = -1;
    try {
      n = await page
        .getByRole(l.value as Parameters<Page["getByRole"]>[0], l.locName ? { name: l.locName, exact: true } : {})
        .count();
    } catch { /* unknown role or bad name: treat as unusable */ }
    if (n !== 1) bad.add(k);
  }
  if (!bad.size) return { tree, locators, checked: seen.size, replaced: 0, removed: 0 };

  const badCtl = new Set(roleRows.filter((l) => bad.has(key(l.value, l.locName ?? ""))).map((l) => l.ctl));
  const kept = locators.filter((l) => !(l.by === "role" && bad.has(key(l.value, l.locName ?? ""))));
  // Best remaining locator for each control whose role locator failed.
  const fallback = new Map<string, AltLocator>();
  for (const l of kept) {
    if (!badCtl.has(l.ctl)) continue;
    const role = locators.find((x) => x.ctl === l.ctl && x.by === "role");
    if (!role) continue;
    const k = key(role.value, role.locName ?? "");
    const cur = fallback.get(k);
    if (!cur || (l.score ?? 0) > (cur.score ?? 0)) fallback.set(k, l);
  }

  let replaced = 0;
  let removed = 0;
  const out: string[] = [];
  for (const line of tree.split("\n")) {
    const m = /^(\s*)- \{by: role,/.exec(line);
    if (m) {
      const loc = parseLocator(line.trim());
      if (loc && bad.has(key(loc.value, loc.name ?? ""))) {
        const fb = fallback.get(key(loc.value, loc.name ?? ""));
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
