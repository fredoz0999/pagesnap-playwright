/**
 * Browser-backed tests: scripted capture -> verify -> drift -> heal.
 * Runs when a browser is configured: PS_CHROMIUM=<chrome path> or PS_BROWSER=bundled
 * (CI installs Playwright's chromium). Skipped otherwise.
 */
import http from "node:http";
import fs from "node:fs";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright";
import { launchOptions } from "../src/browser-session.js";
import { ScriptedSession } from "../src/scripted.js";
import { verifySession } from "../src/pack/verify.js";
import { healSpec } from "../src/pack/heal.js";
import { queryIndex } from "../src/pack/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(here, "fixtures", "saucedemo-html");
const hasBrowser = !!(process.env.PS_CHROMIUM || process.env.PS_BROWSER);

describe.skipIf(!hasBrowser)("live: capture, verify, heal", () => {
  let server: http.Server;
  let base = "";
  let browser: Browser;
  let session = "";
  const pages: Record<string, string> = {
    "/": "login.html", "/inventory.html": "inventory.html", "/cart.html": "cart.html", "/form.html": "unlabeled-form.html", "/spa.html": "spa.html", "/locators.html": "locators.html",
  };
  let renamed = false;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const file = pages[(req.url || "/").split("?")[0]];
      if (!file) { res.statusCode = 404; res.end(); return; }
      let body = readFileSync(path.join(HTML, file), "utf8");
      if (renamed) body = body.replace(/data-test="checkout"/, 'data-test="checkout-btn"').replace(/id="checkout"/, 'id="checkout-btn"').replace(/name="checkout"/, 'name="checkout-btn"');
      res.setHeader("content-type", "text/html");
      res.end(body);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
    browser = await chromium.launch(launchOptions(true));
    const page = await browser.newPage();
    session = mkdtempSync(path.join(tmpdir(), "ps-live-"));
    const snap = new ScriptedSession({ outputDir: session, goal: "Open cart and check out" });
    await page.goto(base + "/");
    await snap.capture(page, "Open login page");
    await page.goto(base + "/cart.html");
    await snap.capture(page, "action: open cart | assert: Checkout enabled");
    await snap.finish("checkout");
    await page.close();
  }, 60000);

  afterAll(async () => {
    await browser?.close();
    await new Promise((r) => server?.close(r));
  });

  it("scripted capture writes YAML, sidecars, flow, lean pack and prompts", async () => {
    const files = fs.readdirSync(session);
    expect(files.filter((f) => f.endsWith(".yaml"))).toHaveLength(2);
    expect(files.filter((f) => f.endsWith(".locators.json"))).toHaveLength(2);
    expect(files).toContain("flow.md");
    expect(fs.existsSync(path.join(session, "lean", "AUTOMATE_PROMPT.md"))).toBe(true);
    const r = await queryIndex(session, "click Checkout", { step: 2, legend: false });
    expect(r.text).toContain("testid=checkout");
  });

  it("unlabeled inputs never get role locators; submit inputs are named by value", async () => {
    const page = await browser.newPage();
    const dir = mkdtempSync(path.join(tmpdir(), "ps-form-"));
    const snap = new ScriptedSession({ outputDir: dir, buildPack: false });
    await page.goto(base + "/form.html");
    const file = await snap.capture(page, "form");
    await page.close();
    const yaml = readFileSync(path.join(dir, file), "utf8");
    expect(yaml).toContain('button "Register"');
    expect(yaml).toContain('{by: role, value: "button", name: "Register"');
    expect(yaml).not.toMatch(/by: role, value: "textbox"/);
    const side = JSON.parse(readFileSync(path.join(dir, file.replace(".yaml", ".locators.json")), "utf8"));
    expect(side.locators.filter((l: { by: string; role: string }) => l.role === "textbox" && l.by === "role")).toEqual([]);
    expect(side.locators.some((l: { by: string; value: string }) => l.by === "id" && l.value === "customer.firstName")).toBe(true);
    // the locator Playwright would use for that id must actually resolve
    const { idSelector } = await import("../src/pack/parse.js");
    const p2 = await browser.newPage();
    await p2.goto(base + "/form.html");
    expect(await p2.locator(idSelector("customer.firstName")).count()).toBe(1);
    expect(await p2.locator("#customer.firstName").count()).toBe(0); // the naive selector is wrong
    await p2.close();
  }, 60000);

  it("role locators that Playwright cannot resolve are replaced by the next verified locator", async () => {
    const { checkRoleLocators } = await import("../src/role-check.js");
    const page = await browser.newPage();
    await page.setContent('<button id="go">Go</button><div role="menuitem" data-test="mi">Shop <span hidden>x</span></div>');
    const tree = [
      '- button "Go":',
      "  locators:",
      '    - {by: role, value: "button", name: "Go", stability: medium, score: 95}',
      '- menuitem "Shop x":',
      "  locators:",
      '    - {by: role, value: "menuitem", name: "Shop x", stability: medium, score: 95}',
    ].join("\n");
    const locs = [
      { ctl: 1, by: "role", value: "button", locName: "Go", role: "button", name: "Go", score: 95 },
      { ctl: 1, by: "id", value: "go", role: "button", name: "Go", score: 90 },
      { ctl: 2, by: "role", value: "menuitem", locName: "Shop x", role: "menuitem", name: "Shop x", score: 95 },
      { ctl: 2, by: "testid", value: "mi", attr: "data-test", role: "menuitem", name: "Shop x", score: 98 },
    ];
    const r = await checkRoleLocators(page, tree, locs);
    await page.close();
    expect(r.checked).toBe(2);
    expect(r.replaced).toBe(1);
    expect(r.tree).toContain('{by: role, value: "button", name: "Go"');
    expect(r.tree).toContain('{by: testid, value: "mi", attr: data-test, stability: high, score: 98}');
    expect(r.tree).not.toContain('name: "Shop x", stability');
    expect(r.locators.some((l) => l.by === "role" && l.value === "menuitem")).toBe(false);
  });

  it("replay verify reaches states a URL cannot (sign-in, dashboard, loaded orders)", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ps-replay-"));
    const page = await browser.newPage();
    const snap = new ScriptedSession({ outputDir: dir, goal: "Sign in, load savings orders" });
    await snap.record(page);
    snap.vars({ email: { value: "fred1@example.com", fresh: "fred{ts}@example.com" }, password: { value: "pw", secret: true } });
    await page.goto(base + "/spa.html");
    await snap.capture(page, "sign-in form");
    await page.locator('[data-test="email"]').fill("fred1@example.com");
    await page.locator('[data-test="password"]').fill("not-it");
    await page.locator('[data-test="sign-in"]').click();
    await page.locator('[data-test="login-error"]').waitFor();
    await snap.capture(page, "wrong password: error shown");
    await page.locator('[data-test="password"]').fill("pw");
    await page.locator('[data-test="sign-in"]').click();
    await page.locator('[data-test="load-orders"]').waitFor();
    await snap.capture(page, "dashboard");
    await page.locator('[data-test="account"]').selectOption({ label: "Savings" });
    await page.locator('[data-test="load-orders"]').click();
    await page.locator('[data-test="order-total"]').waitFor();
    await snap.capture(page, "orders loaded");
    await snap.finish();
    await page.close();

    // recorded: start URL, typed values with placeholders, never the password
    const all = fs.readdirSync(dir).filter((f) => f.endsWith(".actions.json")).sort()
      .map((f) => readFileSync(path.join(dir, f), "utf8")).join("\n");
    expect(all).toContain('"type": "nav"');
    expect(all).toContain("{{email}}");
    expect(all).toContain("{{secret:password}}"); // the declared secret
    expect(all).toContain("{{wrong-secret}}"); // the deliberately wrong one
    expect(all).not.toContain('"pw"');
    expect(all).not.toContain("not-it");
    expect(readFileSync(path.join(dir, "replay.json"), "utf8")).not.toContain('"pw"');

    // by URL: only the sign-in state is reachable
    const byUrl = await verifySession(dir, { mode: "url" });
    expect(byUrl.pages.filter((p) => p.skipped).map((p) => p.step)).toEqual([2, 3, 4]); // the error, dashboard and orders states are not URLs

    // replay: every step in its captured state; the select falls back from the
    // per-load option value to its label
    const rep = await verifySession(dir, { vars: { password: "pw" } });
    expect(rep.mode).toBe("replay");
    expect(rep.blocked).toBeUndefined();
    expect(rep.pages.map((p) => p.skipped)).toEqual([undefined, undefined, undefined, undefined]);
    expect(rep.items.find((i) => i.locator.value === "login-error" && i.step === 2)?.status).toBe("ok");
    expect(rep.counts.gone).toBe(0);
    expect(rep.items.find((i) => i.locator.value === "order-total")?.status).toBe("ok");

    // a secret is required, never guessed
    await expect(verifySession(dir, {})).rejects.toThrow(/secret:password|PAGESNAP_VAR_PASSWORD/);
    // a wrong secret stops the replay and says where
    const wrong = await verifySession(dir, { vars: { password: "nope" } });
    expect(wrong.blocked?.step).toBe(3);
    expect(wrong.text).toContain("REPLAY STOPPED at step 3");
  }, 120000);

  it("captures Playwright-style scoped, alt, title, text and iframe locators, and they all resolve", async () => {
    const { toPlaywright } = await import("../src/pack/verify.js");
    const { parseSnapshot, walk } = await import("../src/pack/parse.js");
    const { locatorCode } = await import("../src/pack/pom.js");
    const page = await browser.newPage();
    const dir = mkdtempSync(path.join(tmpdir(), "ps-loc-"));
    const snap = new ScriptedSession({ outputDir: dir, buildPack: false, record: false });
    await page.goto(base + "/locators.html");
    const file = await snap.capture(page, "catalog");
    const yaml = readFileSync(path.join(dir, file), "utf8");
    const parsed = parseSnapshot(yaml, file);
    const all: { role: string; name: string; l: import("../src/pack/parse.js").Locator }[] = [];
    walk(parsed.roots, (n) => n.locators.forEach((l) => all.push({ role: n.role, name: n.name, l })));
    const find = (pred: (x: typeof all[number]) => boolean) => all.find(pred)?.l;

    // repeated card buttons: scoped to the card and filtered by its heading text
    const blue = find((x) => x.role === "button" && x.name === "Add to cart" && x.l.scopeText === "Blue Chair");
    expect(blue?.scopeBy).toBe("role");
    expect(blue?.scopeValue).toBe("listitem");
    expect(locatorCode(blue!)).toBe("this.page.getByRole('listitem').filter({ hasText: 'Blue Chair' }).getByRole('button', { name: 'Add to cart', exact: true })");
    // rows in an id'd table: scope to the table, filter by the row's order id
    const view2 = find((x) => x.role === "link" && x.name === "View" && x.l.scopeText === "ORD-2");
    expect(view2?.scopeBy).toBe("role");
    // same text in two id'd sections: chain only, no filter
    const saveShip = find((x) => x.role === "button" && x.name === "Save" && x.l.scopeValue === "shipping");
    expect(saveShip?.scopeBy).toBe("id");
    expect(saveShip?.scopeText).toBeUndefined();
    // alt / title / text strategies exist (lean YAML shows one locator; the sidecar has them all)
    expect(all.some((x) => x.l.by === "alt" && x.l.value === "Acme logo")).toBe(true);
    const side = JSON.parse(readFileSync(path.join(dir, file.replace(".yaml", ".locators.json")), "utf8")).locators as { by: string; value: string }[];
    expect(side.some((x) => x.by === "title" && x.value === "Go home")).toBe(true);
    expect(yaml).toContain('text "Your order was placed successfully."');
    // iframe content carries the frame path
    const ask = find((x) => x.role === "button" && x.name === "Ask support");
    expect(ask?.frame).toBe("help");
    expect(locatorCode(ask!)).toContain("frameLocator('iframe[name=\"help\"], iframe#help')");

    // every locator the capture wrote resolves to exactly one element in Playwright
    let checked = 0;
    for (const x of all) {
      if (x.l.matches != null) continue;
      expect(await toPlaywright(page, x.l).count(), x.role + " " + x.name + " via " + JSON.stringify(x.l)).toBe(1);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(10); // link, 3 card buttons, 2 row links, 2 Save, img, iframe button
    expect(all.filter((x) => x.l.by === "css" && /nth-child/.test(x.l.value))).toEqual([]); // no structural paths needed
    await page.close();
  }, 60000);

  it("verify passes against the unchanged app", async () => {
    const rep = await verifySession(session);
    expect(rep.counts.gone).toBe(0);
    expect(rep.counts.ok).toBeGreaterThan(5);
  }, 60000);

  it("verify flags drift and heal repairs the spec from the snapshots", async () => {
    renamed = true;
    const rep = await verifySession(session, { steps: [2] });
    expect(rep.items.find((i) => i.locator.value === "checkout")?.status).toBe("gone");
    renamed = false;
    // a spec with a near-miss locator (what an agent might write): heal maps it back
    const spec = path.join(session, "x.spec.ts");
    writeFileSync(spec, "await page.getByTestId('checkout-button').click();\n");
    const h = healSpec(session, spec, { write: true });
    expect(h.suggestions[0].candidates[0].code).toBe("getByTestId('checkout')");
    expect(readFileSync(spec, "utf8")).toContain("getByTestId('checkout')");
  }, 60000);
});
