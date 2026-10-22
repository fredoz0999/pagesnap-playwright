import { cpSync, mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeAll } from "vitest";
import { parseLocator, parseSnapshot, estimateTokens } from "../src/pack/parse.js";
import { compactSnapshot, fmtLocator } from "../src/pack/compact.js";
import { chunkSnapshot } from "../src/pack/chunk.js";
import { buildIndex, queryIndex, indexIsStale } from "../src/pack/index.js";
import { validateSpec, extractCalls } from "../src/pack/validate.js";
import { HashEmbedder, cosine, tokenize, expand } from "../src/pack/embed.js";
import { SnapshotCapture } from "../src/capture.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, "fixtures", "saucedemo");
const SPEC = path.join(here, "fixtures", "specs", "cart.spec.ts");
const read = (f: string) => readFileSync(path.join(FIXTURE, f), "utf8");
const INVENTORY = "02_www.saucedemo.com_inventory.html.yaml";

describe("parse", () => {
  it("reads a locator line", () => {
    expect(parseLocator('- {by: testid, value: "login-button", attr: data-test, stability: high, score: 98}')).toEqual({
      by: "testid", value: "login-button", attr: "data-test", stability: "high", score: 98,
    });
    expect(parseLocator('- {by: role, value: "button", name: "Open \\"Menu\\"", stability: medium, score: 95}')?.name).toBe('Open "Menu"');
  });

  it("reads header, tree, locators and native options", () => {
    const s = parseSnapshot(read(INVENTORY), INVENTORY);
    expect(s.step).toBe(2);
    expect(s.url).toBe("https://www.saucedemo.com/inventory.html");
    const flat: string[] = [];
    const visit = (ns: typeof s.roots) => ns.forEach((n) => { flat.push(n.role + ":" + n.name); visit(n.children); });
    visit(s.roots);
    expect(flat).toContain("button:Add to cart");
    expect(flat).toContain("link:Sauce Labs Fleece Jacket");
    const combo = JSON.stringify(s.roots);
    expect(combo).toContain("Price (low to high)");
    expect(combo).toContain("product-sort-container");
  });
});

describe("compact", () => {
  it("cuts the inventory page by well over half and collapses repeated cards", () => {
    const raw = read(INVENTORY);
    const out = compactSnapshot(parseSnapshot(raw, INVENTORY));
    expect(estimateTokens(out)).toBeLessThan(estimateTokens(raw) * 0.35);
    expect(out).toContain("testid=add-to-cart-sauce-labs-backpack");
    expect(out).toMatch(/\+4 more same-shape generic: "Sauce Labs Bolt T-Shirt"/);
    expect(out).toContain("testIdAttribute: data-test");
    expect(out).not.toContain("nth-child");
    expect(out).not.toContain("stability");
  });

  it("drops locators implied by role and name", () => {
    expect(fmtLocator({ by: "role", value: "button", name: "Open Menu" }, { role: "button", name: "Open Menu" })).toBe("role");
    expect(fmtLocator({ by: "role", value: "link", name: "Help" }, { role: "button", name: "Help" })).toBe('role=link name="Help"');
    expect(fmtLocator({ by: "id", value: "x", matches: 3 }, { role: "button", name: "" })).toBe("#x (x3 not unique)");
  });
});

describe("chunk", () => {
  it("keeps collapsed cards retrievable as item chunks with exact locators", () => {
    const { chunks } = chunkSnapshot(parseSnapshot(read(INVENTORY), INVENTORY));
    const fleece = chunks.find((c) => c.kind === "item" && c.text.includes("Fleece Jacket"));
    expect(fleece?.text).toContain("testid=add-to-cart-sauce-labs-fleece-jacket");
    expect(chunks.every((c) => c.tokens > 0)).toBe(true);
  });
});

