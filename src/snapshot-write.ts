import fs from "node:fs";
import path from "node:path";
import { simpleDiff, diffHeader } from "./diff.js";
import { formatHint, hintsFooterTitle, type HintRec } from "./hints.js";
import { sanitizeUrl } from "./session.js";
import { isoNow, refreshFlow, type StepRecord } from "./session-pack.js";
import type { SnapshotCapture } from "./capture.js";

const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;


/** Strip Playwright-style `/url:` dumps and `[url=…]` attrs from YAML trees. */
export function stripUrlLines(tree: string): string {
  if (!tree) return tree;
  const kept: string[] = [];
  for (const line of tree.split(/\r?\n/)) {
    const t = line.trim();
    if (/^-?\s*\/url:/i.test(t)) continue;
    if (/^\/url:/i.test(t)) continue;
    if (!t.startsWith("#") && /^url:\s*\S/i.test(t)) continue;
    kept.push(
      line
        .replace(/\s*\[\/?url=[^\]]*\]/gi, "")
        .replace(/\s+\/url:\s*\S+/gi, "")
    );
  }
  return kept.join("\n");
}


export function persistSnapshot(
  cap: SnapshotCapture,
  steps: StepRecord[],
  state: {
    url: string;
    note: string;
    tree: string;
    hints: HintRec[];
    hintsTruncated: number;
    lastTreeBody: string;
    lastCaptureUrl: string;
    step: number;
    title?: string;
    viewport?: { w: number; h: number };
  }
): { filename: string; step: number; lastTreeBody: string; lastCaptureUrl: string } {
  let tree = state.tree;
  if (cap.noUrls) tree = stripUrlLines(tree);
  if (cap.redactEmails) tree = tree.replace(EMAIL, "***@***.***");
  if (!tree.trim()) {
    console.error("  Warning: capture script returned empty tree (null/blank).");
  }
  const now = new Date();
  const stepN = state.step;
  const filename = String(stepN).padStart(2, "0") + "_" + sanitizeUrl(state.url) + ".yaml";
  const filepath = path.join(cap.sessionDir, filename);

  const content: string[] = [];
  content.push("# URL: " + state.url);
  if (state.title && state.title.trim()) content.push("# Title: " + state.title.replace(/\n/g, " "));
  if (state.viewport) content.push("# Viewport: " + state.viewport.w + "x" + state.viewport.h);
  content.push("# Captured: " + isoNow(now));
  content.push("# Trigger: manual");
  content.push("# Step: " + stepN);
  if (state.note && state.note.trim()) content.push("# Note: " + state.note.replace(/\n/g, " "));
  if (cap.goal) content.push("# Session goal: " + cap.goal.replace(/\n/g, " "));
  content.push("");
  content.push(tree);

  if (cap.includeHints && state.hints.length) {
    content.push("");
    content.push(hintsFooterTitle(cap.framework));
    for (const h of state.hints) content.push("# " + formatHint(h, cap.framework));
    if (state.hintsTruncated > 0) {
      content.push("# ... " + state.hintsTruncated + " more hints truncated");
    }
  }

  fs.mkdirSync(cap.sessionDir, { recursive: true });
  fs.writeFileSync(filepath, content.join("\n") + "\n", "utf8");

  if (cap.writeDiff && state.lastTreeBody.trim() && tree.trim()) {
    const diff = simpleDiff(state.lastTreeBody, tree);
    if (diff.trim()) {
      const diffPath = path.join(cap.sessionDir, String(stepN).padStart(2, "0") + "_diff.md");
      fs.writeFileSync(
        diffPath,
        diffHeader(stepN - 1, stepN, state.lastCaptureUrl, state.url) + diff,
        "utf8"
      );
    }
  }

  steps.push({
    n: stepN,
    file: filename,
    url: state.url,
    note: state.note,
    capturedAt: isoNow(now),
  });
  refreshFlow(cap, steps, cap.writeDiff);

  const lines = tree ? tree.split(/\r?\n/).length : 0;
  console.log("  Saved: " + filename + (tree.trim() ? " (" + lines + " lines)" : " (EMPTY TREE)"));
  return { filename, step: stepN, lastTreeBody: tree, lastCaptureUrl: state.url };
}
