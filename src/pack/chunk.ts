/**
 * Split a compacted snapshot into retrievable chunks by UI region.
 *
 * A subtree that fits the budget stays whole (small siblings are packed
 * together); a bigger one is split along its children with a breadcrumb so
 * every chunk still says where it lives. Collapsed same-shape items become
 * their own small "item" chunks so a query naming them gets exact locators.
 */
import crypto from "node:crypto";
import { type CNode, compactNodes, compactTail, isLandmarkLike, renderNodes, snapshotHeaderLine, type CompactOptions } from "./compact.js";
import { estimateTokens, type Snapshot } from "./parse.js";

export type ChunkKind = "region" | "item" | "tables";

export interface Chunk {
  id: string;
  /** steps this exact chunk text appears in (deduped across captures) */
  steps: number[];
  file: string;
  url: string;
  path: string;
  kind: ChunkKind;
  text: string;
  tokens: number;
  hash: string;
}

export interface PageEntry {
  step: number;
  file: string;
  url: string;
  header: string;
  outline: string[];
  compactTokens: number;
  rawTokens: number;
}

export interface ChunkOptions extends CompactOptions {
  /** soft token budget per chunk (default 200) */
  maxTokens?: number;
}

function shortLabel(n: CNode): string {
  return n.name ? n.role + ' "' + (n.name.length > 40 ? n.name.slice(0, 40) + "..." : n.name) + '"' : n.role;
}

export function hashText(t: string): string {
  return crypto.createHash("sha1").update(t).digest("hex").slice(0, 12);
}

/** Top-level regions plus headings: a ~10-line map of the page. */
export function outlineOf(nodes: CNode[], max = 12): string[] {
  const out: string[] = [];
  const trim = (l: string) => (l.length > 90 ? l.slice(0, 90) + "..." : l);
  const visit = (ns: CNode[], depth: number) => {
    for (const n of ns) {
      if (out.length >= max) return;
      if (n.role === "collapsed") continue;
      if (depth === 0 || n.role === "heading" || (depth <= 2 && isLandmarkLike(n.role) && n.name)) {
        out.push(" ".repeat(Math.min(depth, 2)) + trim(n.line));
      }
      visit(n.children, depth + 1);
    }
  };
  visit(nodes, 0);
  return out;
}

export function chunkSnapshot(snap: Snapshot, opts: ChunkOptions = {}): { chunks: Chunk[]; page: PageEntry; compact: string } {
  const max = opts.maxTokens ?? 200;
  const tree = compactNodes(snap.roots, opts);
  const chunks: Chunk[] = [];
  const add = (kind: ChunkKind, path: string[], lines: string[]) => {
    const text = lines.join("\n");
    if (!text.trim()) return;
    chunks.push({
      id: "",
      steps: [snap.step],
      file: snap.file,
      url: snap.url,
      path: path.join(" > ") || "(page)",
      kind,
      text,
      tokens: estimateTokens(text),
      hash: hashText(text),
    });
  };

  const items = (nodes: CNode[], path: string[]) => {
    for (const n of nodes) {
      if (n.collapsed) for (const it of n.collapsed) add("item", path, renderNodes([it]));
      items(n.children, [...path, shortLabel(n)]);
    }
  };

  const emit = (nodes: CNode[], path: string[], lead: string[]) => {
    let buf = [...lead];
    let bufTok = estimateTokens(buf.join("\n"));
    const flush = () => {
      if (buf.length) add("region", path, buf);
      buf = [];
      bufTok = 0;
    };
    for (const n of nodes) {
      const lines = renderNodes([n]);
      const t = estimateTokens(lines.join("\n"));
      if (t <= max) {
        if (bufTok + t > max) flush();
        buf.push(...lines);
        bufTok += t;
      } else {
        flush();
        emit(n.children, [...path, shortLabel(n)], [n.line]);
      }
    }
    flush();
  };

  emit(tree, [], []);
  items(tree, []);
  const tail = compactTail(snap.tail);
  if (tail.length) add("tables", ["tables"], tail);

  const compactLines = [snapshotHeaderLine(snap), ...renderNodes(tree), ...tail];
  const compact = compactLines.join("\n") + "\n";
  return {
    chunks,
    compact,
    page: {
      step: snap.step,
      file: snap.file,
      url: snap.url,
      header: snapshotHeaderLine(snap),
      outline: outlineOf(tree),
      compactTokens: estimateTokens(compact),
      rawTokens: estimateTokens(snap.raw),
    },
  };
}

/** Merge chunks whose text is identical across steps (shared header/nav). */
export function dedupeChunks(all: Chunk[]): Chunk[] {
  const byHash = new Map<string, Chunk>();
  const out: Chunk[] = [];
  for (const c of all) {
    // "dup k/n" indexes shift when a sibling changes; same UI otherwise.
    const key = c.kind + ":" + c.path + ":" + hashText(c.text.replace(/,? ?dup \d+\/\d+/g, "").replace(/ \[\]/g, ""));
    const prev = byHash.get(key);
    if (prev) {
      if (!prev.steps.includes(c.steps[0])) prev.steps.push(c.steps[0]);
      continue;
    }
    byHash.set(key, c);
    out.push(c);
  }
  out.forEach((c, i) => (c.id = "c" + (i + 1)));
  return out;
}
