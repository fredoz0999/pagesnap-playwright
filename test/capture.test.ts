import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SnapshotCapture, printUsage } from "../src/capture.js";
import { persistSnapshot, stripUrlLines } from "../src/snapshot-write.js";
import { buildPromptMd, buildReadingSnapshotsMd } from "../src/prompt.js";
import { writePromptPack } from "../src/session-pack.js";
import { DUP_WINDOW_MS, isDuplicateCapture, normalizeNote } from "../src/util-parse.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function writeConfig(body: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ps-config-"));
  const file = path.join(dir, "capture.config.properties");
  await writeFile(file, body, "utf8");
  return file;
}

describe("argument / config precedence", () => {
  it("flag beats config file whatever the order", async () => {
    const cfg = await writeConfig("goal=from file\nmaxTableRows=99\n");

    const first = new SnapshotCapture();
    first.parseArgs(["https://app.test", "--goal=from flag", "--config=" + cfg]);
    expect(first.goal).toBe("from flag");
    expect(first.maxTableRows).toBe(99);

    const second = new SnapshotCapture();
    second.parseArgs(["https://app.test", "--config=" + cfg, "--goal=from flag"]);
    expect(second.goal).toBe("from flag");
  });

  it("config file supplies what no flag sets", async () => {
    const cfg = await writeConfig("goal=from file\nmaxTableRows=7\n");
    const c = new SnapshotCapture();
    c.parseArgs(["https://app.test", "--config=" + cfg]);
    expect(c.goal).toBe("from file");
    expect(c.maxTableRows).toBe(7);
  });

  it("bad max-table-rows falls back instead of crashing", () => {
    const c = new SnapshotCapture();
    c.parseArgs(["https://app.test", "--max-table-rows=abc"]);
    expect(c.maxTableRows).toBe(3);
  });

  it("bad maxTableRows in config falls back", async () => {
    const cfg = await writeConfig("maxTableRows=not-a-number\n");
    const c = new SnapshotCapture();
    c.parseArgs(["https://app.test", "--config=" + cfg]);
    expect(c.maxTableRows).toBe(3);
  });
});

describe("timezone", () => {
  it("session timestamp follows the configured timezone", () => {
    const noon = new Date("2026-07-27T16:30:45Z");
    expect(SnapshotCapture.sessionFolderTs(noon, "UTC")).toBe("2026-07-27T16-30-45");
    expect(SnapshotCapture.sessionFolderTs(noon, "America/New_York")).toBe("2026-07-27T12-30-45");
    expect(SnapshotCapture.sessionFolderTs(noon, "Asia/Tokyo")).toBe("2026-07-28T01-30-45");
  });

  it("unknown timezone falls back to New York", () => {
    const noon = new Date("2026-07-27T16:30:45Z");
    expect(SnapshotCapture.sessionFolderTs(noon, "Not/AZone")).toBe("2026-07-27T12-30-45");
  });

  it("timezone comes from flag and config", async () => {
    const flagged = new SnapshotCapture();
    flagged.parseArgs(["https://app.test", "--timezone=UTC"]);
    expect(flagged.timezone).toBe("UTC");

    const cfg = await writeConfig("timezone=Europe/Berlin\n");
    const configured = new SnapshotCapture();
    configured.parseArgs(["https://app.test", "--config=" + cfg]);
    expect(configured.timezone).toBe("Europe/Berlin");

    expect(new SnapshotCapture().timezone).toBe("America/New_York");
  });
});

describe("cookie parsing", () => {
  it("reads a Selenium-style cookie array", () => {
    const raw =
      '[{"name":"JSESSIONID","value":"abc123","domain":"bank.test","secure":true},' +
      '{"name":"theme","value":"dark","expiry":1893456000}]';
    const cookies = SnapshotCapture.parseCookieJson(raw);
    expect(cookies).toHaveLength(2);
    expect(cookies[0].value).toBe("abc123");
    expect(cookies[0].secure).toBe("true");
    expect(cookies[1].expiry).toBe("1893456000");
  });

  it("keeps cookies that carry nested objects", () => {
    const raw =
      '[{"name":"session","value":"v1","meta":{"issuedBy":"sso"}},' +
      '{"name":"after","value":"v2"}]';
    const cookies = SnapshotCapture.parseCookieJson(raw);
    expect(cookies.map((c) => c.name)).toEqual(["session", "after"]);
    expect(cookies[0].value).toBe("v1");
  });

  it("keeps braces inside a cookie value", () => {
    const raw = '[{"name":"payload","value":"{\\"a\\":1}"}]';
    const cookies = SnapshotCapture.parseCookieJson(raw);
    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe('{"a":1}');
  });

  it("ignores entries without a name", () => {
    const raw = '[{"value":"orphan"},{"name":"ok","value":"v"}]';
    const cookies = SnapshotCapture.parseCookieJson(raw);
    expect(cookies.map((c) => c.name)).toEqual(["ok"]);
  });
});

