function looksLikeOptionLine(line: string): boolean {
  const l = line.toLowerCase();
  return (
    l.includes("option ") ||
    l.includes("<select>") ||
    l.includes("dropdown:") ||
    l.includes("listbox") ||
    l.includes("combobox") ||
    (l.includes("listitem") && l.includes('"'))
  );
}

/** Structural lines that take part in a diff, in document order (duplicates kept). */
function diffLines(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (
      !t.startsWith("#") ||
      t.includes("<select>") ||
      t.includes("option") ||
      t.startsWith("#   -") ||
      t.startsWith("# table") ||
      t.includes("headers:") ||
      t.includes("row ")
    ) {
      out.push(t);
    }
  }
  return out;
}

/** Header for NN_diff.md, naming the URL each side was actually captured on. */
export function diffHeader(fromStep: number, toStep: number, fromUrl: string, toUrl: string): string {
  const head = `# Diff step ${fromStep} → ${toStep}\n\n`;
  if (fromUrl && fromUrl === toUrl) {
    return head + `Both steps were captured on the same URL: ${fromUrl}\n\n`;
  }
  return (
    head +
    `- Step ${fromStep} URL: ${fromUrl || "unknown"}\n` +
    `- Step ${toStep} URL: ${toUrl || "unknown"}\n\n`
  );
}

/**
 * Count-aware line diff between consecutive trees. A line present once before
 * and three times after is two additions, not "no change".
 */
export function simpleDiff(before: string, after: string): string {
  const beforeLines = diffLines(before);
  const afterLines = diffLines(after);
  const added: string[] = [];
  const removed: string[] = [];

  const budget = new Map<string, number>();
  for (const l of beforeLines) budget.set(l, (budget.get(l) ?? 0) + 1);
  for (const l of afterLines) {
    const left = budget.get(l) ?? 0;
    if (left > 0) budget.set(l, left - 1);
    else added.push(l);
  }
  const afterBudget = new Map<string, number>();
  for (const l of afterLines) afterBudget.set(l, (afterBudget.get(l) ?? 0) + 1);
  for (const l of beforeLines) {
    const left = afterBudget.get(l) ?? 0;
    if (left > 0) afterBudget.set(l, left - 1);
    else removed.push(l);
  }

  if (added.length === 0 && removed.length === 0) {
    const same =
      beforeLines.length === afterLines.length && beforeLines.every((l, i) => l === afterLines[i]);
    if (same) {
      return "_No structural line changes detected._\n";
    }
    const moved: string[] = [];
    for (let i = 0; i < afterLines.length; i++) {
      if (i >= beforeLines.length || beforeLines[i] !== afterLines[i]) {
        moved.push(afterLines[i]);
      }
    }
    const lines = [
      "## Reordered",
      "",
      `_Same lines in a different order (${moved.length} line(s) shifted position)._`,
      "",
    ];
    for (const l of moved.slice(0, 40)) lines.push(`~ ${l}`);
    return lines.join("\n") + (moved.length ? "\n" : "");
  }

  const addedOptions = added.filter(looksLikeOptionLine).sort();
  const removedOptions = removed.filter(looksLikeOptionLine).sort();
  const addedOther = added.filter((l) => !looksLikeOptionLine(l)).sort();
  const removedOther = removed.filter((l) => !looksLikeOptionLine(l)).sort();

  const sb: string[] = [];
  sb.push("_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._");
  sb.push("");
  if (addedOptions.length || removedOptions.length) {
    sb.push("## Dropdown / options changes");
    sb.push("");
    for (const l of addedOptions.slice(0, 60)) sb.push(`+ ${l}`);
    for (const l of removedOptions.slice(0, 60)) sb.push(`- ${l}`);
    sb.push("");
  }
  if (addedOther.length) {
    sb.push("## Added");
    sb.push("");
    for (const l of addedOther.slice(0, 80)) sb.push(`+ ${l}`);
    sb.push("");
  }
  if (removedOther.length) {
    sb.push("## Removed");
    sb.push("");
    for (const l of removedOther.slice(0, 80)) sb.push(`- ${l}`);
    sb.push("");
  }
  return sb.join("\n") + (sb[sb.length - 1] === "" ? "" : "\n");
}
