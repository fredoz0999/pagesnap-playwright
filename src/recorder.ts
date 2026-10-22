/**
 * Records what happens between two captures so `pack verify` can replay the
 * flow and check every step in the state it was captured in (cart filled,
 * signed in, wizard step 3), not just pages reachable by URL.
 *
 * Output per capture: NN_<host>.actions.json = the actions since the previous
 * capture. Session-level replay.json holds variable rules (fresh values, secrets).
 */
import fs from "node:fs";
import path from "node:path";
import type { BrowserContext, Page } from "playwright";
import { loadInjected } from "./eval-scripts.js";

export interface TargetDesc {
  tag: string;
  testid?: string;
  testidAttr?: string;
  id?: string;
  name?: string;
  role?: string;
  accName?: string;
  type?: string;
  css?: string;
}

export type RecordedAction =
  | { type: "nav"; url: string }
  | { type: "click"; target: TargetDesc }
  | { type: "fill"; target: TargetDesc; value: string; secretHash?: string; shape?: string }
  | { type: "select"; target: TargetDesc; value: string[]; label: string[]; index: number[] }
  | { type: "press"; key: string; target: TargetDesc };

export interface VarRule {
  /** value as captured; occurrences in recorded fills become {{name}} */
  value: string;
  /**
   * Template for a new value on every replay ({ts} = base36 time), for data that
   * must be unique (sign-up email, username). Omit to replay the captured value.
   */
  fresh?: string;
  /** never written to disk; replay reads it from --vars or PAGESNAP_VAR_<NAME> */
  secret?: boolean;
}

export const REPLAY_FILE = "replay.json";

/** Same FNV-1a as recorder.js: matches a typed password to a declared secret without storing either. */
export function secretHash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16) + ":" + str.length;
}

export function actionsFileName(yamlFile: string): string {
  return yamlFile.replace(/\.ya?ml$/i, ".actions.json");
}

function sameTarget(a: TargetDesc, b: TargetDesc): boolean {
  return a.tag === b.tag && a.testid === b.testid && a.id === b.id && a.name === b.name && a.css === b.css;
}

export class ActionRecorder {
  private buf: RecordedAction[] = [];
  private lastUserAction = 0;
  private vars: Record<string, VarRule> = {};
  private attached = new WeakSet<object>();

  /** Install on a context (manual capture) or a page (scripted). Safe to call twice. */
  async attach(target: BrowserContext | Page): Promise<void> {
    if (this.attached.has(target)) return;
    this.attached.add(target);
    const js = loadInjected("recorder.js");
    await target.exposeBinding("__psRecord", (_src, a: RecordedAction) => this.push(a));
    await target.addInitScript({ content: js });
    const pages = "pages" in target ? target.pages() : [target];
    for (const p of pages) {
      this.watchNavigation(p);
      await p.evaluate(js).catch(() => undefined); // already-loaded page
      // a page already open (--connect, or record() after goto) needs its URL as the first step
      const url = p.url();
      if (/^https?:/.test(url) && !this.buf.some((a) => a.type === "nav")) this.buf.push({ type: "nav", url });
    }
    if ("pages" in target) target.on("page", (p) => this.watchNavigation(p));
  }

  /** Declare values to parameterise (see VarRule). */
  setVars(vars: Record<string, VarRule>): void {
    this.vars = { ...this.vars, ...vars };
  }

  private watchNavigation(page: Page): void {
    page.on("framenavigated", (frame) => {
      if (frame !== page.mainFrame()) return;
      const url = frame.url();
      if (!/^https?:|^file:/.test(url)) return;
      // A navigation right after a click / Enter is that action's result, not a step.
      if (Date.now() - this.lastUserAction < 2500) return;
      const last = this.buf[this.buf.length - 1];
      if (last && last.type === "nav") { last.url = url; return; }
      this.buf.push({ type: "nav", url });
    });
  }

  private push(a: RecordedAction): void {
    if (a.type === "click" || a.type === "press" || a.type === "select") this.lastUserAction = Date.now();
    const last = this.buf[this.buf.length - 1];
    // keystrokes into one field collapse to its final value
    if (a.type === "fill" && last && last.type === "fill" && sameTarget(last.target, a.target)) {
      last.value = a.value;
      last.secretHash = a.secretHash;
      last.shape = a.shape;
      return;
    }
    this.buf.push(a);
  }

  /** Redact typed emails (matches the YAML redaction) unless the capture runs with --no-redact. */
  redactEmails = true;

  /** Actions since the last take(), with declared values replaced by {{name}}. */
  take(): RecordedAction[] {
    const out = this.buf;
    this.buf = [];
    const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const subst = (v: string) => {
      let r = v;
      for (const [name, rule] of Object.entries(this.vars)) {
        if (rule.value && r.includes(rule.value)) r = r.split(rule.value).join("{{" + name + "}}");
      }
      // an undeclared email is personal data: keep it out, replay gets a fresh one
      if (this.redactEmails) r = r.replace(EMAIL, (m) => (/^\{\{.*\}\}$/.test(m) ? m : "{{email:fresh}}"));
      return r;
    };
    // query strings and fragments carry tokens (OAuth code=, #access_token); a replay
    // re-enters the app from the path, which is what the capture did too
    const stripUrl = (u: string) => {
      try { const x = new URL(u); x.search = ""; x.hash = x.hash && /^#!?\//.test(x.hash) ? x.hash : ""; return x.toString(); } catch { return u.split(/[?#]/)[0]; }
    };
    const secrets = Object.entries(this.vars).filter(([, r]) => r.secret);
    return out.map((a) => {
      if (a.type === "nav") return { ...a, url: stripUrl(subst(a.url)) };
      if (a.type !== "fill") return a;
      if (a.secretHash) {
        const { secretHash: h, shape, ...rest } = a;
        const hit = secrets.find(([, r]) => secretHash(r.value) === h);
        if (hit) return { ...rest, value: "{{secret:" + hit[0] + "}}" };
        // a sensitive non-password field (card, SSN, code): keep the placeholder and its shape
        if (shape !== undefined) return { ...rest, value: a.value, shape };
        // a password that is none of the declared secrets was a deliberately wrong one
        return { ...rest, value: secrets.length ? "{{wrong-secret}}" : a.value };
      }
      return { ...a, value: subst(a.value) };
    });
  }

  writeStep(sessionDir: string, yamlFile: string, actions: RecordedAction[]): void {
    fs.writeFileSync(path.join(sessionDir, actionsFileName(yamlFile)), JSON.stringify({ actions }, null, 2) + "\n", "utf8");
  }

  /** Session replay rules; secret values are never written. */
  writeReplayRules(sessionDir: string): void {
    const vars: Record<string, Omit<VarRule, "value"> & { value?: string }> = {};
    for (const [k, r] of Object.entries(this.vars)) vars[k] = r.secret ? { secret: true } : r.fresh ? { fresh: r.fresh } : { value: r.value };
    fs.writeFileSync(path.join(sessionDir, REPLAY_FILE), JSON.stringify({ vars }, null, 2) + "\n", "utf8");
  }
}
