import type { Browser, BrowserContext } from "playwright";
import { chromium } from "playwright";

export interface OpenResult {
  browser: Browser;
  context: BrowserContext;
  attached: boolean;
}

export async function openBrowser(opts: {
  headless: boolean;
  connectUrl: string | null;
  loadStoragePath: string | null;
}): Promise<OpenResult> {
  if (opts.connectUrl) {
    const browser = await chromium.connectOverCDP(opts.connectUrl);
    const context = browser.contexts()[0] ?? (await browser.newContext());
    return { browser, context, attached: true };
  }
  const browser = await chromium.launch(launchOptions(opts.headless));
  const contextOpts: Parameters<Browser["newContext"]>[0] = { viewport: null, ignoreHTTPSErrors: true };
  if (opts.loadStoragePath) {
    contextOpts.storageState = opts.loadStoragePath;
  }
  const context = await browser.newContext(contextOpts);
  return { browser, context, attached: false };
}

/**
 * Installed Google Chrome by default (no browser download). Set PS_CHROMIUM to
 * a Chromium executable, or PS_BROWSER=bundled to use Playwright's own build
 * (CI after `npx playwright install chromium`).
 */
export function launchOptions(headless: boolean): Parameters<typeof chromium.launch>[0] {
  if (process.env.PS_CHROMIUM) {
    return { headless, executablePath: process.env.PS_CHROMIUM, args: ["--no-sandbox"] };
  }
  if (process.env.PS_BROWSER === "bundled") return { headless };
  return { headless, channel: "chrome" };
}
