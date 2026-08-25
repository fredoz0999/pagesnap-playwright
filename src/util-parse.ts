export function parseIntOr(raw: string, fallback: number, label: string): number {
  try {
    const n = Number.parseInt(String(raw).trim(), 10);
    if (Number.isNaN(n)) throw new Error("nan");
    return n;
  } catch {
    console.error("Ignoring invalid " + label + "=" + raw + " (using " + fallback + ")");
    return fallback;
  }
}

export function parseBool(v: string): boolean {
  return String(v).trim().toLowerCase() === "true";
}

export function emptyToNull(s: string): string | null {
  if (s == null || String(s).trim() === "") return null;
  return String(s).trim();
}

export function normalizeToolbarPosition(v: string | null | undefined): string {
  if (v == null) return "right";
  const s = v.trim().toLowerCase();
  if (s === "left" || s === "l") return "left";
  if (s === "middle" || s === "center" || s === "c" || s === "m") return "middle";
  return "right";
}

export function parseProperties(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("!")) continue;
    const eq = t.indexOf("=");
    const colon = t.indexOf(":");
    let idx = eq;
    if (idx < 0 || (colon >= 0 && colon < eq)) idx = colon;
    if (idx < 0) continue;
    const key = t.slice(0, idx).trim();
    let val = t.slice(idx + 1);
    if (val.startsWith(" ")) val = val.slice(1);
    out[key] = val;
  }
  return out;
}

/** Collapse doubled prefixes and accidental glued duplicates from the note dialog. */
export function normalizeNote(raw: string): string {
  let n = String(raw ?? "").replace(/\s+/g, " ").trim();
  n = n.replace(/^(action|assert|data):\s*(?:\1:\s*)+/i, (_, k: string) => k.toLowerCase() + ": ");
  if (n.length >= 8 && n.length % 2 === 0) {
    const half = n.length / 2;
    if (n.slice(0, half) === n.slice(half)) n = n.slice(0, half).trim();
  }
  return n;
}

