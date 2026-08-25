import fs from "node:fs";
import path from "node:path";
import { buildPromptMd, buildReadingSnapshotsMd } from "./prompt.js";
import type { SnapshotCapture } from "./capture.js";
import { formatActionLine, type ActionRec } from "./action-log.js";

export interface StepRecord {
  n: number;
  file: string;
  url: string;
  note: string;
  capturedAt: string;
}

export function isoNow(d = new Date()): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function writePromptPack(cap: SnapshotCapture, sessionStart: Date): void {
  const reading = buildReadingSnapshotsMd(cap.framework, cap.style, cap.waits, cap.lean);
  fs.writeFileSync(path.join(cap.sessionDir, "Reading-Snapshots.md"), reading, "utf8");
  const prompt = buildPromptMd({
    generated: isoNow(sessionStart),
    startUrl: cap.sessionStartUrl,
    framework: cap.framework,
    style: cap.style,
    waits: cap.waits,
    goal: cap.goal,
    ariaWritten: cap.ariaFiles.length > 0,
    lean: cap.lean,
  });
  fs.writeFileSync(path.join(cap.sessionDir, "PROMPT.md"), prompt, "utf8");
}

export function refreshFlow(cap: SnapshotCapture, steps: StepRecord[], writeDiff: boolean): void {
  const sb: string[] = [];
  sb.push("# Capture session flow");
  sb.push("");
  sb.push("- Updated: " + isoNow());
  sb.push("- Start URL: " + cap.sessionStartUrl);
  if (cap.goal) sb.push("- Goal: " + cap.goal);
  sb.push("- Checkpoints captured: " + steps.length);
  sb.push("- Action log: `steps.md` (every click/fill/nav; YAML is a checkpoint)");
  sb.push("");
  sb.push("## Steps");
  sb.push("");
  if (steps.length === 0) {
    sb.push("_No steps captured yet._");
    sb.push("");
  } else {
    for (const s of steps) {
      sb.push("### " + s.n + ". " + (s.note && s.note.trim() ? s.note : "Capture"));
      sb.push("- File: `" + s.file + "`");
      sb.push("- URL: " + s.url);
      sb.push("- Captured: " + s.capturedAt);
      const diffName = String(s.n).padStart(2, "0") + "_diff.md";
      if (writeDiff && s.n > 1 && fs.existsSync(path.join(cap.sessionDir, diffName))) {
        sb.push("- Diff vs previous: `" + diffName + "`");
      }
      sb.push("");
    }
  }
  fs.writeFileSync(path.join(cap.sessionDir, "flow.md"), sb.join("\n"), "utf8");
}

export function writeStepsMd(cap: SnapshotCapture, actions: ActionRec[]): void {
  const sb: string[] = [];
  sb.push("# steps");
  sb.push("");
  sb.push("Every recorded action in order. YAML files are checkpoints, not the whole walkthrough.");
  sb.push("Treat action: / assert: / data: prefixes in notes as intended act / assertion / typed values.");
  sb.push("");
  if (actions.length === 0) {
    sb.push("_No actions yet._");
    sb.push("");
  } else {
    for (let i = 0; i < actions.length; i++) {
      sb.push(formatActionLine(i + 1, actions[i]));
    }
    sb.push("");
  }
  fs.writeFileSync(path.join(cap.sessionDir, "steps.md"), sb.join("\n"), "utf8");
}
