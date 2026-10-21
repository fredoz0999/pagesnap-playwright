/**
 * Regenerate test/fixtures/saucedemo from the local HTML replicas, using the
 * real capture-tree.js through ScriptedSession. Pages are served at their
 * saucedemo.com URLs with page.route, so no network is needed.
 *
 *   PS_CHROMIUM=/path/to/chrome npx tsx test/fixtures/regen-saucedemo.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { ScriptedSession } from "../../src/scripted.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const html = (f: string) => fs.readFileSync(path.join(here, "saucedemo-html", f), "utf8");
const out = path.join(here, "saucedemo");

const steps: [string, string, string][] = [
  ["https://www.saucedemo.com/", "login.html", "Open the login page"],
  ["https://www.saucedemo.com/inventory.html", "inventory.html", "action: log in as standard_user | assert: Products title visible"],
  ["https://www.saucedemo.com/inventory.html", "inventory2.html", "action: add Backpack and Bike Light to cart | assert: cart badge shows 2"],
  ["https://www.saucedemo.com/cart.html", "cart.html", "action: open cart | assert: both items listed, Checkout enabled"],
];

const browser = await chromium.launch({
  executablePath: process.env.PS_CHROMIUM || undefined,
  args: process.env.PS_CHROMIUM ? ["--no-sandbox", "--headless=new"] : [],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) {
  if (f !== "README.md") fs.rmSync(path.join(out, f), { recursive: true, force: true });
}
const snap = new ScriptedSession({ outputDir: out, goal: "Log in, add two items, verify cart", buildPack: false, saveAria: true });
for (const [url, file, note] of steps) {
  await page.route(url, (r) => r.fulfill({ contentType: "text/html", body: html(file) }));
  await page.goto(url);
  await page.unroute(url);
  console.log(await snap.capture(page, note));
}
await snap.finish();
await browser.close();