describe("embed", () => {
  it("puts synonyms close together", () => {
    const e = new HashEmbedder();
    const a = e.embedOne("sign in button");
    const b = e.embedOne("login button");
    const c = e.embedOne("footer twitter link");
    expect(cosine(a, b)).toBeGreaterThan(cosine(a, c));
    expect(expand(tokenize("basket"))).toContain("syn:login".replace("login", "cart"));
    expect(tokenize("addToCart-sauce_labs")).toEqual(["add", "cart", "sauce", "lab"]);
  });
});

describe("index + query", () => {
  let dir = "";
  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "ps-pack-"));
    cpSync(FIXTURE, dir, { recursive: true });
    await buildIndex(dir);
  });

  it("writes lean files, index and PACK.md", () => {
    expect(existsSync(path.join(dir, "lean", "index.json"))).toBe(true);
    expect(existsSync(path.join(dir, "lean", INVENTORY.replace(".yaml", ".txt")))).toBe(true);
    expect(readFileSync(path.join(dir, "lean", "PACK.md"), "utf8")).toContain("npm run pack -- query");
    expect(indexIsStale(dir)).toBe(false);
  });

  it("finds a collapsed product by name", async () => {
    const r = await queryIndex(dir, "add the Fleece Jacket to the cart", { legend: false });
    expect(r.lowConfidence).toBe(false);
    expect(r.hits[0].chunk.text).toContain("add-to-cart-sauce-labs-fleece-jacket");
    expect(r.hits[0].chunk.steps).toEqual([2, 3]);
  });

  it("matches synonyms (sign in -> login form, basket -> cart page)", async () => {
    const login = await queryIndex(dir, "sign in with username and password", { k: 1 });
    expect(login.hits[0].chunk.text).toContain("testid=username");
    const cart = await queryIndex(dir, "proceed to checkout from the basket", { k: 1 });
    expect(cart.hits[0].chunk.text).toContain("testid=checkout");
  });

  it("returns far fewer tokens than the raw snapshots", async () => {
    const raw = ["01_www.saucedemo.com_root.yaml", INVENTORY, "03_www.saucedemo.com_inventory.html.yaml", "04_www.saucedemo.com_cart.html.yaml"]
      .reduce((a, f) => a + estimateTokens(read(f)), 0);
    const r = await queryIndex(dir, "add the Fleece Jacket to the cart");
    expect(r.tokens).toBeLessThan(raw * 0.15);
  });

  it("falls back to a whole compact page when nothing matches well", async () => {
    const r = await queryIndex(dir, "zzqx frobnicate", { k: 2 });
    expect(r.lowConfidence).toBe(true);
    expect(r.text).toContain("Low-confidence");
    expect(r.text).toContain("@ step");
  });

  it("filters by step", async () => {
    const r = await queryIndex(dir, "remove item", { step: 4 });
    expect(r.hits.every((h) => h.chunk.steps.includes(4))).toBe(true);
  });
});

describe("validate", () => {
  it("extracts locator calls with line numbers", () => {
    const calls = extractCalls("await page.getByTestId('a').click();\nawait page.getByRole('button', { name: 'Go' }).first();\n");
    expect(calls.map((c) => [c.line, c.kind, c.arg, c.narrowed])).toEqual([[1, "testid", "a", false], [2, "role", "button", true]]);
  });

  it("flags invented locators and accepts captured ones", () => {
    const rep = validateSpec(FIXTURE, SPEC);
    const byLine = new Map(rep.findings.map((f) => [f.line, f.status]));
    expect(byLine.get(5)).toBe("ok");        // getByTestId username
    expect(byLine.get(6)).toBe("ok");        // placeholder matches field name
    expect(byLine.get(11)).toBe("ok");       // ambiguous but narrowed with .first()
    expect(byLine.get(15)).toBe("ok");       // #checkout: not shown in YAML, but in the locators sidecar
    expect(byLine.get(16)).toBe("missing");  // invented testid
    expect(byLine.get(17)).toBe("missing");  // page never captured
    expect(byLine.get(18)).toBe("unverified"); // template string
    expect(rep.testIdAttrs).toEqual(["data-test"]);
    expect(rep.text).toContain("testIdAttribute");
  });
});

