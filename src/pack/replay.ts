/**
 * Replay recorded actions (NN_<host>.actions.json) in a live browser.
 * Used by `pack verify` to reach every captured state, and usable on its own.
 */
import fs from "node:fs";
import path from "node:path";
import type { Locator as PwLocator, Page } from "playwright";
import { idSelector } from "./parse.js";
import { actionsFileName, REPLAY_FILE, type RecordedAction, type TargetDesc, type VarRule } from "../recorder.js";

export class MissingVarError extends Error {}

export function readActions(sessionDir: string, yamlFile: string): RecordedAction[] | null {
  const p = path.join(sessionDir, actionsFileName(yamlFile));
  if (!fs.existsSync(p)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8")) as { actions?: RecordedAction[] };
    return Array.isArray(j.actions) ? j.actions : [];
  } catch {
    return null;
  }
}

export function hasRecording(sessionDir: string, yamlFiles: string[]): boolean {
  return yamlFiles.some((f) => readActions(sessionDir, f) !== null);
}

/**
 * Values for {{name}} / {{secret:key}} placeholders. Lookup order: --vars file,
 * PAGESNAP_VAR_<NAME> env, then replay.json (fresh template or captured value).
 */
export function makeExpander(sessionDir: string, given: Record<string, string> = {}): (s: string) => string {
  let rules: Record<string, Partial<VarRule>> = {};
  const rp = path.join(sessionDir, REPLAY_FILE);
  if (fs.existsSync(rp)) {
    try { rules = (JSON.parse(fs.readFileSync(rp, "utf8")) as { vars?: Record<string, Partial<VarRule>> }).vars || {}; } catch { /* none */ }
  }
  const run = Date.now().toString(36);
  const cache = new Map<string, string>();
  const env = (k: string) => process.env["PAGESNAP_VAR_" + k.toUpperCase().replace(/[^A-Z0-9]+/g, "_")];
  const lookup = (name: string, secret: boolean): string => {
    if (cache.has(name)) return cache.get(name)!;
    let v: string | undefined = given[name] ?? env(name);
    const r = rules[name];
    if (v == null && r?.fresh) v = r.fresh.replace(/\{ts\}/g, run);
    if (v == null && r?.value != null && !r.secret) v = r.value;
    if (v == null && secret) v = given.password ?? env("password");
    if (v == null) {
      throw new MissingVarError("replay needs a value for {{" + (secret ? "secret:" : "") + name + "}}: pass --vars=<file.json> or set PAGESNAP_VAR_" + name.toUpperCase().replace(/[^A-Z0-9]+/g, "_"));
    }
    cache.set(name, v);
    return v;
  };
  return (s: string) => s
    .replace(/\{\{wrong-secret\}\}/g, "pagesnap-wrong-" + run) // the capture typed a wrong password on purpose
    .replace(/\{\{(secret:)?([^}]+)\}\}/g, (_m, sec: string | undefined, name: string) => lookup(name, !!sec));
}

function candidates(page: Page, t: TargetDesc): { how: string; loc: PwLocator }[] {
  const out: { how: string; loc: PwLocator }[] = [];
  const q = (v: string) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  if (t.testid) out.push({ how: "testid", loc: page.locator(`[${t.testidAttr || "data-testid"}="${q(t.testid)}"]`) });
  if (t.id) out.push({ how: "id", loc: page.locator(idSelector(t.id)) });
  if (t.name) out.push({ how: "name", loc: page.locator(`${t.tag}[name="${q(t.name)}"]`) });
  if (t.role && t.accName) {
    out.push({ how: "role", loc: page.getByRole(t.role as Parameters<Page["getByRole"]>[0], { name: t.accName, exact: true }) });
  }
  if (t.css) out.push({ how: "css", loc: page.locator(t.css) });
  return out;
}

/** The element an action meant: first candidate matching exactly one element, waiting for SPAs to render. */
export async function resolveTarget(page: Page, t: TargetDesc, timeoutMs = 15000): Promise<{ loc: PwLocator; how: string }> {
  const cands = candidates(page, t);
  if (!cands.length) throw new Error("no way to locate " + JSON.stringify(t));
  const end = Date.now() + timeoutMs;
  let fallback: { loc: PwLocator; how: string } | null = null;
  for (;;) {
    for (const c of cands) {
      // users act on visible elements; a hidden copy (inactive wizard step) is not a match
      const vis = c.loc.filter({ visible: true });
      const n = await vis.count().catch(() => 0);
      if (n === 1) return { loc: vis, how: c.how };
      if (n > 1 && !fallback) fallback = { loc: vis.first(), how: c.how + " (first of " + n + ")" };
    }
    if (fallback) return fallback;
    if (Date.now() > end) throw new Error("element not found: " + describeTarget(t));
    await page.waitForTimeout(250);
  }
}

export function describeTarget(t: TargetDesc): string {
  if (t.testid) return "testid=" + t.testid;
  if (t.id) return "#" + t.id;
  if (t.name) return t.tag + "[name=" + t.name + "]";
  if (t.role) return t.role + (t.accName ? ' "' + t.accName + '"' : "");
  return t.css || t.tag;
}

export function describeAction(a: RecordedAction): string {
  switch (a.type) {
    case "nav": return "goto " + a.url;
    case "click": return "click " + describeTarget(a.target);
    case "fill": return "fill " + describeTarget(a.target) + (/\{\{secret:/.test(a.value) ? " = ***" : ' = "' + a.value + '"');
    case "select": return "select " + describeTarget(a.target) + " = " + JSON.stringify(a.label);
    case "press": return "press " + a.key + " in " + describeTarget(a.target);
  }
}

export async function performAction(page: Page, a: RecordedAction, expand: (s: string) => string, timeoutMs = 15000): Promise<void> {
  if (a.type === "nav") {
    await page.goto(expand(a.url), { waitUntil: "domcontentloaded" });
    return;
  }
  const { loc } = await resolveTarget(page, a.target, timeoutMs);
  switch (a.type) {
    case "click":
      await loc.click({ timeout: timeoutMs });
      break;
    case "fill": {
      const value = expand(a.value);
      // SPAs often bind form data late (an address prefill arriving after the form
      // renders) and overwrite what was typed; a person would notice and retype.
      for (let attempt = 0; attempt < 3; attempt++) {
        await loc.fill(value, { timeout: timeoutMs });
        // Moving on after typing: forms that validate on blur keep the next button
        // disabled until then, and the following click would wait forever.
        await loc.blur().catch(() => undefined);
        await page.waitForTimeout(400);
        if ((await loc.inputValue().catch(() => value)) === value) break;
        await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => undefined);
      }
      break;
    }
    case "press":
      await loc.press(a.key, { timeout: timeoutMs });
      break;
    case "select": {
      // Values can be per-run data (account ids); fall back to the label, then the position.
      const tries: Parameters<PwLocator["selectOption"]>[0][] = [a.value, a.label.map((label) => ({ label })), a.index.map((index) => ({ index }))];
      let lastErr: unknown = null;
      for (const t of tries) {
        try {
          await loc.selectOption(t, { timeout: 3000 });
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (lastErr) throw lastErr;
      break;
    }
  }
}
