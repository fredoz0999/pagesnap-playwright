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
import { chromium, selectors, type Browser, type Page } from "playwright";
import { launchOptions } from "../browser-session.js";
import { idSelector, parseSnapshot, walk, type Locator } from "./parse.js";
import { snapshotFiles } from "./index.js";
import { describeAction, hasRecording, makeExpander, MissingVarError, performAction, readActions } from "./replay.js";

export interface VerifyItem {
  step: number;
  url: string;
  label: string;
  locator: Locator;
  count: number;
  /** state: the page as a whole no longer matches the capture (logged in/out, a POST result page) */
  /** data: named by data (account number, price) or located by list position: expected to change */
  status: "ok" | "gone" | "ambiguous" | "error" | "state" | "data";
}

export interface VerifyPage {
  step: number;
  url: string;
  landedOn: string;
  skipped?: string;
  /** which browser context gave the result (with storage / fresh session) */
  context?: string;
}

export interface ReplayBlock {
  step: number;
  action: number;
  what: string;
  error: string;
}

export interface VerifyReport {
  mode: "replay" | "url";
  blocked?: ReplayBlock;
  pages: VerifyPage[];
  items: VerifyItem[];
  counts: { ok: number; gone: number; ambiguous: number; error: number; state: number; data: number };
  text: string;
}

const ACTIONABLE = new Set(["button", "link", "textbox", "searchbox", "combobox", "listbox", "checkbox", "radio", "switch", "tab", "menuitem", "slider", "spinbutton"]);

/** Same mapping the page objects use, applied to a live page. */
export function toPlaywright(page: Page, l: Locator) {
  switch (l.by) {
    case "testid":
      // explicit attribute: independent of the process-wide testIdAttribute setting
      return l.attr && l.attr !== "data-testid" ? page.locator(`[${l.attr}="${l.value.replace(/"/g, '\\"')}"]`) : page.getByTestId(l.value);
    case "id": return page.locator(idSelector(l.value));
    case "name": return page.locator('[name="' + l.value.replace(/"/g, '\\"') + '"]');
    case "role": return page.getByRole(l.value as Parameters<Page["getByRole"]>[0], l.name ? { name: l.name, exact: true } : {});
    case "label": return page.getByLabel(l.value, { exact: true });
    case "placeholder": return page.getByPlaceholder(l.value, { exact: true });
    case "linkText": return page.getByRole("link", { name: l.value, exact: true });
    case "xpath": return page.locator("xpath=" + l.value);
    default: return page.locator(l.value);
  }
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
  /** extra counting passes (750 ms apart) while the page is still rendering (default 6) */
  settlePasses?: number;
  /**
   * "replay" (default when the capture recorded actions): one browser replays the
   * recorded flow and checks each step in its captured state. "url": open each URL.
   */
  mode?: "replay" | "url";
  /** values for {{var}} / {{secret:key}} placeholders in recorded actions */
  vars?: Record<string, string>;
}

type Loc = { label: string; l: Locator };

function locsOf(snap: ReturnType<typeof parseSnapshot>): { locs: Loc[]; testIdAttr: string | null } {
  const locs: Loc[] = [];
  let testIdAttr: string | null = null;
  walk(snap.roots, (n) => {
    const l = n.locators.find((x) => x.matches == null);
    if (!l) return;
    // controls, plus anything with a test id (totals, badges, messages tests assert on)
    if (!ACTIONABLE.has(n.role) && l.by !== "testid") return;
    if (l.by === "testid" && l.attr && l.attr !== "data-testid") testIdAttr = l.attr;
    locs.push({ label: n.role + (n.name ? ' "' + n.name + '"' : ""), l });
  });
  return { locs, testIdAttr };
}

async function countAll(page: Page, locs: Loc[]): Promise<number[]> {
  const counts: number[] = [];
  for (const { l } of locs) {
    let count = -1;
    // visible only: the capture records visible elements, and a hidden copy (an inactive
    // wizard step still in the DOM) is not the state the step was captured in
    try { count = await toPlaywright(page, l).filter({ visible: true }).count(); } catch { /* invalid selector */ }
    counts.push(count);
  }
  return counts;
}

/** Count on the current page; SPAs render late, so repeat until the result stops improving. */
async function measureHere(page: Page, locs: Loc[], settlePasses: number) {
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => undefined);
  let best = await countAll(page, locs);
  let bestOk = best.filter((c) => c === 1).length;
  for (let pass = 0, still = 0; pass < settlePasses && bestOk < locs.length && still < 2; pass++) {
    await page.waitForTimeout(750);
    const next = await countAll(page, locs);
    const ok = next.filter((c) => c === 1).length;
    if (ok > bestOk) { best = next; bestOk = ok; still = 0; } else still++;
  }
  return { landed: page.url(), counts: best, ok: bestOk };
}

function pushItems(items: VerifyItem[], snap: { step: number; url: string }, locs: Loc[], counts: number[]): void {
  locs.forEach(({ label, l }, i) => {
    const count = counts[i];
    items.push({
      step: snap.step, url: snap.url, label, locator: l, count,
      status: count === 1 ? "ok" : count === 0 ? "gone" : count > 1 ? "ambiguous" : "error",
    });
  });
}

/** Replay the recorded flow in one browser; check each step right after its actions. */
async function collectByReplay(sessionDir: string, files: string[], opts: VerifyOptions, browser: Browser) {
  const items: VerifyItem[] = [];
  const pages: VerifyPage[] = [];
  let blocked: ReplayBlock | undefined;
  const expand = makeExpander(sessionDir, opts.vars);
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    storageState: opts.storage && fs.existsSync(opts.storage) ? opts.storage : undefined,
  });
  const page = await context.newPage();
  const timeout = opts.timeoutMs ?? 15000;
  page.setDefaultTimeout(timeout);
  for (let fi = 0; fi < files.length; fi++) {
    const f = files[fi];
    const snap = parseSnapshot(fs.readFileSync(path.join(sessionDir, f), "utf8"), f);
    if (blocked) {
      pages.push({ step: snap.step, url: snap.url, landedOn: "", skipped: "not reached: replay stopped at step " + blocked.step });
      continue;
    }
    const actions = readActions(sessionDir, f) ?? [];
    if (fi === 0 && actions[0]?.type !== "nav") await page.goto(snap.url, { waitUntil: "domcontentloaded" });
    for (let ai = 0; ai < actions.length; ai++) {
      try {
        await performAction(page, actions[ai], expand, timeout);
      } catch (e) {
        if (e instanceof MissingVarError) throw e;
        blocked = { step: snap.step, action: ai + 1, what: describeAction(actions[ai]), error: e instanceof Error ? e.message.split("\n")[0] : String(e) };
        break;
      }
    }
    if (blocked) {
      pages.push({ step: snap.step, url: snap.url, landedOn: page.url(), skipped: "replay stopped before this step" });
      continue;
    }
    // A step reached without recorded actions (capture started mid-flow): fall back to its URL.
    if (!actions.length && fi > 0 && !samePath(page.url(), snap.url)) await page.goto(snap.url, { waitUntil: "domcontentloaded" });
    const { locs, testIdAttr } = locsOf(snap);
    if (testIdAttr) selectors.setTestIdAttribute(testIdAttr);
    if (opts.steps && !opts.steps.includes(snap.step)) continue; // still replayed, not reported
    const r = await measureHere(page, locs, opts.settlePasses ?? 6);
    pages.push({ step: snap.step, url: snap.url, landedOn: r.landed, context: "replay" });
    pushItems(items, snap, locs, r.counts);
    // Most of the step missing means the replay went somewhere else (wrong secret,
    // validation error, changed flow): later steps would only report noise.
    if (locs.length >= 2 && r.ok / locs.length < 0.5) {
      blocked = {
        step: snap.step, action: actions.length, what: "check after the step's actions",
        error: "page does not match the capture (" + r.ok + "/" + locs.length + " locators found): the replay diverged here",
      };
    }
  }
  return { items, pages, blocked };
}

