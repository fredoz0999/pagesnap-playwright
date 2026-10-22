/**
 * Log in as the user the capture registered and save a fresh storageState
 * (the capture logs out at the end, which invalidates its own session).
 *   npx tsx examples/parabank/login.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { launchOptions } from "../../src/browser-session.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PARABANK_URL || "https://parabank.parasoft.com/parabank";
const user = JSON.parse(fs.readFileSync(path.join(here, ".auth", "user.json"), "utf8"));

const browser = await chromium.launch(launchOptions(true));
const context = await browser.newContext();
const page = await context.newPage();
// First response URL-rewrites ;jsessionid= into the form action, which the demo's
// proxy rejects ("matrix parameter separator"). A second load uses the cookie.
await page.goto(BASE + "/index.htm");
await page.goto(BASE + "/index.htm");
await page.locator('input[name="username"]').fill(user.username);
await page.locator('input[name="password"]').fill(user.password);
await page.locator('input[value="Log In"]').click();
await page.getByRole("link", { name: "Log Out" }).waitFor();
await context.storageState({ path: path.join(here, ".auth", "state.json") });
console.log("Logged in as " + user.username + "; saved .auth/state.json");
await browser.close();
