/**
 * Session index: build (compact + chunk + embed) and hybrid query
 * (BM25 keyword + vector cosine + exact accessible-name bonus).
 */
import fs from "node:fs";
import path from "node:path";
import { chunkSnapshot, dedupeChunks, type Chunk, type ChunkOptions, type PageEntry } from "./chunk.js";
import { LEGEND } from "./compact.js";
import { cosine, expand, makeEmbedder, tokenize } from "./embed.js";
import { estimateTokens, parseSnapshot } from "./parse.js";

export const LEAN_DIR = "lean";
export const INDEX_FILE = "index.json";
export const INDEX_VERSION = 1;

export interface SessionIndex {
  version: number;
  embedder: string;
  builtAt: string;
  pages: PageEntry[];
  chunks: Chunk[];
  vectors: number[][];
  stats: { rawTokens: number; compactTokens: number; chunkCount: number };
}

export interface BuildOptions extends ChunkOptions {
  embedder?: string;
}

export function snapshotFiles(sessionDir: string): string[] {
  return fs
    .readdirSync(sessionDir)
    .filter((f) => /^\d+_.+\.ya?ml$/i.test(f))
    .sort();
}

export async function buildIndex(sessionDir: string, opts: BuildOptions = {}): Promise<SessionIndex> {
  const files = snapshotFiles(sessionDir);
  if (!files.length) throw new Error("No NN_*.yaml snapshots in " + sessionDir);
  const leanDir = path.join(sessionDir, LEAN_DIR);
  fs.mkdirSync(leanDir, { recursive: true });

  const pages: PageEntry[] = [];
  let all: Chunk[] = [];
  for (const f of files) {
    const snap = parseSnapshot(fs.readFileSync(path.join(sessionDir, f), "utf8"), f);
    const { chunks, page, compact } = chunkSnapshot(snap, opts);
    fs.writeFileSync(path.join(leanDir, f.replace(/\.ya?ml$/i, ".txt")), compact, "utf8");
    pages.push(page);
    all = all.concat(chunks);
  }
  const chunks = dedupeChunks(all);
  const embedder = makeEmbedder(opts.embedder);
  const vectors = (await embedder.embed(chunks.map((c) => c.path + "\n" + c.text))).map((v) =>
    v.map((x) => Math.round(x * 1e4) / 1e4)
  );
  const index: SessionIndex = {
    version: INDEX_VERSION,
    embedder: embedder.id,
    builtAt: new Date().toISOString(),
    pages,
    chunks,
    vectors,
    stats: {
      rawTokens: pages.reduce((a, p) => a + p.rawTokens, 0),
      compactTokens: pages.reduce((a, p) => a + p.compactTokens, 0),
      chunkCount: chunks.length,
    },
  };
  fs.writeFileSync(path.join(leanDir, INDEX_FILE), JSON.stringify(index), "utf8");
  fs.writeFileSync(path.join(leanDir, "PACK.md"), packMd(index), "utf8");
  return index;
}

export function loadIndex(sessionDir: string): SessionIndex {
  const p = path.join(sessionDir, LEAN_DIR, INDEX_FILE);
  if (!fs.existsSync(p)) throw new Error("No index at " + p + " - run: npm run pack -- build " + sessionDir);
  const idx = JSON.parse(fs.readFileSync(p, "utf8")) as SessionIndex;
  if (idx.version !== INDEX_VERSION) throw new Error("Index version mismatch - rebuild with: npm run pack -- build " + sessionDir);
  return idx;
}

/** True when any snapshot is newer than the index (or index missing). */
export function indexIsStale(sessionDir: string): boolean {
  const p = path.join(sessionDir, LEAN_DIR, INDEX_FILE);
  if (!fs.existsSync(p)) return true;
  const t = fs.statSync(p).mtimeMs;
  return snapshotFiles(sessionDir).some((f) => fs.statSync(path.join(sessionDir, f)).mtimeMs > t);
}

// ---------------------------------------------------------------- BM25

function bm25Scores(query: string[], docs: string[][], k1 = 1.2, b = 0.75): number[] {
  const N = docs.length;
  const avgdl = docs.reduce((a, d) => a + d.length, 0) / Math.max(1, N);
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) || 0) + 1);
  const qset = [...new Set(query)];
  return docs.map((d) => {
    const tf = new Map<string, number>();
    for (const t of d) tf.set(t, (tf.get(t) || 0) + 1);
    let s = 0;
    for (const t of qset) {
      const f = tf.get(t);
      if (!f) continue;
      const n = df.get(t) || 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.length) / avgdl)));
    }
    return s;
  });
}

// ---------------------------------------------------------------- query

export interface QueryOptions {
  k?: number;
  step?: number;
  urlContains?: string;
  /** below this top score, fall back to the whole compact page (default 0.18) */
  minScore?: number;
  legend?: boolean;
  /** drop hits scoring below this fraction of the best hit (default 0.5) */
  relCutoff?: number;
}

export interface Hit {
  chunk: Chunk;
  score: number;
  bm25: number;
  vec: number;
  exact: number;
}

export interface QueryResult {
  hits: Hit[];
  lowConfidence: boolean;
  text: string;
  tokens: number;
}

const QUOTED = /"((?:[^"\\]|\\.)*)"/g;