/** Open each captured URL (pages reachable without app state). */
async function collectByUrl(sessionDir: string, files: string[], opts: VerifyOptions, browser: Browser) {
  const items: VerifyItem[] = [];
  const pages: VerifyPage[] = [];
  let testIdAttr: string | null = null;
  const hasStorage = !!(opts.storage && fs.existsSync(opts.storage));
  const contexts: { label: string; page: Page }[] = [];
  const open = async (storage?: string) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: storage });
    const page = await context.newPage();
    page.setDefaultTimeout(opts.timeoutMs ?? 15000);
    return page;
  };
  contexts.push({ label: hasStorage ? "with storage" : "fresh", page: await open(hasStorage ? opts.storage : undefined) });
  // With --storage, pages captured logged out (login form, register) are retried
  // in a fresh context; the better of the two results is kept.
  let fresh: Page | null = null;

  const measure = async (page: Page, url: string, locs: Loc[]) => {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    return measureHere(page, locs, opts.settlePasses ?? 6);
  };

  for (const f of files) {
    const snap = parseSnapshot(fs.readFileSync(path.join(sessionDir, f), "utf8"), f);
    if (opts.steps && !opts.steps.includes(snap.step)) continue;
    const got = locsOf(snap);
    const locs = got.locs;
    testIdAttr = got.testIdAttr ?? testIdAttr;
    if (testIdAttr) selectors.setTestIdAttribute(testIdAttr);
    let best: { landed: string; counts: number[]; ok: number; label: string } | null = null;
    let navError = "";
    for (const attempt of [0, 1]) {
      if (attempt === 1) {
        if (!hasStorage || (best && best.ok === locs.length)) break;
        fresh = fresh || (await open(undefined));
      }
      const page = attempt === 0 ? contexts[0].page : fresh!;
      try {
        const r = await measure(page, snap.url, locs);
        if (!samePath(r.landed, snap.url)) { if (!best) navError = "redirected to " + r.landed; continue; }
        if (!best || r.ok > best.ok) best = { ...r, label: attempt === 0 ? contexts[0].label : "fresh session" };
      } catch (e) {
        if (!best) navError = "navigation failed: " + (e instanceof Error ? e.message.split("\n")[0] : String(e));
      }
    }
    if (!best) {
      pages.push({ step: snap.step, url: snap.url, landedOn: "", skipped: navError + (hasStorage ? "" : " (needs --storage or app state)") });
      continue;
    }
    pages.push({ step: snap.step, url: snap.url, landedOn: best.landed, context: best.label });
    pushItems(items, snap, locs, best.counts);
  }
  return { items, pages };
}

