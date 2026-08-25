export type CookieRecord = Record<string, string>;

export interface StorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

const COOKIE_FIELDS = ["name", "value", "domain", "path", "secure", "httpOnly", "expiry"] as const;

function asCookieValue(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") {
    return v === Math.floor(v) ? String(v) : String(v);
  }
  if (typeof v === "object") return undefined;
  return String(v);
}

function parseCookieJsonStrict(raw: string): CookieRecord[] | null {
  let tree: unknown;
  try {
    tree = JSON.parse(raw);
  } catch {
    return null;
  }
  if (tree && typeof tree === "object" && !Array.isArray(tree) && "cookies" in tree) {
    const wrapped = (tree as { cookies: unknown }).cookies;
    if (Array.isArray(wrapped)) tree = wrapped;
  }
  if (!Array.isArray(tree)) return null;
  const out: CookieRecord[] = [];
  for (const entry of tree) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const map = entry as Record<string, unknown>;
    const name = map.name;
    if (name == null || String(name).trim() === "") continue;
    const cookie: CookieRecord = {};
    for (const field of COOKIE_FIELDS) {
      const v = asCookieValue(map[field]);
      if (v !== undefined) cookie[field] = v;
    }
    if (cookie.value === undefined) cookie.value = "";
    out.push(cookie);
  }
  return out;
}

/** Last-resort scanner for hand-edited cookie files that are not valid JSON. */
function scanCookieObjects(raw: string): CookieRecord[] {
  const list: CookieRecord[] = [];
  const objRe = /\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  const fieldRe =
    /"(name|value|domain|path|secure|httpOnly|expiry)"\s*:\s*("(?:\\.|[^"\\])*"|true|false|null|[0-9]+)/g;
  while ((m = objRe.exec(raw))) {
    const body = m[1];
    const map: CookieRecord = {};
    fieldRe.lastIndex = 0;
    let f: RegExpExecArray | null;
    while ((f = fieldRe.exec(body))) {
      const key = f[1];
      let val = f[2];
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      }
      map[key] = val;
    }
    if (map.name) {
      if (map.value === undefined) map.value = "";
      list.push(map);
    }
  }
  return list;
}

/**
 * Reads a Selenium-compatible cookie array. Real JSON first; scanner kept
 * for files that are not valid JSON.
 */
export function parseCookieJson(raw: string): CookieRecord[] {
  const parsed = parseCookieJsonStrict(raw);
  return parsed ?? scanCookieObjects(raw);
}

export function serializeCookies(cookies: CookieRecord[]): string {
  const items = cookies.map((c) => {
    const lines = [
      `    "name": ${jsonStr(c.name)}`,
      `    "value": ${jsonStr(c.value ?? "")}`,
    ];
    if (c.domain !== undefined) lines.push(`    "domain": ${jsonStr(c.domain)}`);
    lines.push(`    "path": ${jsonStr(c.path ?? "/")}`);
    if (c.secure !== undefined) lines.push(`    "secure": ${c.secure === "true"}`);
    if (c.httpOnly !== undefined) lines.push(`    "httpOnly": ${c.httpOnly === "true"}`);
    if (c.expiry !== undefined && c.expiry !== "") {
      lines.push(`    "expiry": ${c.expiry}`);
    }
    return `  {\n${lines.join(",\n")}\n  }`;
  });
  return `[\n${items.join(",\n")}\n]\n`;
}

function jsonStr(s: string | null | undefined): string {
  if (s == null) return "null";
  return JSON.stringify(s);
}

export function parseStorageState(raw: string): StorageState {
  const tree = JSON.parse(raw) as Partial<StorageState>;
  const cookies = Array.isArray(tree.cookies) ? tree.cookies : [];
  const origins = Array.isArray(tree.origins) ? tree.origins : [];
  return {
    cookies: cookies.map((c) => ({
      name: String(c.name ?? ""),
      value: String(c.value ?? ""),
      domain: String(c.domain ?? ""),
      path: String(c.path ?? "/"),
      expires: typeof c.expires === "number" ? c.expires : Number(c.expires ?? -1),
      httpOnly: Boolean(c.httpOnly),
      secure: Boolean(c.secure),
      sameSite: (c.sameSite === "Strict" || c.sameSite === "None" ? c.sameSite : "Lax") as
        | "Strict"
        | "Lax"
        | "None",
    })),
    origins: origins.map((o) => ({
      origin: String(o.origin ?? ""),
      localStorage: Array.isArray(o.localStorage)
        ? o.localStorage.map((e) => ({ name: String(e.name ?? ""), value: String(e.value ?? "") }))
        : [],
    })),
  };
}

export function serializeStorageState(state: StorageState): string {
  return JSON.stringify(state, null, 2) + "\n";
}

/** Convert simple cookie records into Playwright addCookies() items. */
export function toPlaywrightCookies(
  cookies: CookieRecord[],
  originUrl?: string
): Array<Record<string, unknown>> {
  return cookies.map((c) => {
    let expires = -1;
    if (c.expiry && c.expiry.trim() !== "") {
      const exp = Number(c.expiry);
      if (Number.isFinite(exp) && exp > 0) {
        expires = exp < 10_000_000_000 ? exp : Math.floor(exp / 1000);
      }
    }
    const item: Record<string, unknown> = {
      name: c.name,
      value: c.value ?? "",
      path: c.path || "/",
      httpOnly: String(c.httpOnly).toLowerCase() === "true",
      secure: String(c.secure).toLowerCase() === "true",
    };
    if (c.domain) {
      item.domain = c.domain;
    } else if (originUrl) {
      item.url = originUrl;
    }
    if (expires > 0) item.expires = expires;
    return item;
  });
}

export function originOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.origin;
  } catch {
    return null;
  }
}
