/**
 * Scripted capture: take PageSnap snapshots from your own Playwright code
 * (CI, smoke runs, regenerating fixtures) instead of walking the app by hand.
 *
 *   const snap = new ScriptedSession({ outputDir: "pageSnapshots/parabank", goal: "Open account" });
 *   await page.goto(url);
 *   await snap.capture(page, "action: log in | assert: Accounts Overview");
 *   ...
 *   await snap.finish();          // flow.md, prompts, lean/ pack
 *
 * Output is identical to a manual Ctrl+M session.
 */
import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright";
import { SnapshotCapture } from "./capture.js";
import { evalNamed, loadInjected } from "./eval-scripts.js";
import type { HintRec } from "./hints.js";
import { buildIndex, type SessionIndex } from "./pack/index.js";
import { refreshFlow, writePromptPack, type StepRecord } from "./session-pack.js";
import { persistSnapshot, type AltLocator } from "./snapshot-write.js";
import { checkRoleLocators } from "./role-check.js";

export interface ScriptedOptions {
  /** session folder to write into (created; existing NN_* files are kept) */
  outputDir: string;
  goal?: string;
  framework?: string;
  style?: string;
  /** extra CLI-style flags, e.g. ["--full"] */
  flags?: string[];
  /** build lean/ on finish (default true) */
  buildPack?: boolean;
  /** also save Playwright's ariaSnapshot as NN_<host>.aria.txt (for `pack bench`) */
  saveAria?: boolean;
}

export class ScriptedSession {
  readonly cap: SnapshotCapture;
  private steps: StepRecord[] = [];
  private lastTreeBody = "";
  private lastCaptureUrl = "";
  private step = 0;
  private readonly treeJs = loadInjected("capture-tree.js");
  private readonly started = new Date();
  private packed = false;

  constructor(private opts: ScriptedOptions) {
    const cap = new SnapshotCapture();
    const flags = [...(opts.flags ?? [])];
    if (opts.goal) flags.push("--goal=" + opts.goal);
    if (opts.framework) flags.push("--framework=" + opts.framework);
    if (opts.style) flags.push("--style=" + opts.style);
    cap.parseArgs(["about:blank", ...flags]);
    cap.sessionDir = path.resolve(opts.outputDir);
    cap.sessionStartUrl = "";
    this.cap = cap;
    fs.mkdirSync(cap.sessionDir, { recursive: true });
  }

  get dir(): string {
    return this.cap.sessionDir;
  }

  /** Capture the current page state as the next step. Returns the YAML file name. */
  async capture(page: Page, note = ""): Promise<string> {
    const cap = this.cap;
    const url = page.url();
    if (!cap.sessionStartUrl) {
      cap.sessionStartUrl = url;
      writePromptPack(cap, this.started);
    }
    const result = await evalNamed<{ tree?: string; hints?: HintRec[]; hintsTruncated?: number; locators?: AltLocator[] }>(
      page,
      ["opts"],
      this.treeJs,
      [{ maxTableRows: cap.maxTableRows, redactPasswords: cap.redactPasswords, redactEmails: cap.redactEmails, lean: cap.lean, includeHints: cap.includeHints }]
    );
    let title = "";
    try { title = await page.title(); } catch { /* ignore */ }
    const vp = page.viewportSize();
    const checked = await checkRoleLocators(page, result?.tree ? String(result.tree) : "", Array.isArray(result?.locators) ? result.locators : []);
    this.step++;
    const saved = persistSnapshot(cap, this.steps, {
      url,
      note,
      tree: checked.tree,
      hints: Array.isArray(result?.hints) ? result.hints : [],
      hintsTruncated: Number(result?.hintsTruncated ?? 0),
      lastTreeBody: this.lastTreeBody,
      lastCaptureUrl: this.lastCaptureUrl,
      step: this.step,
      title,
      viewport: vp ? { w: vp.width, h: vp.height } : undefined,
      altLocators: checked.locators,
    });
    this.lastTreeBody = saved.lastTreeBody;
    this.lastCaptureUrl = saved.lastCaptureUrl;
    if (this.opts.saveAria) {
      const aria = await page.locator("body").ariaSnapshot().catch(() => "");
      fs.writeFileSync(path.join(cap.sessionDir, saved.filename.replace(/\.ya?ml$/i, ".aria.txt")), aria + "\n", "utf8");
    }
    return saved.filename;
  }

  /** Write flow.md and build lean/ (index, PACK.md, prompts). */
  async finish(name?: string): Promise<SessionIndex | null> {
    refreshFlow(this.cap, this.steps, this.cap.writeDiff);
    if (this.opts.buildPack === false || this.step === 0 || this.packed) return null;
    this.packed = true;
    return buildIndex(this.cap.sessionDir, { name });
  }
}