export async function verifySession(sessionDir: string, opts: VerifyOptions = {}): Promise<VerifyReport> {
  const files = snapshotFiles(sessionDir);
  const mode: "replay" | "url" = opts.mode ?? (hasRecording(sessionDir, files) ? "replay" : "url");
  const browser = await chromium.launch(launchOptions(opts.headless !== false));
  let items: VerifyItem[] = [];
  let pages: VerifyPage[] = [];
  let blocked: ReplayBlock | undefined;
  try {
    if (mode === "replay") {
      ({ items, pages, blocked } = await collectByReplay(sessionDir, files, opts, browser));
    } else {
      ({ items, pages } = await collectByUrl(sessionDir, files, opts, browser));
    }
  } finally {
    await browser.close();
  }
  // A page where most locators are gone was captured in another state (logged out,
  // POST result); that is not locator drift. Data-named controls are expected to change.
  // Site chrome (nav, footer: on half the steps or more) is present in any state, so it
  // says nothing about whether this page is in the captured state; judge by the rest.
  const lkey = (i: VerifyItem) => i.locator.by + "|" + i.locator.value + "|" + (i.locator.name ?? "");
  const freq = new Map<string, number>();
  for (const i of items) freq.set(lkey(i), (freq.get(lkey(i)) || 0) + 1);
  const chromeMin = Math.max(2, Math.ceil(pages.filter((p) => !p.skipped).length / 2));
  for (const p of pages) {
    const mine = items.filter((i) => i.step === p.step);
    if (!mine.length) continue;
    const content = mine.filter((i) => (freq.get(lkey(i)) || 0) < chromeMin);
    const basis = content.length ? content : mine;
    const okShare = basis.filter((i) => i.status === "ok").length / basis.length;
    for (const i of mine) {
      if (i.status !== "gone") continue;
      const nameMatch = /"([^"]*)"/.exec(i.label);
      const positional = i.locator.by === "css" && /nth-child/.test(i.locator.value);
      if (nameMatch && (!/[a-z]{2}/i.test(nameMatch[1]) || /[$€£¥]\s?\d/.test(nameMatch[1]))) i.status = "data";
      else if (positional) i.status = "data"; // nth-child path inside a result list: position changes with the data
      else if (okShare < 0.5 && mode === "url") i.status = "state";
    }
    if (okShare < 0.5 && mode === "url") p.skipped = "page state differs from the capture (" + Math.round(okShare * 100) + "% of page-specific locators found; wizard step, search result or empty cart) - not counted as drift";
  }
  const counts = { ok: 0, gone: 0, ambiguous: 0, error: 0, state: 0, data: 0 };
  items.forEach((i) => counts[i.status]++);
  const lines = ["pagesnap verify: " + path.basename(sessionDir) + (mode === "replay" ? " (replaying the recorded flow)" : " (opening each URL)")];
  for (const p of pages) {
    const mine = items.filter((i) => i.step === p.step);
    lines.push("step " + p.step + " " + p.url + (p.skipped ? "  SKIPPED: " + p.skipped + (p.landedOn ? " -> " + p.landedOn : "")
      : "  " + mine.filter((i) => i.status === "ok").length + "/" + mine.length + " ok" + (p.context === "fresh session" ? " (fresh session)" : "")));
    for (const i of mine.filter((x) => x.status !== "ok" && x.status !== "state")) {
      lines.push("  " + i.status.toUpperCase() + " " + i.label + "  " + i.locator.by + "=" + i.locator.value + (i.count > 1 ? " (" + i.count + " matches)" : ""));
    }
  }
  lines.push("", "ok " + counts.ok + " | gone " + counts.gone + " | ambiguous " + counts.ambiguous + " | error " + counts.error
    + " | data (expected to change) " + counts.data + " | other page state " + counts.state);
  if (blocked) {
    lines.push("REPLAY STOPPED at step " + blocked.step + ", action " + blocked.action + ": " + blocked.what);
    lines.push("  " + blocked.error);
    lines.push("  The app changed under that action (or it needs data that differs per run); recapture from that step.");
  }
  if (counts.gone) lines.push("Gone locators: recapture the page, then `pack heal` suggests replacements.");
  if (mode === "url" && pages.some((p) => p.skipped)) lines.push("Steps in another state were skipped; capture with action recording to verify them by replay.");
  return { mode, blocked, pages, items, counts, text: lines.join("\n") + "\n" };
}