describe("diffing", () => {
  it("reports added and removed lines", () => {
    const out = SnapshotCapture.simpleDiff(
      '- button "Save"\n- textbox "Email"',
      '- button "Save"\n- link "Help"'
    );
    expect(out).toContain("## Added");
    expect(out).toContain('+ - link "Help"');
    expect(out).toContain("## Removed");
    expect(out).toContain('- - textbox "Email"');
  });

  it("says so when nothing changed", () => {
    expect(SnapshotCapture.simpleDiff('- button "Save"', '- button "Save"')).toContain(
      "_No structural line changes detected._"
    );
  });

  it("counts repeated lines instead of collapsing them", () => {
    const before = '- listitem "Item"';
    const after = '- listitem "Item"\n- listitem "Item"\n- listitem "Item"';
    const added = SnapshotCapture.simpleDiff(before, after)
      .split("\n")
      .filter((l) => l === '+ - listitem "Item"').length;
    expect(added).toBe(2);
  });

  it("reports rows dropping out of a repeated list", () => {
    const before = '- row "a"\n- row "a"\n- row "a"';
    const removed = SnapshotCapture.simpleDiff(before, '- row "a"')
      .split("\n")
      .filter((l) => l === '- - row "a"').length;
    expect(removed).toBe(2);
  });

  it("flags reordering rather than claiming nothing changed", () => {
    const out = SnapshotCapture.simpleDiff(
      '- button "One"\n- button "Two"',
      '- button "Two"\n- button "One"'
    );
    expect(out).not.toContain("_No structural line changes detected._");
    expect(out).toContain("Reordered");
  });

  it("keeps dropdown changes in their own section", () => {
    const out = SnapshotCapture.simpleDiff(
      '- combobox "State"',
      '- combobox "State"\n- option "Alaska"'
    );
    expect(out).toContain("## Dropdown / options changes");
    expect(out).toContain('+ - option "Alaska"');
  });

  it("diff header names the url each step came from", () => {
    const head = SnapshotCapture.diffHeader(1, 2, "https://app.test/login", "https://app.test/home");
    expect(head.includes("# Diff step 1 -> 2") || head.includes("# Diff step 1")).toBe(true);
    expect(head).toContain("https://app.test/login");
    expect(head).toContain("https://app.test/home");
  });

  it("diff header says when both steps shared a url", () => {
    const head = SnapshotCapture.diffHeader(2, 3, "https://app.test/x", "https://app.test/x");
    expect(head).toContain("same URL");
  });
});

describe("naming", () => {
  it("sanitizeUrl strips jsessionid and flattens the path", () => {
    expect(SnapshotCapture.sanitizeUrl("https://bank.test/app;jsessionid=ABC123/index.htm")).toBe(
      "bank.test_app_index.htm"
    );
    expect(SnapshotCapture.sanitizeUrl("https://bank.test/")).toBe("bank.test_root");
  });

  it("alert tree nodes diff as ordinary added lines", () => {
    const before = '- textbox "Email"';
    const after = '- textbox "Email" [invalid]\n- alert "Email is required."';
    const out = SnapshotCapture.simpleDiff(before, after);
    expect(out).toContain("## Added");
    expect(out).toContain('+ - alert "Email is required."');
  });
});

describe("cookies/storage parse round-trip", () => {
  it("round-trips simple cookies JSON", () => {
    const raw =
      '[{"name":"JSESSIONID","value":"abc123","domain":"bank.test","path":"/","secure":true,"httpOnly":false,"expiry":1893456000}]';
    const cookies = SnapshotCapture.parseCookieJson(raw);
    const json = SnapshotCapture.serializeCookies(cookies);
    const again = SnapshotCapture.parseCookieJson(json);
    expect(again[0].name).toBe("JSESSIONID");
    expect(again[0].value).toBe("abc123");
    expect(again[0].secure).toBe("true");
    expect(again[0].expiry).toBe("1893456000");
  });

  it("round-trips storageState JSON", () => {
    const storage = {
      cookies: [
        {
          name: "a",
          value: "b",
          domain: "x.test",
          path: "/",
          expires: 1893456000,
          httpOnly: true,
          secure: true,
          sameSite: "Lax" as const,
        },
      ],
      origins: [{ origin: "https://x.test", localStorage: [{ name: "k", value: "v" }] }],
    };
    const raw = JSON.stringify(storage);
    const parsed = SnapshotCapture.parseStorageState(raw);
    const round = JSON.parse(SnapshotCapture.serializeStorageState(parsed));
    expect(round.cookies[0].name).toBe("a");
    expect(round.origins[0].origin).toBe("https://x.test");
    expect(round.origins[0].localStorage[0].value).toBe("v");
  });
});