function exactBonus(query: string, chunk: Chunk): number {
  const q = query.toLowerCase();
  let bonus = 0;
  let m: RegExpExecArray | null;
  QUOTED.lastIndex = 0;
  while ((m = QUOTED.exec(chunk.text))) {
    const name = m[1].toLowerCase();
    if (name.length >= 3 && q.includes(name)) bonus += 0.15 + Math.min(0.15, name.length / 100);
  }
  return Math.min(0.45, bonus);
}

export async function queryIndex(sessionDir: string, query: string, opts: QueryOptions = {}): Promise<QueryResult> {
  const idx = loadIndex(sessionDir);
  const k = opts.k ?? 4;
  const embedder = makeEmbedder(idx.embedder);
  const [qv] = await embedder.embed([query]);
  const qTokens = expand(tokenize(query));
  const docs = idx.chunks.map((c) => expand(tokenize(c.path + " " + c.text)));
  const bm = bm25Scores(qTokens, docs);
  const bmMax = Math.max(1e-9, ...bm);

  let hits: Hit[] = idx.chunks.map((chunk, i) => {
    const vec = Math.max(0, cosine(qv, idx.vectors[i]));
    const b = bm[i] / bmMax;
    const exact = exactBonus(query, chunk);
    return { chunk, bm25: b, vec, exact, score: 0.5 * b + 0.5 * vec + exact };
  });
  if (opts.step != null) hits = hits.filter((h) => h.chunk.steps.includes(opts.step!));
  if (opts.urlContains) hits = hits.filter((h) => h.chunk.url.includes(opts.urlContains!));
  hits.sort((a, b) => b.score - a.score);
  // Drop tail hits that are far weaker than the best one.
  const best = hits.length ? hits[0].score : 0;
  const top = hits.slice(0, k).filter((h, i) => i === 0 || h.score >= best * (opts.relCutoff ?? 0.5));
  const lowConfidence = !top.length || top[0].score < (opts.minScore ?? 0.18);
  const text = renderResult(idx, query, top, lowConfidence, sessionDir, opts.legend !== false);
  return { hits: top, lowConfidence, text, tokens: estimateTokens(text) };
}

function renderResult(idx: SessionIndex, query: string, hits: Hit[], low: boolean, sessionDir: string, legend: boolean): string {
  const out: string[] = [];
  out.push("# pagesnap query: " + JSON.stringify(query));
  if (legend) out.push(LEGEND);
  const steps = [...new Set(hits.flatMap((h) => h.chunk.steps.slice(0, 1)))].sort((a, b) => a - b);
  if (low) {
    const best = hits[0] ? idx.pages.find((p) => p.step === hits[0].chunk.steps[0]) : idx.pages[idx.pages.length - 1];
    out.push("");
    out.push("_Low-confidence match: returning the whole compact page instead of guessing._");
    if (best) {
      const p = path.join(sessionDir, LEAN_DIR, best.file.replace(/\.ya?ml$/i, ".txt"));
      out.push(fs.existsSync(p) ? fs.readFileSync(p, "utf8").trimEnd() : best.header);
    }
    return out.join("\n") + "\n";
  }
  for (const s of steps) {
    const page = idx.pages.find((p) => p.step === s);
    if (!page) continue;
    out.push("");
    out.push(page.header);
    if (page.outline.length) out.push("outline:", ...page.outline.map((l) => " " + l));
    for (const h of hits.filter((x) => x.chunk.steps[0] === s)) {
      const also = h.chunk.steps.length > 1 ? " (also steps " + h.chunk.steps.slice(1).join(",") + ")" : "";
      out.push("--- " + h.chunk.path + " [" + h.chunk.kind + ", score " + h.score.toFixed(2) + "]" + also);
      out.push(h.chunk.text);
    }
  }
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------- PACK.md

export function packMd(idx: SessionIndex): string {
  const pct = idx.stats.rawTokens ? Math.round((1 - idx.stats.compactTokens / idx.stats.rawTokens) * 100) : 0;
  const lines = [
    "# Lean pack",
    "",
    "Token-lean view of this session. Agents: do NOT read every NN_*.yaml.",
    "",
    "1. Read SESSION.md, TEST_GUIDE.md and flow.md (small).",
    "2. For each flow step, fetch only the UI you need:",
    "   `npm run pack -- query <this-session-dir> \"<step text>\" [--step=N] [--k=4]`",
    "3. If a query says low-confidence, it returns the whole compact page (lean/NN_*.txt) instead.",
    "4. After writing the spec, check every locator against the snapshots (no LLM tokens):",
    "   `npm run pack -- validate <this-session-dir> <spec.ts>`",
    "",
    "## Size (estimated tokens, ~4 chars/token)",
    "",
    "| | tokens |",
    "|---|---|",
    "| raw YAML, all steps | " + idx.stats.rawTokens + " |",
    "| compact lean/*.txt, all steps | " + idx.stats.compactTokens + " (-" + pct + "%) |",
    "| chunks indexed | " + idx.stats.chunkCount + " (embedder " + idx.embedder + ") |",
    "",
    "## Pages",
    "",
    ...idx.pages.map((p) => "- step " + p.step + ": " + p.url + " - raw " + p.rawTokens + " / compact " + p.compactTokens + " tokens (`lean/" + p.file.replace(/\.ya?ml$/i, ".txt") + "`)"),
    "",
  ];
  return lines.join("\n");
}
