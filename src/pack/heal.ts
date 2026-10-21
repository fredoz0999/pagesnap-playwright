/**
 * Self-heal: for locators in a spec (or page objects) that are missing or
 * ambiguous in the snapshots, or that a Playwright run reported as failing,
 * suggest the closest captured control and its verified locators.
 *
 * `--write` replaces a call in the file only when the best candidate is
 * clearly ahead (confidence >= 0.75 and a 0.15 margin over the runner-up).
 */
import fs from "node:fs";
import path from "node:path";
import { parseSnapshot, walk } from "./parse.js";
import { snapshotFiles } from "./index.js";
import { extractCalls, readSidecar, validateSpec } from "./validate.js";
import { tokenize } from "./embed.js";

export interface Candidate {
  step: number;
  role: string;
  name: string;
  by: string;
  value: string;
  locName?: string;
  attr?: string;
  code: string;
  score: number;
}

export interface HealSuggestion {
  line: number;
  call: string;
  reason: string;
  candidates: Candidate[];
  applied?: string;
}

export interface HealReport {
  suggestions: HealSuggestion[];
  written: number;
  text: string;
}

function q(s: string): string {
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

/** Spec-style code for a candidate (page.xxx). */
export function candidateCode(c: { by: string; value: string; locName?: string }): string {
  switch (c.by) {
    case "testid": return "getByTestId(" + q(c.value) + ")";
    case "id": return "locator(" + q("#" + c.value) + ")";
    case "name": return "locator(" + q('[name="' + c.value + '"]') + ")";
    case "role": return "getByRole(" + q(c.value) + (c.locName ? ", { name: " + q(c.locName) + " }" : "") + ")";
    case "label": return "getByLabel(" + q(c.value) + ")";
    case "placeholder": return "getByPlaceholder(" + q(c.value) + ")";
    case "linkText": return "getByRole(\"link\", { name: " + q(c.value) + " })";
    case "xpath": return "locator(" + q("xpath=" + c.value) + ")";
    default: return "locator(" + q(c.value) + ")";
  }
}

/** Token weights: words on many controls ("button", "add", "cart") count less. */
type Idf = (t: string) => number;

function makeIdf(docs: string[][]): Idf {
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) || 0) + 1);
  const n = Math.max(1, docs.length);
  return (t) => Math.log(1 + n / (1 + (df.get(t) || 0)));
}

function sim(a: string, b: string, idf: Idf): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 0;
  const w = (set: Set<string>) => [...set].reduce((x, t) => x + idf(t), 0);
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += idf(t);
  const wa = w(ta), wb = w(tb);
  const jacc = inter / (wa + wb - inter);
  // overlap: "checkout-button" -> "checkout" keeps its full meaning
  const overlap = inter / Math.min(wa, wb);
  const tokenScore = 0.6 * overlap + 0.4 * jacc;
  // character bigrams catch spelling changes (user_name -> username, loginBtn -> login-button)
  const grams = (x: string) => {
    const y = x.toLowerCase().replace(/[^a-z0-9]/g, "");
    const g = new Set<string>();
    for (let i = 0; i + 2 <= y.length; i++) g.add(y.slice(i, i + 2));
    return g;
  };
  const ga = grams(a), gb = grams(b);
  let gi = 0;
  for (const g of ga) if (gb.has(g)) gi++;
  const dice = ga.size + gb.size ? (2 * gi) / (ga.size + gb.size) : 0;
  // Bigrams are a fallback for respellings; once words match, shared suffixes
  // like "-button" must not lift unrelated controls.
  return tokenScore > 0 ? Math.max(tokenScore, dice * 0.6) : dice * 0.9;
}