describe("lean defaults", () => {
  it("parses lean defaults", () => {
    const c = new SnapshotCapture();
    c.parseArgs(["https://app.test"]);
    expect(c.lean).toBe(true);
    expect(c.noUrls).toBe(true);
    expect(c.includeHints).toBe(false);
    expect(c.maxTableRows).toBe(3);
  });

  it("full flips lean knobs back", () => {
    const c = new SnapshotCapture();
    c.parseArgs(["https://app.test", "--full"]);
    expect(c.lean).toBe(false);
    expect(c.noUrls).toBe(false);
    expect(c.includeHints).toBe(true);
    expect(c.maxTableRows).toBe(5);
  });

  it("lean flag still works after full", () => {
    const c = new SnapshotCapture();
    c.parseArgs(["https://app.test", "--full", "--lean"]);
    expect(c.lean).toBe(true);
    expect(c.noUrls).toBe(true);
    expect(c.includeHints).toBe(false);
    expect(c.maxTableRows).toBe(3);
  });
});

describe("no-urls", () => {
  it("no-urls flag beats config", async () => {
    const cfg = await writeConfig("noUrls=false\n");
    const flagged = new SnapshotCapture();
    flagged.parseArgs(["https://app.test", "--config=" + cfg, "--no-urls"]);
    expect(flagged.noUrls).toBe(true);

    const fromFile = new SnapshotCapture();
    fromFile.parseArgs(["https://app.test", "--config=" + cfg]);
    expect(fromFile.noUrls).toBe(false);
  });

  it("urls flag keeps url dumps", () => {
    const c = new SnapshotCapture();
    c.parseArgs(["https://app.test", "--urls"]);
    expect(c.noUrls).toBe(false);
  });

});

describe("usage", () => {
  it("printUsage does not throw and mentions --framework", () => {
    expect(() => printUsage()).not.toThrow();
    const s = printUsage();
    expect(s).toContain("--framework");
    expect(s).not.toContain("steps.md");
    expect(s).not.toContain("auto-record");
  });
});

describe("snapshot notes", () => {

  it("strips /url: lines", () => {
    const tree = "- link \"Home\":\n  - /url: https://app.test/\n- button \"Go\"";
    const out = stripUrlLines(tree);
    expect(out).not.toContain("/url:");
    expect(out).toContain("- button \"Go\"");
  });

  it("stores a structured note on the step", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ps-snap-"));
    const cap = new SnapshotCapture();
    cap.sessionDir = dir;
    cap.writeDiff = false;
    cap.includeHints = false;
    const steps: { n: number; file: string; url: string; note: string; capturedAt: string }[] = [];
    persistSnapshot(cap, steps, {
      url: "https://app.test/register",
      note: "action: click Register",
      tree: "- button \"Register\"\n  - /url: https://app.test/x",
      hints: [],
      hintsTruncated: 0,
      lastTreeBody: "",
      lastCaptureUrl: "",
      step: 1,
      title: "Register",
      viewport: { w: 1280, h: 720 },
    });
    expect(steps[0].note).toBe("action: click Register");
    const yaml = await readFile(path.join(dir, steps[0].file), "utf8");
    expect(yaml).toContain("# Note: action: click Register");
    expect(yaml).toContain("# Title: Register");
    expect(yaml).toContain("# Viewport: 1280x720");
    expect(yaml).not.toContain("/url:");
  });
});


