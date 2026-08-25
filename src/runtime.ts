import fs from "node:fs";
import path from "node:path";
import type { Browser, BrowserContext, Cookie, Page } from "playwright";
import { openBrowser } from "./browser-session.js";
import type { SnapshotCapture } from "./capture.js";
import {
  parseCookieJson,
  parseStorageState,
  serializeCookies,
  toPlaywrightCookies,
  originOf,
  type CookieRecord,
} from "./cookies.js";
import { evalBody, evalNamed, injectedPath, loadInjected } from "./eval-scripts.js";
import type { HintRec } from "./hints.js";
import { printUsage } from "./usage.js";
import { applySessionFolderName, sessionFolderTs } from "./session.js";
import { refreshFlow, writePromptPack, type StepRecord } from "./session-pack.js";
import { persistSnapshot } from "./snapshot-write.js";
import { isDuplicateCapture, normalizeNote } from "./util-parse.js";

interface TabState {
  visible?: boolean;
  focused?: boolean;
  capture?: boolean;
  note?: string;
  end?: boolean;
  name?: string;
  needsInject?: boolean;
}

export async function runCapture(cap: SnapshotCapture, args: string[]): Promise<void> {
  cap.loadConfigFile(path.resolve("capture.config.properties"));
  const startUrl = cap.parseArgs(args);
  cap.sessionStartUrl = startUrl;
  if (!startUrl && !cap.connectUrl) {
    printUsage();
    process.exit(1);
  }

  const chromeJs = loadInjected("snapshot-chrome.js");
  const captureTreeJs = loadInjected("capture-tree.js");
  const waitReadyJs = loadInjected("wait-ready.js");
  const pollStateJs = loadInjected("poll-state.js");

  const sessionStart = new Date();
  const sessionId = "session-" + sessionFolderTs(sessionStart, cap.timezone);
  fs.mkdirSync(cap.outputRoot, { recursive: true });
  cap.sessionDir = cap.sessionSubdir ? path.join(cap.outputRoot, sessionId) : cap.outputRoot;
  fs.mkdirSync(cap.sessionDir, { recursive: true });
  writePromptPack(cap, sessionStart);
  refreshFlow(cap, [], cap.writeDiff);

  console.log("Session: " + path.resolve(cap.sessionDir));
  console.log("walk the app, Ctrl+M to capture, Ctrl+Q to end");
  console.log("No auto-capture on navigation. Capture is manual only.");
  console.log(cap.lean ? "lean snapshot (use --full for verbose)" : "full snapshot (use --lean for compact YAML)");
  if (cap.goal) console.log("Goal: " + cap.goal);
  console.log();

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  const signals: { capture: { page: Page; note: string } | null; end: string | null } = { capture: null, end: null };
  const steps: StepRecord[] = [];
  let step = 0;
  let lastTreeBody = "";
  let lastCaptureUrl = "";
  let captureCount = 0;

  const installOnPage = async (page: Page) => {
    try {
      await page.exposeFunction("__pagesnapBridgeCapture", (note: string) => {
        signals.capture = { page, note: String(note ?? "") };
      });
    } catch { /* already */ }
    try {
      await page.exposeFunction("__pagesnapBridgeEnd", (name: string) => {
        signals.end = String(name ?? "");
      });
    } catch { /* already */ }
  };

  const injectUi = async (page: Page) => {
    try {
      await page.evaluate((pos: string) => {
        try {
          if (!sessionStorage.getItem("__ps_toolbar_pos")) {
            (window as unknown as Record<string, unknown>).__snapshotToolbarPosition = pos;
          }
        } catch {
          (window as unknown as Record<string, unknown>).__snapshotToolbarPosition = pos;
        }
      }, cap.toolbarPosition);
      await page.evaluate(chromeJs);
    } catch { /* mid-nav */ }
  };

  const readTab = async (page: Page): Promise<TabState> => {
    try {
      if (page.isClosed()) return {};
      const result = await evalBody<TabState>(page, pollStateJs);
      return result && typeof result === "object" ? result : {};
    } catch {
      return {};
    }
  };

  const toast = async (page: Page, msg: string, ok: boolean) => {
    try {
      await page.evaluate(
        ([m, o]: [string, boolean]) => {
          const w = window as unknown as { __snapshotToast?: (x: string, y: boolean) => void };
          if (w.__snapshotToast) w.__snapshotToast(m, o);
        },
        [msg, ok] as [string, boolean]
      );
    } catch { /* ignore */ }
  };

  let lastCapture: { at: number; url: string; note: string } | null = null;
  const saveFromPage = async (page: Page, note: string): Promise<boolean> => {
    note = normalizeNote(note);
    const url = page.url();
    const now = Date.now();
    if (isDuplicateCapture(lastCapture, now, url, note)) {
      console.log("  Skipped duplicate capture");
      return false;
    }
    if (!url || url === "about:blank") {
      console.log("  Skipped: about:blank");
      await toast(page, "Skipped about:blank", false);
      return false;
    }
    try {
      await evalNamed(page, ["stable", "max"], "return new Promise((callback) => { " + waitReadyJs + " });", cap.lean ? [150, 2000] : [300, 5000]);
    } catch { /* nav */ }
    try {
      await page.evaluate("if (window.__snapshotSetChromeHidden) window.__snapshotSetChromeHidden(true);");
    } catch { /* ignore */ }
    let tree = "";
    let hints: HintRec[] = [];
    let hintsTruncated = 0;
    try {
      const result = await evalNamed<{ tree?: string; hints?: HintRec[]; hintsTruncated?: number }>(
        page,
        ["opts"],
        captureTreeJs,
        [{ maxTableRows: cap.maxTableRows, redactPasswords: cap.redactPasswords, redactEmails: cap.redactEmails, lean: cap.lean, includeHints: cap.includeHints }]
      );
      if (result && typeof result === "object") {
        tree = result.tree != null ? String(result.tree) : "";
        if (Array.isArray(result.hints)) hints = result.hints.filter(Boolean) as HintRec[];
        hintsTruncated = Number(result.hintsTruncated ?? 0);
      } else if (result != null) tree = String(result);
    } finally {
      try {
        await page.evaluate("if (window.__snapshotSetChromeHidden) window.__snapshotSetChromeHidden(false);");
      } catch { /* ignore */ }
    }
    let title = "";
    let viewport: { w: number; h: number } | undefined;
    try { title = await page.title(); } catch { /* ignore */ }
    try {
      const vp = page.viewportSize();
      if (vp) viewport = { w: vp.width, h: vp.height };
      else {
        const inner = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
        if (inner && inner.w) viewport = inner;
      }
    } catch { /* ignore */ }
    step++;
    const saved = persistSnapshot(cap, steps, {
      url, note, tree, hints, hintsTruncated, lastTreeBody, lastCaptureUrl, step, title, viewport,
    });
    lastTreeBody = saved.lastTreeBody;
    lastCaptureUrl = saved.lastCaptureUrl;
    lastCapture = { at: now, url, note };
    await toast(page, "Saved snapshot #" + step, true);
    return true;
  };

  try {
    const launched = await openBrowser({
      headless: cap.headless,
      connectUrl: cap.connectUrl,
      loadStoragePath: cap.loadStoragePath && fs.existsSync(cap.loadStoragePath) && !cap.connectUrl
        ? cap.loadStoragePath
        : null,
    });
    if (cap.loadStoragePath && fs.existsSync(cap.loadStoragePath) && !cap.connectUrl) {
      console.log("Loaded storageState from " + cap.loadStoragePath);
    }
    browser = launched.browser;
    context = launched.context;
    cap.attached = launched.attached;

    await context.addInitScript((p: string) => {
      const w = window as unknown as Record<string, unknown>;
      try {
        if (!sessionStorage.getItem("__ps_toolbar_pos")) w.__snapshotToolbarPosition = p;
      } catch {
        w.__snapshotToolbarPosition = p;
      }
    }, cap.toolbarPosition);
    await context.addInitScript({ path: injectedPath("snapshot-chrome.js") });
    context.on("page", (page) => { void installOnPage(page); });

    if (cap.loadStoragePath && cap.attached) {
      try {
        const state = parseStorageState(fs.readFileSync(cap.loadStoragePath, "utf8"));
        if (state.cookies.length) await context.addCookies(state.cookies as unknown as Cookie[]);
        console.log("Applied storageState cookies from " + cap.loadStoragePath);
      } catch (e) {
        console.error("storageState apply failed:", e instanceof Error ? e.message : e);
      }
    }

    let page = context.pages()[0] ?? (await context.newPage());
    await installOnPage(page);

    if (cap.loadCookiesPath) {
      const target = startUrl || page.url();
      if (!fs.existsSync(cap.loadCookiesPath)) {
        console.error("Cookies file not found: " + cap.loadCookiesPath);
      } else {
        const cookies = parseCookieJson(fs.readFileSync(cap.loadCookiesPath, "utf8").trim());
        const origin = originOf(target);
        if (origin) {
          try { await page.goto(origin, { waitUntil: "domcontentloaded" }); } catch { /* stay */ }
        }
        let n = 0;
        for (const c of toPlaywrightCookies(cookies, origin ?? target)) {
          try { await context.addCookies([c as unknown as Cookie]); n++; }
          catch (e) { console.error("  Skip cookie " + String(c.name) + ":", e instanceof Error ? e.message : e); }
        }
        console.log("Loaded " + n + " cookie(s) from " + cap.loadCookiesPath);
      }
    }

    if (startUrl) {
      await page.goto(startUrl, { waitUntil: "domcontentloaded" });
    } else {
      const existing = context.pages().find((pg) => {
        try { const u = pg.url(); return Boolean(u) && u !== "about:blank"; }
        catch { return false; }
      });
      if (!existing) {
        console.error("No URL given and no open tab to attach to.");
        process.exit(1);
      }
      page = existing;
    }

    cap.sessionStartUrl = startUrl || page.url();
    writePromptPack(cap, sessionStart);

    for (const pg of context.pages()) {
      await installOnPage(pg);
      await injectUi(pg);
    }

    const stop = new Promise<void>((resolve) => { browser?.on("disconnected", () => resolve()); });
    let stopped = false;
    const loop = (async () => {
      while (!stopped) {
        try {
          if (!context) break;
          const pages = context.pages().filter((pg) => !pg.isClosed());
          if (pages.length === 0) { console.log("\nNo pages left."); break; }
          if (signals.end != null) {
            const name = signals.end;
            signals.end = null;
            renameSession(cap, name);
            console.log("\nSession ended (toolbar / Ctrl+Q)");
            break;
          }
          if (signals.capture) {
            const req = signals.capture;
            signals.capture = null;
            try {
              await req.page.evaluate(() => {
                const w = window as unknown as Record<string, unknown>;
                w.__snapshotCapture = false;
                w.__snapshotNote = "";
              });
            } catch { /* ignore */ }
            console.log("[manual] snapshot" + (req.note ? ' note="' + req.note + '"' : ""));
            if (await saveFromPage(req.page, req.note)) captureCount++;
          } else {
            for (const pg of pages) {
              const state = await readTab(pg);
              if (state.needsInject) await injectUi(pg);
              if (state.end) {
                renameSession(cap, state.name ?? "");
                console.log("\nSession ended (toolbar / Ctrl+Q)");
                stopped = true;
                break;
              }
              if (state.capture) {
                console.log("[manual] snapshot" + (state.note ? ' note="' + state.note + '"' : ""));
                if (await saveFromPage(pg, state.note ?? "")) captureCount++;
                break;
              }
            }
          }
          if (stopped) break;
          await new Promise((r) => setTimeout(r, 200));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (/has been closed|Target closed|browser has been closed/i.test(msg)) {
            console.log("\nBrowser closed.");
            break;
          }
        }
      }
    })();
    await Promise.race([loop, stop]);
    stopped = true;
  } finally {
    if (context) {
      if (cap.saveCookiesPath) {
        try {
          const cookies = await context.cookies();
          const records: CookieRecord[] = cookies.map((c) => {
            const rec: CookieRecord = {
              name: c.name, value: c.value, domain: c.domain ?? "", path: c.path || "/",
              secure: String(Boolean(c.secure)), httpOnly: String(Boolean(c.httpOnly)),
            };
            if (typeof c.expires === "number" && c.expires > 0) rec.expiry = String(Math.floor(c.expires));
            return rec;
          });
          fs.writeFileSync(cap.saveCookiesPath, serializeCookies(records), "utf8");
          console.log("Saved " + cookies.length + " cookie(s) to " + path.resolve(cap.saveCookiesPath));
        } catch (e) {
          console.error("Failed to save cookies:", e instanceof Error ? e.message : e);
        }
      }
      if (cap.saveStoragePath) {
        try {
          const state = await context.storageState();
          fs.writeFileSync(cap.saveStoragePath, JSON.stringify(state, null, 2) + "\n", "utf8");
          console.log("Saved storageState to " + path.resolve(cap.saveStoragePath));
        } catch (e) {
          console.error("Failed to save storageState:", e instanceof Error ? e.message : e);
        }
      }
    }
    if (browser && !cap.attached) {
      try { await browser.close(); } catch { /* already */ }
    }
  }

  refreshFlow(cap, steps, cap.writeDiff);
  console.log("\nDone! " + captureCount + " capture(s) in " + path.resolve(cap.sessionDir));
}

function renameSession(cap: SnapshotCapture, optionalName: string): void {
  try {
    const next = applySessionFolderName(
      cap.sessionDir, optionalName, cap.sessionSubdir,
      (p) => fs.existsSync(p),
      (from, to) => fs.renameSync(from, to)
    );
    if (next !== cap.sessionDir) {
      cap.sessionDir = next;
      console.log("Session folder renamed to: " + path.resolve(cap.sessionDir));
    }
  } catch (e) {
    console.error("Could not rename session folder:", e instanceof Error ? e.message : e);
  }
}