describe("locators sidecar", () => {
  it("lists every verified locator, not only the YAML one", () => {
    const side = JSON.parse(read("04_www.saucedemo.com_cart.html.locators.json"));
    const checkout = side.locators.filter((l: { name: string }) => l.name === "Checkout").map((l: { by: string }) => l.by);
    expect(checkout).toEqual(["testid", "role", "id", "name"]);
    expect(read("04_www.saucedemo.com_cart.html.yaml")).not.toContain("by: id, value: \"checkout\"");
  });

  it("without a sidecar, lean gaps stay unverified instead of missing", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ps-noside-"));
    cpSync(FIXTURE, dir, { recursive: true });
    for (const f of (await import("node:fs")).readdirSync(dir)) if (f.endsWith(".locators.json")) (await import("node:fs")).rmSync(path.join(dir, f));
    const rep = validateSpec(dir, SPEC);
    expect(rep.findings.find((f) => f.line === 15)?.status).toBe("unverified");
  });
});

describe("capture flag", () => {
  it("--no-pack turns off the end-of-session build", () => {
    const c = new SnapshotCapture();
    expect(c.buildPack).toBe(true);
    c.parseArgs(["https://app.test", "--no-pack"]);
    expect(c.buildPack).toBe(false);
  });
});

describe("prompts", () => {
  it("builds a session prompt with absolute paths and the goal-based spec name", async () => {
    const { automatePrompt, testCasesPrompt, slugify, sessionGoal } = await import("../src/pack/prompts.js");
    expect(sessionGoal(FIXTURE)).toBe("Log in, add two items, verify cart");
    expect(slugify("Log in, add two items, verify cart")).toBe("log-in-add-two-items-verify-cart");
    const p = automatePrompt({ session: "/abs/session", name: "cart-flow", tool: "/tools/pagesnap" });
    expect(p).toContain('PACK query "/abs/session"');
    expect(p).toContain("tests/cart-flow.spec.ts");
    expect(p).toContain('npm --prefix "/tools/pagesnap" run -s pack --');
    expect(p).toContain("PACK validate");
    expect(p).not.toMatch(/\n\n\n/);
    expect(testCasesPrompt({ session: "/abs/session", name: "cart-flow", tool: "/t" })).toContain("Gaps to capture");
  });

  it("build writes AUTOMATE_PROMPT.md and TESTCASES_PROMPT.md", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ps-prompt-"));
    cpSync(FIXTURE, dir, { recursive: true });
    await buildIndex(dir, { name: "cart-flow" });
    const a = readFileSync(path.join(dir, "lean", "AUTOMATE_PROMPT.md"), "utf8");
    expect(a).toContain("tests/cart-flow.spec.ts");
    expect(a).toContain(path.resolve(dir));
    expect(existsSync(path.join(dir, "lean", "TESTCASES_PROMPT.md"))).toBe(true);
  });

  it("install-prompts writes Copilot prompt files and Claude Code commands", async () => {
    const { installPrompts } = await import("../src/pack/prompts.js");
    const repo = mkdtempSync(path.join(tmpdir(), "ps-repo-"));
    const files = installPrompts(repo, "/tools/pagesnap");
    expect(files.map((f) => path.relative(repo, f)).sort()).toEqual([
      ".claude/commands/pagesnap-automate.md",
      ".claude/commands/pagesnap-testcases.md",
      ".github/prompts/pagesnap-automate.prompt.md",
      ".github/prompts/pagesnap-testcases.prompt.md",
      ".vscode/mcp.json",
    ]);
    const mcp = JSON.parse(readFileSync(path.join(repo, ".vscode/mcp.json"), "utf8"));
    expect(mcp.servers.pagesnap.args).toEqual(["--prefix", "/tools/pagesnap", "run", "-s", "mcp"]);
    // an existing config is never overwritten
    expect(installPrompts(repo, "/other").map((f) => path.relative(repo, f))).not.toContain(".vscode/mcp.json");
    const copilot = readFileSync(path.join(repo, ".github/prompts/pagesnap-automate.prompt.md"), "utf8");
    expect(copilot.startsWith("---\nmode: agent\n")).toBe(true);
    expect(copilot).toContain("${input:session:");
    const claude = readFileSync(path.join(repo, ".claude/commands/pagesnap-automate.md"), "utf8");
    expect(claude).toContain('PACK query "$1"');
    expect(claude).toContain("tests/$2.spec.ts");
  });
});

