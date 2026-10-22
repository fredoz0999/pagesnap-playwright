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
    "/": "login.html", "/inventory.html": "inventory.html", "/cart.html": "cart.html", "/form.html": "unlabeled-form.html",
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
    expect(h.suggestions[0].candidates[0].code).toBe('getByTestId("checkout")');
    expect(readFileSync(spec, "utf8")).toContain('getByTestId("checkout")');
  }, 60000);
});
