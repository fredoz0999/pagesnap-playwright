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
const INVENTORY = "02_www_saucedemo_com_inventory_html.yaml";

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
    const raw = ["01_www_saucedemo_com.yaml", INVENTORY, "03_www_saucedemo_com_inventory_html.yaml", "04_www_saucedemo_com_cart_html.yaml"]
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
    expect(byLine.get(15)).toBe("unverified"); // #checkout not kept in lean capture
    expect(byLine.get(16)).toBe("missing");  // invented testid
    expect(byLine.get(17)).toBe("missing");  // page never captured
    expect(byLine.get(18)).toBe("unverified"); // template string
    expect(rep.testIdAttrs).toEqual(["data-test"]);
    expect(rep.text).toContain("testIdAttribute");
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
    ]);
    const copilot = readFileSync(path.join(repo, ".github/prompts/pagesnap-automate.prompt.md"), "utf8");
    expect(copilot.startsWith("---\nmode: agent\n")).toBe(true);
    expect(copilot).toContain("${input:session:");
    const claude = readFileSync(path.join(repo, ".claude/commands/pagesnap-automate.md"), "utf8");
    expect(claude).toContain('PACK query "$1"');
    expect(claude).toContain("tests/$2.spec.ts");
  });
});
