export const DEFAULT_TIMEZONE = "America/New_York";

const SESSION_TS_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
};

/**
 * Session folder timestamp, e.g. 2026-07-22T15-30-45.
 * Defaults to America/New_York; an unknown zone falls back to it.
 */
export function sessionFolderTs(instant: Date, timezone?: string | null): string {
  let zone =
    timezone == null || String(timezone).trim() === ""
      ? DEFAULT_TIMEZONE
      : String(timezone).trim();
  try {
    // Throws RangeError for unknown IANA zones.
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(instant);
  } catch {
    zone = DEFAULT_TIMEZONE;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    ...SESSION_TS_OPTS,
    timeZone: zone,
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}-${get("minute")}-${get("second")}`;
}

/**
 * Host + path only; strips jsessionid, query string, fragment, and unsafe chars.
 */
export function sanitizeUrl(url: string): string {
  try {
    const cleaned = url
      .replace(/;jsessionid=[^?#/]*/gi, "")
      .replace(/(?:^|[?&])jsessionid=[^&#]*/gi, "");
    const uri = new URL(cleaned);
    const host = uri.hostname || "unknown";
    let path = uri.pathname;
    if (!path || path === "/") {
      path = "root";
    } else {
      path = path.replace(/^\/|\/$/g, "").replace(/\//g, "_");
    }
    let base = `${host}_${path}`.replace(/[^a-zA-Z0-9._-]/g, "_");
    if (base.length > 80) base = base.slice(0, 80);
    return base;
  } catch {
    return "unknown";
  }
}

/** session-<timestamp> → session-<name>-<timestamp> */
export function applySessionFolderName(
  sessionDir: string,
  optionalName: string | null | undefined,
  sessionSubdir: boolean,
  exists: (p: string) => boolean,
  rename: (from: string, to: string) => void
): string {
  if (!sessionSubdir || optionalName == null || optionalName.trim() === "") {
    return sessionDir;
  }
  let safe = optionalName
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+|\.+$/g, "");
  if (safe.length > 80) safe = safe.slice(0, 80);
  if (!safe) return sessionDir;
  const parent = sessionDir.replace(/[\\/]+$/, "").split(/[/\\]/);
  const base = parent.pop() ?? "";
  const parentPath = parent.join("/") || ".";
  const timestamp = base.startsWith("session-") ? base.slice("session-".length) : base;
  let target = `${parentPath}/session-${safe}-${timestamp}`;
  let n = 2;
  while (exists(target)) {
    target = `${parentPath}/session-${safe}-${n}-${timestamp}`;
    n++;
  }
  rename(sessionDir, target);
  return target;
}
