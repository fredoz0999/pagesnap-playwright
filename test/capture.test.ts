import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SnapshotCapture, printUsage } from "../src/capture.js";
import { persistSnapshot, stripUrlLines } from "../src/snapshot-write.js";
import { readFile } from "node:fs/promises";

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