describe("pom", () => {
  it("generates page classes, a shared BasePage and a member map", async () => {
    const { writePom, locatorCode } = await import("../src/pack/pom.js");
    const out = mkdtempSync(path.join(tmpdir(), "ps-pom-"));
    const r = writePom(FIXTURE, out);
    expect(r.pages.map((p) => p.className)).toEqual(["HomePage", "InventoryPage", "CartPage"]);
    expect(r.testIdAttribute).toBe("data-test");
    const inv = r.pages.find((p) => p.className === "InventoryPage")!;
    expect(inv.steps).toEqual([2, 3]);
    const names = inv.members.map((m) => m.prop);
    expect(names).toContain("addToCartSauceLabsFleeceJacketButton");
    expect(new Set(names).size).toBe(names.length);
    expect(r.base.map((m) => m.prop)).toContain("shoppingCartLink");
    const cart = readFileSync(path.join(out, "cart.page.ts"), "utf8");
    expect(cart).toContain("export class CartPage extends BasePage");
    expect(cart).toContain("return this.page.getByTestId('checkout');");
    expect(readFileSync(path.join(out, "PAGES.md"), "utf8")).toContain("testIdAttribute: 'data-test'");
    expect(locatorCode({ by: "role", value: "button", name: "Log In" })).toBe("this.page.getByRole('button', { name: 'Log In', exact: true })");
    expect(locatorCode({ by: "name", value: "it's" })).toBe("this.page.locator('[name=\"it\\'s\"]')");
  });
});

describe("diff query", () => {
  it("omits regions unchanged since the previous step and adds changed ones", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ps-diff-"));
    cpSync(FIXTURE, dir, { recursive: true });
    await buildIndex(dir);
    // the Onesie card is identical in steps 2 and 3: referenced, not repeated
    const same = await queryIndex(dir, "add Sauce Labs Onesie to cart", { step: 3, legend: false, diff: true });
    expect(same.text).toContain("unchanged since step 2");
    expect(same.text).not.toContain("add-to-cart-sauce-labs-onesie");
    // the header (badge) and the two cards with Remove changed between the steps
    const diff = await queryIndex(dir, "cart badge shows 2", { step: 3, legend: false, diff: true });
    expect(diff.text).toContain("testid=shopping-cart-badge");
    expect(diff.text).toContain("testid=remove-sauce-labs-backpack");
    expect(diff.text).toMatch(/CHANGED/);
    const plain = await queryIndex(dir, "cart badge shows 2", { step: 3, legend: false });
    expect(plain.text).not.toContain("unchanged since");
    // step 3 hits are shown under step 3 even when shared with step 2
    expect(plain.text).not.toContain("@ step 2");
  });
});