describe("locator scores", () => {
  const treeJs = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/injected/capture-tree.js");

  async function loadScoreHelpers(): Promise<{
    SCORE: Record<string, number>;
    locatorScore: (by: string, matches?: number) => number;
    stampScore: (loc: { by: string; matches?: number; score?: number }) => { by: string; matches?: number; score: number };
  }> {
    const src = await readFile(treeJs, "utf8");
    const start = src.indexOf("const SCORE = {");
    const end = src.indexOf("const repairLocator");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const helpers = src.slice(start, end);
    return new Function(helpers + "; return { SCORE, locatorScore, stampScore };")();
  }

  it("SCORE map matches LocatorLabs-style PageSnap by values", async () => {
    const { SCORE, locatorScore, stampScore } = await loadScoreHelpers();
    expect(SCORE).toEqual({
      testid: 98,
      role: 95,
      label: 90,
      id: 90,
      name: 88,
      placeholder: 85,
      linkText: 75,
      css: 60,
      xpath: 40,
    });
    expect(locatorScore("testid")).toBe(98);
    expect(locatorScore("role")).toBe(95);
    expect(locatorScore("css")).toBe(60);
    expect(locatorScore("xpath")).toBe(40);
    expect(stampScore({ by: "id" }).score).toBe(90);
  });

  it("caps score at 40 when matches is present without raising xpath", async () => {
    const { locatorScore } = await loadScoreHelpers();
    expect(locatorScore("testid", 3)).toBe(40);
    expect(locatorScore("css", 2)).toBe(40);
    expect(locatorScore("xpath", 5)).toBe(40);
    expect(locatorScore("xpath")).toBe(40);
  });

  it("YAML emit puts score after stability and before matches", async () => {
    const src = await readFile(treeJs, "utf8");
    const emit = src.slice(src.indexOf("locators:"), src.indexOf("Structured hint"));
    const attr = emit.indexOf(", attr:");
    const stab = emit.indexOf(", stability: ");
    const score = emit.indexOf(", score: ");
    const matches = emit.indexOf(", matches: ");
    expect(attr).toBeGreaterThan(-1);
    expect(stab).toBeGreaterThan(attr);
    expect(score).toBeGreaterThan(stab);
    expect(matches).toBeGreaterThan(score);
  });

  it("PROMPT tells the LLM to prefer higher score", () => {
    const pw = buildPromptMd({
      generated: "now",
      startUrl: "https://app.test",
      framework: "playwright",
      style: "pageobject",
      waits: "web-first",
      goal: "",
    });
    expect(pw).toContain("Prefer higher `score`");
    expect(pw).toContain("Never use score <= 40 unless nothing else exists");
    const selenium = buildPromptMd({
      generated: "now",
      startUrl: "https://app.test",
      framework: "selenium",
      style: "pageobject",
      waits: "explicit",
      goal: "",
    });
    expect(selenium).toContain("Prefer higher `score`");
    expect(selenium).toContain("Never use score <= 40 unless nothing else exists");
  });

  it("Reading-Snapshots documents the score table once", () => {
    const md = buildReadingSnapshotsMd("playwright", "pageobject", "web-first");
    const table =
      "testid 98, role 95, label 90, id 90, name 88, placeholder 85, linkText 75, css 60, xpath 40";
    expect(md).toContain(table);
    expect(md.split(table).length - 1).toBe(1);
    expect(md).toContain("Prefer higher score; never use score <= 40 unless nothing else exists");
    expect(md).toContain("score capped at 40");
    expect(md).toContain("by + optional attr + stability + score");
  });

  it("repo Reading-Snapshots.md matches builder for playwright/pageobject/web-first", async () => {
    const repo = await readFile(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "../Reading-Snapshots.md"),
      "utf8"
    );
    expect(repo).toBe(buildReadingSnapshotsMd("playwright", "pageobject", "web-first"));
  });
});

