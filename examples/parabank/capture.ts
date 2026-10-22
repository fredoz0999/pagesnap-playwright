/**
 * Scripted PageSnap capture of the Parabank demo bank (UI flow), producing the
 * session the E2E spec and page objects are generated from.
 *
 *   npx tsx examples/parabank/capture.ts [outDir]
 *
 * Registers a fresh user each run (the public demo DB is shared and resets),
 * writes examples/parabank/.auth/user.json (credentials + storageState) for the spec.
 * This file is the capture *driver*; the spec itself uses only generated page objects.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";
import { launchOptions } from "../../src/browser-session.js";
import { ScriptedSession } from "../../src/scripted.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PARABANK_URL || "https://parabank.parasoft.com/parabank";
const out = path.resolve(process.argv[2] || path.join(here, "session"));
const authDir = path.join(here, ".auth");

const user = {
  username: "ps" + Date.now().toString(36),
  password: "Pagesnap#1",
  firstName: "Page", lastName: "Snap", street: "1 Test Way", city: "Chantilly", state: "VA", zip: "20151",
  phone: "5550100", ssn: "123-45-6789",
};

const id = (page: Page, v: string) => page.locator(`[id="${v}"]`);

async function main() {
  fs.rmSync(out, { recursive: true, force: true });
  const browser = await chromium.launch(launchOptions(true));
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const snap = new ScriptedSession({ outputDir: out, goal: "Parabank: register, open savings account, transfer, pay bill, find transaction", saveAria: true });
  const cap = async (note: string) => console.log("  " + (await snap.capture(page, note)));

  // 1-2 register
  await page.goto(BASE + "/register.htm");
  await cap("action: open Register | data: new unique username");
  const f: [string, string][] = [
    ["customer.firstName", user.firstName], ["customer.lastName", user.lastName], ["customer.address.street", user.street],
    ["customer.address.city", user.city], ["customer.address.state", user.state], ["customer.address.zipCode", user.zip],
    ["customer.phoneNumber", user.phone], ["customer.ssn", user.ssn], ["customer.username", user.username],
    ["customer.password", user.password], ["repeatedPassword", user.password],
  ];
  for (const [k, v] of f) await id(page, k).fill(v);
  await page.locator('input[value="Register"]').click();
  await page.getByText("Your account was created successfully").waitFor();
  await cap("action: submit registration | assert: welcome title with username, account created message");

  // 3 overview
  await page.getByRole("link", { name: "Accounts Overview" }).click();
  await page.locator("#accountTable tbody tr").first().waitFor();
  await cap("action: open Accounts Overview | assert: one account listed with balance $515.50");

  // 4-5 open savings account
  await page.getByRole("link", { name: "Open New Account" }).click();
  await page.locator("#fromAccountId option").first().waitFor({ state: "attached" });
  await cap("action: open Open New Account | data: type SAVINGS, from first account");
  await page.locator("#type").selectOption({ label: "SAVINGS" });
  await page.locator('input[value="Open New Account"]').click();
  await page.locator("#newAccountId").waitFor();
  await cap("action: click Open New Account | assert: 'Account Opened!' and new account number shown");

  // 6-7 transfer
  await page.getByRole("link", { name: "Transfer Funds" }).click();
  await page.locator("#toAccountId option").nth(1).waitFor({ state: "attached" });
  await cap("action: open Transfer Funds | data: amount 25 from first account to the new savings account");
  await page.locator("#amount").fill("25");
  await page.locator("#toAccountId").selectOption({ index: 1 });
  await page.locator('input[value="Transfer"]').click();
  await page.getByText("Transfer Complete!").waitFor();
  await cap("action: click Transfer | assert: 'Transfer Complete!' with $25.00 and both account ids");

  // 8-9 bill pay
  await page.getByRole("link", { name: "Bill Pay" }).click();
  await page.locator('input[name="payee.name"]').waitFor();
  await cap("action: open Bill Pay | data: payee Electric Co, account 12345, amount 12.34");
  const bp: [string, string][] = [
    ["payee.name", "Electric Co"], ["payee.address.street", "2 Power St"], ["payee.address.city", "Reston"],
    ["payee.address.state", "VA"], ["payee.address.zipCode", "20190"], ["payee.phoneNumber", "5550111"],
    ["payee.accountNumber", "12345"], ["verifyAccount", "12345"], ["amount", "12.34"],
  ];
  for (const [k, v] of bp) await page.locator(`input[name="${k}"]`).fill(v);
  const billFrom = await page.locator('select[name="fromAccountId"]').inputValue();
  await page.locator('input[value="Send Payment"]').click();
  await page.getByText("Bill Payment Complete").waitFor();
  await cap("action: click Send Payment | assert: 'Bill Payment Complete' naming Electric Co and $12.34");

  // 10-11 find transactions
  await page.getByRole("link", { name: "Find Transactions" }).click();
  await page.locator("#accountId option").first().waitFor({ state: "attached" });
  await cap("action: open Find Transactions | data: account used for the bill payment, find by amount 12.34");
  await page.locator("#accountId").selectOption(billFrom); // option order differs per page
  await page.locator("#amount").fill("12.34");
  await page.locator("#findByAmount").click();
  await page.locator("#transactionTable tbody tr").first().waitFor();
  await cap("action: click Find Transactions by amount | assert: results table lists the Bill Payment to Electric Co");

  fs.mkdirSync(authDir, { recursive: true });
  await context.storageState({ path: path.join(authDir, "state.json") });
  fs.writeFileSync(path.join(authDir, "user.json"), JSON.stringify(user, null, 2));

  // 12-13 log out, bad login
  await page.getByRole("link", { name: "Log Out" }).click();
  await page.locator('input[name="username"]').waitFor();
  await cap("action: log out | assert: Customer Login form visible");
  await page.locator('input[name="username"]').fill(user.username);
  await page.locator('input[name="password"]').fill("wrong-password");
  await page.locator('input[value="Log In"]').click();
  await page.locator(".error").waitFor();
  await cap("action: log in with wrong password | assert: error 'The username and password could not be verified.'");

  const idx = await snap.finish("parabank-e2e");
  console.log("Session: " + out + (idx ? "  (" + idx.stats.rawTokens + " -> " + idx.stats.compactTokens + " tokens)" : ""));
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