describe("heal", () => {
  it("suggests and safely applies replacements for invented locators", async () => {
    const { healSpec, replaceCall, failingCallsFromLog } = await import("../src/pack/heal.js");
    const dir = mkdtempSync(path.join(tmpdir(), "ps-heal-"));
    cpSync(FIXTURE, dir, { recursive: true });
    const spec = path.join(dir, "x.spec.ts");
    (await import("node:fs")).writeFileSync(spec, [
      "await page.getByTestId('checkout-button').click();",
      "await page.getByTestId('add-to-cart-fleece-jacket').click();",
      "await page.locator('#user_name').fill('x');",
      "await page.getByTestId('username').fill('ok');",
    ].join("\n") + "\n");
    const r = healSpec(dir, spec, { write: true });
    expect(r.suggestions.map((s) => s.line)).toEqual([1, 2, 3]);
    expect(r.suggestions[1].candidates[0].code).toBe("getByTestId('add-to-cart-sauce-labs-fleece-jacket')");
    expect(r.suggestions[1].applied).toBeUndefined(); // too close to the other add-to-cart buttons
    const out = readFileSync(spec, "utf8").split("\n");
    expect(out[0]).toBe("await page.getByTestId('checkout').click();");
    expect(out[2]).toBe("await page.getByTestId('username').fill('x');");
    expect(out[3]).toBe("await page.getByTestId('username').fill('ok');");
    expect(replaceCall("a.locator('x(y)').click()", "locator('x(y)'", "getByTestId(\"z\")")).toBe('a.getByTestId("z").click()');
    expect(failingCallsFromLog("Error: locator.click: Timeout\n  - waiting for getByTestId('checkout-button')\n")).toEqual(["getByTestId('checkout-button')"]);
  });
});

describe("mcp server", () => {
  it("speaks MCP over stdio: initialize, tools/list, tools/call", async () => {
    const { spawn } = await import("node:child_process");
    const dir = mkdtempSync(path.join(tmpdir(), "ps-mcp-"));
    cpSync(FIXTURE, dir, { recursive: true });
    const root = path.resolve(here, "..");
    const child = spawn(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"), path.join(root, "src/pack/mcp.ts")], { cwd: root });
    const lines: string[] = [];
    let buf = "";
    child.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { lines.push(buf.slice(0, i)); buf = buf.slice(i + 1); } });
    const send = (o: object) => child.stdin.write(JSON.stringify(o) + "\n");
    const waitFor = async (id: number) => {
      for (let t = 0; t < 200; t++) {
        const hit = lines.map((l) => JSON.parse(l)).find((j) => j.id === id);
        if (hit) return hit;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error("no reply for " + id);
    };
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } });
    expect((await waitFor(1)).result.serverInfo.name).toBe("pagesnap");
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    expect((await waitFor(2)).result.tools.map((t: { name: string }) => t.name)).toContain("pagesnap_query");
    send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "pagesnap_query", arguments: { session: dir, query: "click Checkout", step: 4 } } });
    const q = await waitFor(3);
    expect(q.result.isError).toBe(false);
    expect(q.result.content[0].text).toContain("testid=checkout");
    send({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "pagesnap_validate", arguments: { session: dir, spec: SPEC } } });
    const v = await waitFor(4);
    expect(v.result.isError).toBe(true); // the fixture spec has invented locators
    expect(v.result.content[0].text).toContain("MISS");
    send({ jsonrpc: "2.0", id: 5, method: "nope" });
    expect((await waitFor(5)).error.code).toBe(-32601);
    child.kill();
  }, 30000);
});

describe("bench", () => {
  it("measures every approach on the same session", async () => {
    const { bench, benchTmpCopy } = await import("../src/pack/bench.js");
    const r = await bench(benchTmpCopy(FIXTURE), "saucedemo");
    const by = Object.fromEntries(r.rows.map((x) => [x.approach, x.tokens]));
    expect(r.steps).toBe(4);
    expect(by["compact lean (all steps)"]).toBeLessThan(by["raw YAML (all steps)"] * 0.3);
    expect(by["query --diff per step"]).toBeLessThanOrEqual(by["query per step"]);
    expect(r.rows.some((x) => x.approach.startsWith("Playwright ariaSnapshot"))).toBe(true);
    expect(r.markdown).toContain("| Approach |");
  });
});
