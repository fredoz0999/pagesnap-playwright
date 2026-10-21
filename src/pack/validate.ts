/**
 * Check a generated spec's locators against the captured snapshots.
 * Pure string matching on files: costs no LLM tokens and catches invented
 * selectors before CI does.
 */
import fs from "node:fs";
import path from "node:path";
import { parseSnapshot, walk, type Snapshot } from "./parse.js";
import { snapshotFiles } from "./index.js";

export type Status = "ok" | "missing" | "ambiguous" | "unverified";

export interface Finding {
  line: number;
  call: string;
  status: Status;
  detail: string;
}

interface Inventory {
  step: number;
  testids: Map<string, number>;
  ids: Map<string, number>;
  names: Map<string, number>;
  roleNames: { role: string; name: string }[];
  labels: string[];
  placeholders: Map<string, number>;
  css: Set<string>;
  xpath: Set<string>;
  text: string[];
  testIdAttrs: Set<string>;
  /** text-entry field names (a placeholder often becomes the accessible name) */
  fieldNames: string[];
  /** true when no control carries more than one locator (default lean capture) */
  lean: boolean;
}

const LABELABLE = new Set(["textbox", "searchbox", "combobox", "checkbox", "radio", "spinbutton", "switch", "slider", "listbox"]);

const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) || 0) + 1);

export function inventoryOf(snap: Snapshot): Inventory {
  const inv: Inventory = {
    step: snap.step, testids: new Map(), ids: new Map(), names: new Map(), roleNames: [], labels: [],
    placeholders: new Map(), css: new Set(), xpath: new Set(), text: [], testIdAttrs: new Set(),
    fieldNames: [], lean: true,
  };
  walk(snap.roots, (n) => {
    inv.roleNames.push({ role: n.role, name: n.name });
    if (n.name) inv.text.push(n.name);
    for (const d of n.details) inv.text.push(d);
    if (LABELABLE.has(n.role) && n.name) inv.labels.push(n.name);
    if ((n.role === "textbox" || n.role === "searchbox" || n.role === "combobox") && n.name) inv.fieldNames.push(n.name);
    if (n.locators.length > 1) inv.lean = false;
    for (const l of n.locators) {
      if (l.matches != null) continue;
      if (l.by === "testid") { inc(inv.testids, l.value); inv.testIdAttrs.add(l.attr || "data-testid"); }
      else if (l.by === "id") inc(inv.ids, l.value);
      else if (l.by === "name") inc(inv.names, l.value);
      else if (l.by === "label") inv.labels.push(l.value);
      else if (l.by === "placeholder") inc(inv.placeholders, l.value);
      else if (l.by === "css") inv.css.add(l.value);
      else if (l.by === "xpath") inv.xpath.add(l.value);
    }
  });
  for (const t of snap.tail) inv.text.push(t);
  return inv;
}

interface Call {
  line: number;
  call: string;
  kind: string;
  arg: string;
  opts: string;
  dynamic: boolean;
  /** followed by .first() / .last() / .nth() */
  narrowed: boolean;
}

const STR = String.raw`(['"\`])((?:\\.|(?!\1).)*)\1`;
const PATTERNS: { kind: string; re: RegExp }[] = [
  { kind: "testid", re: new RegExp(String.raw`getByTestId\(\s*` + STR + String.raw`\s*\)`, "g") },
  { kind: "role", re: new RegExp(String.raw`getByRole\(\s*` + STR + String.raw`\s*(?:,\s*(\{[^)]*\}))?\s*\)`, "g") },
  { kind: "label", re: new RegExp(String.raw`getByLabel\(\s*` + STR, "g") },
  { kind: "placeholder", re: new RegExp(String.raw`getByPlaceholder\(\s*` + STR, "g") },
  { kind: "text", re: new RegExp(String.raw`getByText\(\s*` + STR, "g") },
  { kind: "locator", re: new RegExp(String.raw`\.locator\(\s*` + STR, "g") },
];

export function extractCalls(src: string): Call[] {
  const calls: Call[] = [];
  const lineAt = (i: number) => src.slice(0, i).split("\n").length;
  for (const { kind, re } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const arg = m[2].replace(/\\(.)/g, "$1");
      calls.push({
        line: lineAt(m.index), call: m[0].replace(/\s+/g, " "), kind, arg, opts: m[3] || "",
        dynamic: m[1] === "`" && arg.includes("${"),
        narrowed: /^\s*\.(first|last|nth)\(/.test(src.slice(m.index + m[0].length, m.index + m[0].length + 40)),
      });
    }
  }
  return calls.sort((a, b) => a.line - b.line);
}

