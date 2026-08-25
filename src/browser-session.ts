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
  const browser = await chromium.launch({ headless: opts.headless, channel: "chrome" });
  const contextOpts: Parameters<Browser["newContext"]>[0] = { viewport: null, ignoreHTTPSErrors: true };
  if (opts.loadStoragePath) {
    contextOpts.storageState = opts.loadStoragePath;
  }
  const context = await browser.newContext(contextOpts);
  return { browser, context, attached: false };
}