/** Text the caller was looking for: the arg plus any role name option. */
function wantedText(call: string): { text: string; role?: string } {
  const role = /getByRole\(\s*['"`](\w+)['"`]/.exec(call)?.[1];
  const name = /name\s*:\s*['"`]([^'"`]+)['"`]/.exec(call)?.[1];
  const arg = /\(\s*['"`]([^'"`]+)['"`]/.exec(call)?.[1] || "";
  const text = role ? name || role : arg.replace(/^xpath=/, "").replace(/^[#.]/, "").replace(/\[name=["']?([^"'\]]+)["']?\]/, "$1");
  return { text, role };
}

interface Pool { ctl: string; step: number; role: string; name: string; by: string; value: string; locName?: string; attr?: string; uScore: number }

function poolFor(sessionDir: string): Pool[] {
  const out: Pool[] = [];
  for (const f of snapshotFiles(sessionDir)) {
    const snap = parseSnapshot(fs.readFileSync(path.join(sessionDir, f), "utf8"), f);
    const side = readSidecar(sessionDir, f);
    if (side) {
      side.forEach((l, i) => out.push({ ctl: String(l.ctl ?? "r" + i), step: snap.step, role: l.role || "", name: l.name || "", by: l.by, value: l.value, locName: l.locName, attr: l.attr, uScore: l.score ?? 60 }));
      continue;
    }
    let nodeNo = 0;
    walk(snap.roots, (n) => {
      nodeNo++;
      for (const l of n.locators) {
        if (l.matches != null) continue;
        out.push({ ctl: "n" + nodeNo, step: snap.step, role: n.role, name: n.name, by: l.by, value: l.value, locName: l.name, attr: l.attr, uScore: l.score ?? 60 });
      }
    });
  }
  return out;
}

export function rankCandidates(sessionDir: string, call: string, max = 3): Candidate[] {
  const want = wantedText(call);
  if (!want.text) return [];
  const pool = poolFor(sessionDir);
  // role words ("button", "link") are on every control of that kind: include them so they weigh little
  const idf = makeIdf(pool.map((p) => tokenize(p.role + " " + p.name + " " + p.value)));
  // Score per control (role|name|step), then pick its best locator.
  // A control is (step, ctl); every sidecar row of one element shares its ctl.
  const byControl = new Map<string, { s: number; best: Pool }>();
  for (const p of pool) {
    let s = Math.max(sim(want.text, p.name, idf), sim(want.text, p.value, idf) * 0.95);
    if (want.role && p.role === want.role) s += 0.1;
    if (want.role && p.role && p.role !== want.role) s -= 0.1;
    const key = p.step + "|" + p.ctl;
    const cur = byControl.get(key);
    if (!cur) byControl.set(key, { s, best: p });
    else {
      cur.s = Math.max(cur.s, s);
      if (p.uScore > cur.best.uScore) cur.best = p; // most reliable locator for the control
    }
  }
  const seen = new Set<string>();
  return [...byControl.values()]
    .filter((x) => x.s >= 0.3)
    .sort((a, b) => b.s - a.s || b.best.uScore - a.best.uScore)
    .map((x) => ({ ...x.best, score: Math.min(1, x.s), code: candidateCode(x.best) }))
    .filter((c) => { const k = c.code; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, max)
    .map(({ step, role, name, by, value, locName, attr, code, score }) => ({ step, role, name, by, value, locName, attr, code, score: Math.round(score * 100) / 100 }));
}

/** Locator calls named in a Playwright failure log (`waiting for getByTestId('x')`). */
export function failingCallsFromLog(log: string): string[] {
  const out = new Set<string>();
  const re = /(?:waiting for|Locator:|locator resolved to 0 elements.*?)\s*(?:page\.)?((?:getBy\w+|locator)\((?:[^()]|\([^()]*\))*\)(?:\.(?:first|last|nth)\(\d*\))?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(log))) out.add(m[1]);
  return [...out];
}

/** Replace the call starting with `head` (through its closing paren) on one line. */
export function replaceCall(line: string, head: string, code: string): string {
  const at = line.indexOf(head);
  if (at < 0) return line;
  let depth = 0;
  let quote = "";
  for (let i = line.indexOf("(", at); i >= 0 && i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) return line.slice(0, at) + code + line.slice(i + 1);
  }
  return line;
}

export function healSpec(sessionDir: string, specPath: string, opts: { log?: string; write?: boolean } = {}): HealReport {
  const rep = validateSpec(sessionDir, specPath);
  const src = fs.readFileSync(specPath, "utf8");
  const targets: { line: number; call: string; reason: string }[] = rep.findings
    .filter((f) => f.status === "missing" || f.status === "ambiguous")
    .map((f) => ({ line: f.line, call: f.call, reason: f.status + ": " + f.detail }));
  if (opts.log) {
    const calls = extractCalls(src);
    for (const failing of failingCallsFromLog(opts.log)) {
      const norm = failing.replace(/\s+/g, "").replace(/'/g, '"');
      const hit = calls.find((c) => c.call.replace(/\s+/g, "").replace(/'/g, '"').startsWith(norm.replace(/\.(first|last|nth)\(\d*\)$/, "")));
      if (hit && !targets.some((t) => t.line === hit.line)) targets.push({ line: hit.line, call: hit.call, reason: "failed in run" });
    }
  }
  let out = src;
  let written = 0;
  const suggestions: HealSuggestion[] = targets.map((t) => {
    const candidates = rankCandidates(sessionDir, t.call);
    const s: HealSuggestion = { ...t, candidates };
    const [a, b] = candidates;
    if (opts.write && a && a.score >= 0.75 && (!b || a.score - b.score >= 0.15) && !t.reason.startsWith("ambiguous")) {
      const lines = out.split("\n");
      const before = lines[t.line - 1];
      const after = replaceCall(before, t.call.replace(/^\./, ""), a.code);
      if (after !== before) {
        lines[t.line - 1] = after;
        out = lines.join("\n");
        s.applied = a.code;
        written++;
      }
    }
    return s;
  });
  if (written) fs.writeFileSync(specPath, out, "utf8");
  const text = [
    "pagesnap heal: " + path.basename(specPath),
    ...(suggestions.length ? [] : ["Nothing to heal: every locator is in the snapshots."]),
    ...suggestions.flatMap((s) => [
      "L" + s.line + "  " + s.call + "  (" + s.reason + ")" + (s.applied ? "  -> REPLACED with " + s.applied : ""),
      ...(s.candidates.length
        ? s.candidates.map((c, i) => "   " + (i + 1) + ". " + c.code + "   [" + c.role + (c.name ? ' "' + c.name + '"' : "") + ", step " + c.step + ", confidence " + c.score + "]")
        : ["   no close match in the snapshots - recapture this page"]),
    ]),
  ].join("\n") + "\n";
  return { suggestions, written, text };
}