function roleName(opts: string): { name?: string; regex?: RegExp; exact: boolean } {
  const exact = /exact\s*:\s*true/.test(opts);
  const s = /name\s*:\s*(['"`])((?:\\.|(?!\1).)*)\1/.exec(opts);
  if (s) return { name: s[2].replace(/\\(.)/g, "$1"), exact };
  const r = /name\s*:\s*\/((?:\\.|[^/])+)\/([a-z]*)/.exec(opts);
  if (r) {
    try { return { regex: new RegExp(r[1], r[2]), exact }; } catch { /* fallthrough */ }
  }
  return { exact };
}

function nameMatches(actual: string, want: { name?: string; regex?: RegExp; exact: boolean }): boolean {
  if (want.regex) return want.regex.test(actual);
  if (want.name == null) return true;
  return want.exact ? actual === want.name : actual.toLowerCase().includes(want.name.toLowerCase());
}

function check(call: Call, invs: Inventory[]): Finding {
  const f = (status: Status, detail: string): Finding => ({ line: call.line, call: call.call, status, detail });
  // Lean captures keep only the best locator per control, so an id / name /
  // placeholder that exists in the DOM may simply not have been recorded.
  const lean = invs.every((i) => i.lean);
  const notKept = (what: string) =>
    lean ? f("unverified", what + " not recorded (lean capture keeps one locator per control) - prefer the snapshot locator or recapture with --full")
      : f("missing", what + " not in any snapshot");
  if (call.dynamic) return f("unverified", "template string with ${} - checked at runtime only");
  const steps = (pred: (inv: Inventory) => number) => {
    const counts = invs.map((inv) => ({ step: inv.step, n: pred(inv) })).filter((x) => x.n > 0);
    if (!counts.length) return null;
    const unique = counts.filter((x) => x.n === 1).map((x) => x.step);
    if (unique.length) return f("ok", "steps " + unique.join(","));
    if (call.narrowed) return f("ok", "steps " + counts.map((x) => x.step).join(",") + " (" + counts[0].n + " matches, narrowed by .first/.last/.nth - prefer a unique locator)");
    return f("ambiguous", counts.map((x) => "step " + x.step + ": " + x.n + " matches").join("; ") + " - scope it to a container or use a more specific locator");
  };
  switch (call.kind) {
    case "testid":
      return steps((i) => i.testids.get(call.arg) || 0) || f("missing", "no testid '" + call.arg + "' in any snapshot");
    case "role": {
      const want = roleName(call.opts);
      if (!want.name && !want.regex) {
        return steps((i) => i.roleNames.filter((r) => r.role === call.arg).length) || f("missing", "no " + call.arg + " role in any snapshot");
      }
      return (
        steps((i) => i.roleNames.filter((r) => r.role === call.arg && r.name && nameMatches(r.name, want)).length)
        || f("missing", "no " + call.arg + " named " + (want.name ?? String(want.regex)) + " in any snapshot")
      );
    }
    case "label": {
      const want = { name: call.arg, exact: false };
      return steps((i) => new Set(i.labels.filter((l) => nameMatches(l, want))).size) || f("missing", "no field labelled '" + call.arg + "'");
    }
    case "placeholder":
      return steps((i) => i.placeholders.get(call.arg) || 0)
        || steps((i) => i.fieldNames.filter((n) => n === call.arg).length)
        || notKept("placeholder '" + call.arg + "'");
    case "text": {
      const hit = invs.filter((i) => i.text.some((t) => t.toLowerCase().includes(call.arg.toLowerCase()))).map((i) => i.step);
      return hit.length ? f("ok", "text seen in steps " + hit.join(",")) : f("missing", "text '" + call.arg + "' not in any snapshot (may be dynamic)");
    }
    case "locator": {
      const a = call.arg.trim();
      const idm = /^#([\w-]+)$/.exec(a);
      if (idm) return steps((i) => i.ids.get(idm[1]) || 0) || notKept("id '" + idm[1] + "'");
      const nm = /^(?:[a-z]+)?\[name=["']?([^"'\]]+)["']?\]$/.exec(a);
      if (nm) return steps((i) => i.names.get(nm[1]) || 0) || notKept("name='" + nm[1] + "'");
      const tm = /^\[(data-[\w-]+)=["']?([^"'\]]+)["']?\]$/.exec(a);
      if (tm) return steps((i) => (i.testIdAttrs.has(tm[1]) ? i.testids.get(tm[2]) || 0 : 0)) || f("unverified", tm[1] + "='" + tm[2] + "' not a captured testid");
      if (a.startsWith("xpath=") || a.startsWith("//")) {
        const x = a.replace(/^xpath=/, "");
        return invs.some((i) => i.xpath.has(x)) ? f("ok", "xpath from snapshot") : f("unverified", "xpath not from snapshot - fragile");
      }
      return invs.some((i) => i.css.has(a)) ? f("ok", "css from snapshot") : f("unverified", "css not from snapshot - verify by running");
    }
  }
  return f("unverified", "unsupported call");
}

export interface ValidateReport {
  findings: Finding[];
  counts: Record<Status, number>;
  testIdAttrs: string[];
  text: string;
}

export function validateSpec(sessionDir: string, specPath: string): ValidateReport {
  const invs = snapshotFiles(sessionDir).map((f) => inventoryOf(parseSnapshot(fs.readFileSync(path.join(sessionDir, f), "utf8"), f)));
  const src = fs.readFileSync(specPath, "utf8");
  const findings = extractCalls(src).map((c) => check(c, invs));
  const counts: Record<Status, number> = { ok: 0, missing: 0, ambiguous: 0, unverified: 0 };
  findings.forEach((x) => counts[x.status]++);
  const attrs = [...new Set(invs.flatMap((i) => [...i.testIdAttrs]))];
  const icon: Record<Status, string> = { ok: "OK  ", missing: "MISS", ambiguous: "AMBG", unverified: "????" };
  const lines = [
    "pagesnap validate: " + path.basename(specPath) + " vs " + invs.length + " snapshot(s)",
    ...findings.map((x) => icon[x.status] + " L" + x.line + "  " + x.call + "  - " + x.detail),
    "",
    "ok " + counts.ok + " | missing " + counts.missing + " | ambiguous " + counts.ambiguous + " | unverified " + counts.unverified,
  ];
  if (attrs.some((a) => a !== "data-testid") && findings.some((f) => f.call.includes("getByTestId"))) {
    lines.push("note: snapshots use " + attrs.join(", ") + " - set use.testIdAttribute in playwright.config so getByTestId resolves.");
  }
  return { findings, counts, testIdAttrs: attrs, text: lines.join("\n") + "\n" };
}
