/**
 * Scripted PageSnap capture of the Toolshop demo store
 * (https://practicesoftwaretesting.com, Angular SPA + REST API):
 * search, sort, product, add to cart, cart, sign in, address, payment, order.
 *
 *   npx tsx examples/toolshop/capture.ts [outDir]
 *
 * Registers a fresh customer through the API first (the shared demo accounts
 * get locked by other users) and writes .auth/user.json for the spec.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, request } from "playwright";
import { launchOptions } from "../../src/browser-session.js";
import { ScriptedSession } from "../../src/scripted.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = process.env.TOOLSHOP_URL || "https://practicesoftwaretesting.com";
const API = process.env.TOOLSHOP_API || "https://api.practicesoftwaretesting.com";
const out = path.resolve(process.argv[2] || path.join(here, "session"));
const proxy = process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY }, ignoreHTTPSErrors: true } : {};

const user = { email: `ps${Date.now()}@example.com`, password: "Pagesnap#2026x", first: "Page", last: "Snap" };

async function expectValue(l: import("playwright").Locator, v: string) {
  for (let i = 0; i < 60; i++) {
    if ((await l.inputValue().catch(() => "")) === v) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("value never became " + v);
}

async function main() {
  const api = await request.newContext({ ...proxy, extraHTTPHeaders: { Accept: "application/json" } });
  const reg = await api.post(API + "/users/register", {
    data: {
      first_name: user.first, last_name: user.last, phone: "5550100", dob: "1990-01-01", email: user.email, password: user.password,
      address: { street: "1 Test Way", city: "Chantilly", state: "VA", country: "US", postal_code: "20151" },
    },
  });
  if (reg.status() !== 201) throw new Error("register failed: " + reg.status() + " " + (await reg.text()));
  fs.mkdirSync(path.join(here, ".auth"), { recursive: true });
  fs.writeFileSync(path.join(here, ".auth", "user.json"), JSON.stringify(user, null, 2));
  // values for `pack verify --vars=examples/toolshop/.auth/vars.json` (git-ignored)
  fs.writeFileSync(path.join(here, ".auth", "vars.json"), JSON.stringify({ password: user.password }, null, 2));

  fs.rmSync(out, { recursive: true, force: true });
  const browser = await chromium.launch(launchOptions(true));
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(30000);
  const t = (id: string) => page.locator(`[data-test="${id}"]`);
  const snap = new ScriptedSession({ outputDir: out, goal: "Toolshop: search, sort, add to cart, sign in, check out, get invoice", saveAria: true });
  // Record clicks/typing so `pack verify` can replay into every step (cart, sign-in, payment).
  // The customer already exists (registered above), so the replay signs in with the same email;
  // the password is a secret: never written, supplied at verify time.
  await snap.record(page);
  snap.vars({ email: { value: user.email }, password: { value: user.password, secret: true } });
  const cap = async (note: string) => console.log("  " + (await snap.capture(page, note)));

  await page.goto(WEB + "/");
  await t("product-name").first().waitFor();
  await cap("action: open the shop | assert: product grid, search, sort and filters visible");

  await t("search-query").fill("hammer");
  await t("search-submit").click();
  await t("search_completed").waitFor({ state: "attached" }); // grid shows old results until this marker
  await t("search-term").waitFor();
  await cap("action: search 'hammer' | assert: caption 'Searched for: hammer', only hammer products listed");

  await t("sort").selectOption({ label: "Price (Low - High)" });
  await t("sorting_completed").waitFor({ state: "attached" }); // grid re-sorts in place, no navigation
  await cap("action: sort by Price (Low - High) | assert: cheapest hammer first");

  // first hammer that is in stock (the shared demo's stock moves), skipping Thor Hammer:
  // the app caps it at one per cart on purpose, and this flow buys two
  const card = page.locator('a[data-test^="product-"]').filter({ has: t("product-name") }).filter({ hasNot: t("out-of-stock") }).filter({ hasNotText: "Thor Hammer" }).first();
  const productName = (await card.locator('[data-test="product-name"]').innerText()).trim();
  await card.click();
  await t("add-to-cart").waitFor();
  await cap("action: open the first in-stock hammer (" + productName + ") | assert: name, unit price, quantity 1, Add to cart");

  await t("increase-quantity").click();
  await t("add-to-cart").click();
  await t("cart-quantity").waitFor();
  await cap("action: quantity 2, Add to cart | assert: toast shown, cart badge shows 2");

  await t("nav-cart").click();
  await t("proceed-1").waitFor();
  await cap("action: open cart | assert: the product x2, line price = 2 x unit price, cart total");

  await t("proceed-1").click();
  await t("email").waitFor();
  await cap("action: Proceed to checkout | assert: Sign in step with email, password, Login");

  await t("email").fill(user.email);
  await t("password").fill("wrong-password");
  await t("login-submit").click();
  await t("login-error").waitFor();
  await cap("action: log in with a wrong password | assert: login error shown, still on Sign in");

  await t("password").fill(user.password);
  await t("login-submit").click();
  await t("proceed-2").waitFor();
  await cap("action: log in with the new customer | assert: 'already logged in' and Proceed to checkout");

  await t("proceed-2").click();
  await t("proceed-3").waitFor();
  await expectValue(t("street"), "1 Test Way"); // address prefill is async; filling earlier gets overwritten
  await cap("action: Proceed to billing address | assert: address prefilled from the account, house number empty");

  await t("house_number").fill("12");
  await t("house_number").blur();
  await page.waitForFunction(() => !document.querySelector('[data-test="proceed-3"]')?.hasAttribute("disabled"));
  await t("proceed-3").click();
  await t("payment-method").waitFor();
  await cap("action: house number 12, Proceed | assert: payment method select, Confirm disabled");

  await t("payment-method").selectOption({ label: "Cash on Delivery" });
  await t("finish").click();
  await t("payment-success-message").waitFor();
  await cap("action: Cash on Delivery, Confirm | assert: 'Payment was successful'");

  await t("finish").click();
  await page.getByText("Thanks for your order!").waitFor();
  await cap("action: Confirm | assert: 'Thanks for your order! Your invoice number is INV-...'");

  const idx = await snap.finish("toolshop-checkout");
  console.log("Session: " + out + (idx ? "  (" + idx.stats.rawTokens + " -> " + idx.stats.compactTokens + " tokens)" : ""));
  await browser.close();
  await api.dispose();
}

main().catch((e) => { console.error(e); process.exit(1); });
