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
import { idSelector, parseSnapshot, walk, type Locator } from "./parse.js";
import { snapshotFiles } from "./index.js";

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

export interface VerifyReport {
  pages: VerifyPage[];
  items: VerifyItem[];
  counts: { ok: number; gone: number; ambiguous: number; error: number; state: number; data: number };
  text: string;
}

const ACTIONABLE = new Set(["button", "link", "textbox", "searchbox", "combobox", "listbox", "checkbox", "radio", "switch", "tab", "menuitem", "slider", "spinbutton"]);

/** Same mapping the page objects use, applied to a live page. */
export function toPlaywright(page: Page, l: Locator) {
  switch (l.by) {
    case "testid": return page.getByTestId(l.value);
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
}

export async function verifySession(sessionDir: string, opts: VerifyOptions = {}): Promise<VerifyReport> {
  const files = snapshotFiles(sessionDir);
  const browser = await chromium.launch(launchOptions(opts.headless !== false));
  const items: VerifyItem[] = [];
  const pages: VerifyPage[] = [];
  let testIdAttr: string | null = null;
  try {
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

    // Single-page apps render after load (and chat/analytics sockets keep the network
    // busy), so count repeatedly and keep the best pass until it stops improving.
    const countAll = async (page: Page, locs: { label: string; l: Locator }[]) => {
      const counts: number[] = [];
      for (const { l } of locs) {
        let count = -1;
        try { count = await toPlaywright(page, l).count(); } catch { /* invalid selector */ }
        counts.push(count);
      }
      return counts;
    };
    const measure = async (page: Page, url: string, locs: { label: string; l: Locator }[]) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => undefined);
      let best = await countAll(page, locs);
      let bestOk = best.filter((c) => c === 1).length;
      for (let pass = 0, still = 0; pass < (opts.settlePasses ?? 6) && bestOk < locs.length && still < 2; pass++) {
        await page.waitForTimeout(750);
        const next = await countAll(page, locs);
        const ok = next.filter((c) => c === 1).length;
        if (ok > bestOk) { best = next; bestOk = ok; still = 0; } else still++;
      }
      return { landed: page.url(), counts: best, ok: bestOk };
    };

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
      locs.forEach(({ label, l }, i) => {
        const count = best!.counts[i];
        items.push({
          step: snap.step, url: snap.url, label, locator: l, count,
          status: count === 1 ? "ok" : count === 0 ? "gone" : count > 1 ? "ambiguous" : "error",
        });
      });
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
      else if (okShare < 0.5) i.status = "state";
    }
    if (okShare < 0.5) p.skipped = "page state differs from the capture (" + Math.round(okShare * 100) + "% of page-specific locators found; wizard step, search result or empty cart) - not counted as drift";
  }
  const counts = { ok: 0, gone: 0, ambiguous: 0, error: 0, state: 0, data: 0 };
  items.forEach((i) => counts[i.status]++);
  const lines = ["pagesnap verify: " + path.basename(sessionDir)];
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
  if (counts.gone) lines.push("Gone locators: recapture the page, then `pack heal` suggests replacements.");
  return { pages, items, counts, text: lines.join("\n") + "\n" };
}
