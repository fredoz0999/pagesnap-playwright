import path from "node:path";
import { parseCookieJson, serializeCookies, parseStorageState, serializeStorageState } from "./cookies.js";
import { simpleDiff, diffHeader } from "./diff.js";
import { DEFAULT_TIMEZONE, sanitizeUrl, sessionFolderTs } from "./session.js";
import fs from "node:fs";
import { emptyToNull, normalizeToolbarPosition, parseBool, parseIntOr, parseProperties } from "./util-parse.js";

export class SnapshotCapture {
  maxTableRows = 3;
  framework = "playwright";
  style = "pageobject";
  waits = "web-first";
  goal = "";
  timezone = DEFAULT_TIMEZONE;
  outputRoot = path.resolve("pageSnapshots");
  sessionSubdir = true;
  includeHints = false;
  redactPasswords = true;
  redactEmails = true;
  writeDiff = true;
  headless = false;
  connectUrl: string | null = null;
  attached = false;
  sessionDir = "";
  sessionStartUrl = "";
  loadCookiesPath: string | null = null;
  saveCookiesPath: string | null = null;
  loadStoragePath: string | null = null;
  saveStoragePath: string | null = null;
  toolbarPosition = "right";
  lean = true;
  noUrls = true;

  static sessionFolderTs = sessionFolderTs;
  static parseCookieJson = parseCookieJson;
  static serializeCookies = serializeCookies;
  static parseStorageState = parseStorageState;
  static serializeStorageState = serializeStorageState;
  static simpleDiff = simpleDiff;
  static diffHeader = diffHeader;
  static sanitizeUrl = sanitizeUrl;

  applyLean(): void {
    this.lean = true;
    this.includeHints = false;
    this.noUrls = true;
    this.maxTableRows = 3;
  }

  applyFull(): void {
    this.lean = false;
    this.includeHints = true;
    this.noUrls = false;
    if (this.maxTableRows < 5) this.maxTableRows = 5;
  }

  parseArgs(args: string[]): string {
    let startUrl = "";
    const flags: string[] = [];
    for (const a of args) {
      if (!a.startsWith("--") && !startUrl) startUrl = a;
      else flags.push(a);
    }
    for (const a of flags) {
      if (a.startsWith("--config=")) this.loadConfigFile(a.slice("--config=".length));
    }
    for (const a of flags) this.applyFlag(a);
    return startUrl;
  }

  applyFlag(a: string): void {
    const cut = (prefix: string) => a.slice(prefix.length);
    if (a.startsWith("--config=")) return;
    if (a.startsWith("--goal=")) this.goal = cut("--goal=");
    else if (a.startsWith("--max-table-rows=")) this.maxTableRows = parseIntOr(cut("--max-table-rows="), this.maxTableRows, "--max-table-rows");
    else if (a.startsWith("--timezone=")) this.setTimezone(cut("--timezone="));
    else if (a === "--no-hints") this.includeHints = false;
    else if (a === "--no-redact") { this.redactPasswords = false; this.redactEmails = false; }
    else if (a === "--no-diff") this.writeDiff = false;
    else if (a === "--flat") this.sessionSubdir = false;
    else if (a.startsWith("--output=")) this.outputRoot = path.resolve(cut("--output="));
    else if (a.startsWith("--framework=")) this.framework = cut("--framework=");
    else if (a.startsWith("--style=")) this.style = cut("--style=");
    else if (a.startsWith("--waits=")) this.waits = cut("--waits=");
    else if (a.startsWith("--toolbar-position=")) this.toolbarPosition = normalizeToolbarPosition(cut("--toolbar-position="));
    else if (a === "--toolbar-left") this.toolbarPosition = "left";
    else if (a === "--toolbar-middle" || a === "--toolbar-center") this.toolbarPosition = "middle";
    else if (a === "--toolbar-right") this.toolbarPosition = "right";
    else if (a.startsWith("--load-cookies=")) this.loadCookiesPath = cut("--load-cookies=");
    else if (a.startsWith("--save-cookies=")) this.saveCookiesPath = cut("--save-cookies=");
    else if (a.startsWith("--load-storage=")) this.loadStoragePath = cut("--load-storage=");
    else if (a.startsWith("--save-storage=")) this.saveStoragePath = cut("--save-storage=");
    else if (a === "--no-urls") this.noUrls = true;
    else if (a === "--urls") this.noUrls = false;
    else if (a === "--lean") this.applyLean();
    else if (a === "--full") this.applyFull();
    else if (a === "--hints") this.includeHints = true;
    else this.applyExtraFlag(a, cut);
  }

  applyExtraFlag(a: string, cut: (prefix: string) => string): void {
    if (a === "--headless") { this.headless = true; return; }
    if (a.startsWith("--connect=")) { this.connectUrl = cut("--connect="); return; }
    if (a.startsWith("--cdp=")) { this.connectUrl = cut("--cdp="); return; }
    console.error("Unknown option: " + a);
  }

  loadConfigFile(filePath: string): void {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return;
    let raw: string;
    try { raw = fs.readFileSync(resolved, "utf8"); }
    catch (e) {
      console.error("Could not read config " + resolved + ":", e instanceof Error ? e.message : e);
      return;
    }
    console.log("Loaded config: " + resolved);
    const props = parseProperties(raw);
    if ("lean" in props) {
      if (parseBool(props.lean)) this.applyLean();
      else this.applyFull();
    }
    if ("noUrls" in props) this.noUrls = parseBool(props.noUrls);
    if ("outputDir" in props) this.outputRoot = path.resolve(props.outputDir);
    if ("sessionSubdir" in props) this.sessionSubdir = parseBool(props.sessionSubdir);
    if ("includeHints" in props) this.includeHints = parseBool(props.includeHints);
    if ("redactPasswords" in props) this.redactPasswords = parseBool(props.redactPasswords);
    if ("redactEmails" in props) this.redactEmails = parseBool(props.redactEmails);
    if ("writeDiff" in props) this.writeDiff = parseBool(props.writeDiff);
    if ("maxTableRows" in props) this.maxTableRows = parseIntOr(props.maxTableRows, this.maxTableRows, "maxTableRows");
    if ("framework" in props) this.framework = props.framework.trim();
    if ("style" in props) this.style = props.style.trim();
    if ("waits" in props) this.waits = props.waits.trim();
    if ("goal" in props) this.goal = props.goal;
    if ("loadCookies" in props) this.loadCookiesPath = emptyToNull(props.loadCookies);
    if ("saveCookies" in props) this.saveCookiesPath = emptyToNull(props.saveCookies);
    if ("loadStorage" in props) this.loadStoragePath = emptyToNull(props.loadStorage);
    if ("saveStorage" in props) this.saveStoragePath = emptyToNull(props.saveStorage);
    if ("toolbarPosition" in props) this.toolbarPosition = normalizeToolbarPosition(props.toolbarPosition);
    if ("timezone" in props) this.setTimezone(props.timezone);
    if ("headless" in props) this.headless = parseBool(props.headless);
    if ("connect" in props) this.connectUrl = emptyToNull(props.connect);
    if ("cdp" in props) this.connectUrl = emptyToNull(props.cdp) ?? this.connectUrl;
  }

  setTimezone(value: string): void {
    const tz = value.trim();
    if (!tz) return;
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
      this.timezone = tz;
    } catch {
      console.error("Unknown timezone \"" + tz + "\" - using " + this.timezone);
    }
  }

  async run(args: string[]): Promise<void> {
    const mod = await import("./runtime.js");
    await mod.runCapture(this, args);
  }
}

export { printUsage } from "./usage.js";
