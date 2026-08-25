/** Compact walkthrough log: actions are the story, YAML is the checkpoint. */

export type ActionKind =
  | "click"
  | "fill"
  | "check"
  | "uncheck"
  | "select"
  | "submit"
  | "nav"
  | "goto"
  | "snapshot";

export interface ActionRec {
  kind: ActionKind;
  by?: string;
  value?: string;
  name?: string;
  /** Typed / selected value (passwords already redacted). */
  text?: string;
  url?: string;
  file?: string;
  note?: string;
  password?: boolean;
}

const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function formatLocator(rec: Pick<ActionRec, "by" | "value" | "name">): string {
  if (!rec.by || rec.value == null || String(rec.value).trim() === "") return "";
  if (rec.by === "role" && rec.name) {
    return "role=" + rec.value + " name=\"" + String(rec.name).replace(/"/g, '\\"') + "\"";
  }
  return rec.by + "=" + rec.value;
}

export function formatActionLine(n: number, rec: ActionRec): string {
  const loc = formatLocator(rec);
  const kind = rec.kind.padEnd(8);
  switch (rec.kind) {
    case "fill":
    case "select":
      return n + ". " + kind + loc + "  " + JSON.stringify(rec.text ?? "");
    case "snapshot": {
      const note = rec.note && rec.note.trim() ? "  " + rec.note.replace(/\n/g, " ") : "";
      return n + ". snapshot " + (rec.file ?? "") + note;
    }
    case "nav":
    case "goto":
      return n + ". " + kind + (rec.url ?? "");
    default:
      return (n + ". " + kind + loc).trimEnd();
  }
}

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

export function redactActionText(rec: ActionRec, redactEmails: boolean): ActionRec {
  const out: ActionRec = { ...rec };
  if (out.password || (out.by === "css" && /type=["']password["']/i.test(out.value || ""))) {
    out.text = "***";
  }
  if (redactEmails && out.text) out.text = out.text.replace(EMAIL, "***@***.***");
  return out;
}

export function isStructuredNote(note: string): boolean {
  if (!note) return false;
  return /(?:^|\s)(action|assert|data):/i.test(note);
}