describe("session pack TEST_GUIDE / SESSION", () => {
  it("writePromptPack writes TEST_GUIDE.md and SESSION.md", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ps-pack-"));
    const cap = new SnapshotCapture();
    cap.sessionDir = dir;
    cap.sessionStartUrl = "https://www.saucedemo.com";
    cap.goal = "Add backpack to cart";
    cap.framework = "playwright";
    cap.style = "pageobject";
    cap.waits = "web-first";
    writePromptPack(cap, new Date("2026-08-25T16:00:00Z"));
    const guide = await readFile(path.join(dir, "TEST_GUIDE.md"), "utf8");
    const session = await readFile(path.join(dir, "SESSION.md"), "utf8");
    expect(guide).toContain("getByTestId");
    expect(guide).toContain("data-test");
    expect(guide).toContain('Never `getByRole("generic")`');
    expect(guide).toContain("SESSION.md");
    expect(guide).toContain("flow.md");
    expect(guide).toContain("selectOption");
    expect(guide).toContain("frameLocator");
    expect(session).toContain("# PageSnap session");
    expect(session).toContain("https://www.saucedemo.com");
    expect(session).toContain("Add backpack to cart");
    expect(session).toContain("playwright");
    expect(session).toContain("pageobject");
    expect(session).toContain("2026-08-25T16:00:00Z");
    expect(session).toContain("Steps: see flow.md (updated as you capture)");
    expect(session).toContain("Read order:");
    expect(await readFile(path.join(dir, "PROMPT.md"), "utf8")).toContain("TEST_GUIDE.md");
    expect(await readFile(path.join(dir, "Reading-Snapshots.md"), "utf8")).toContain("SESSION.md");
  });

  it("Prompt and Reading mention data-test → getByTestId, TEST_GUIDE.md, SESSION.md", () => {
    const pw = buildPromptMd({
      generated: "now",
      startUrl: "https://www.saucedemo.com",
      framework: "playwright",
      style: "pageobject",
      waits: "web-first",
      goal: "checkout",
    });
    expect(pw).toContain("TEST_GUIDE.md");
    expect(pw).toContain("SESSION.md");
    expect(pw).toContain("data-test");
    expect(pw).toContain("getByTestId");
    expect(pw).toContain("attr");
    expect(pw).toContain("Do not invent");
    expect(pw).toContain("goto");
    const md = buildReadingSnapshotsMd("playwright", "pageobject", "web-first");
    expect(md).toContain("TEST_GUIDE.md");
    expect(md).toContain("SESSION.md");
    expect(md).toContain("data-test");
    expect(md).toContain("getByTestId");
    expect(md).toContain('Never `getByRole("generic")`');
  });
});

describe("capture-tree locator ranking", () => {
  const treeJs = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/injected/capture-tree.js");

  it("collects role candidates even when a testid exists", async () => {
    const src = await readFile(treeJs, "utf8");
    const body = src.slice(src.indexOf("const buildLocators"), src.indexOf("const readValue"));
    const roleIf = body.slice(body.indexOf("roleForPw"), body.indexOf("push('role'"));
    expect(roleIf).toContain("ACTIONABLE.has(roleForPw)");
    expect(roleIf).not.toContain("!hasId && !hasTestId");
    expect(roleIf).toContain("roleForPw !== 'generic'");
    expect(body).not.toContain("if (lean && cand.stability !== 'low') break");
  });

  it("emit includes attr on non-default testid locators", async () => {
    const src = await readFile(treeJs, "utf8");
    const emit = src.slice(src.indexOf("locators:"), src.indexOf("Structured hint"));
    expect(emit).toContain("l.by === 'testid'");
    expect(emit).toContain("l.attr !== 'data-testid'");
    expect(emit).toContain(", attr: ");
  });

  it("picks locators sorted by score descending then stability then byRank", async () => {
    const src = await readFile(treeJs, "utf8");
    const body = src.slice(src.indexOf("const buildLocators"), src.indexOf("const readValue"));
    expect(body).toContain("b.score - a.score");
    expect(body).toContain("testid: 0, role: 1, label: 2, id: 3, name: 4");
  });
});

describe("normalizeNote", () => {
  it("inserts a space before a glued action/assert/data prefix", () => {
    expect(normalizeNote("assert: cart badge is 2action: sort Price low to high")).toBe(
      "assert: cart badge is 2 action: sort Price low to high",
    );
    expect(normalizeNote("data: firstName=Janeaction: click Continue")).toBe(
      "data: firstName=Jane action: click Continue",
    );
  });

  it("still collapses action: action: and doubled paste", () => {
    expect(normalizeNote("action: action: click Login")).toBe("action: click Login");
    expect(normalizeNote("hellohello")).toBe("hello");
  });
});

describe("isDuplicateCapture", () => {
  const last = { at: 1000, url: "https://www.saucedemo.com/checkout-step-one.html", note: "data: firstName=Jane" };
  it("skips same url+note inside the window", () => {
    expect(isDuplicateCapture(last, 1000 + DUP_WINDOW_MS - 1, last.url, last.note)).toBe(true);
  });
  it("allows the same page after the window or with a new note", () => {
    expect(isDuplicateCapture(last, 1000 + DUP_WINDOW_MS, last.url, last.note)).toBe(false);
    expect(isDuplicateCapture(last, 1100, last.url, "data: firstName=Jane lastName=Doe")).toBe(false);
  });
});
