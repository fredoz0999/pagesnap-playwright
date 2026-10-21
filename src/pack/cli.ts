#!/usr/bin/env node
/**
 * npm run pack -- build    <session|latest> [--embedder=hash|minilm] [--max-tokens=200]
 * npm run pack -- query    <session|latest> "<step text>" [--k=4] [--step=N] [--url=part] [--no-legend] [--json]
 * npm run pack -- validate <session|latest> <spec.ts>
 * npm run pack -- stats    <session|latest>
 * npm run pack -- prompt   <session|latest> [--cases] [--name=x]
 * npm run pack -- install-prompts <test-repo-dir>
 */
import fs from "node:fs";
import path from "node:path";
import { buildIndex, indexIsStale, loadIndex, queryIndex, LEAN_DIR } from "./index.js";
import { validateSpec } from "./validate.js";
import { automatePrompt, installPrompts, sessionGoal, slugify, testCasesPrompt, writeSessionPrompts } from "./prompts.js";

const USAGE = `pagesnap lean pack - token-lean snapshots for coding agents

  npm run pack -- build    <session|latest> [--embedder=hash|minilm] [--max-tokens=200]
  npm run pack -- query    <session|latest> "<step text>" [--k=4] [--step=N] [--url=part] [--no-legend] [--json]
  npm run pack -- validate <session|latest> <spec.ts>
  npm run pack -- stats    <session|latest>
  npm run pack -- prompt   <session|latest> [--cases] [--name=checkout-flow]
  npm run pack -- install-prompts <test-repo-dir>

build     compact every NN_*.yaml into lean/NN_*.txt, chunk by UI region, write lean/index.json + lean/PACK.md
query     hybrid search (keyword + vector + exact name) -> page outline + the few chunks that matter
validate  check every locator in a spec against the snapshots (no LLM tokens). Exit 1 if any is missing.
stats     raw vs compact token estimate per page
prompt    print a ready-to-paste agent prompt for this session (--cases: manual test cases)
install-prompts  add /pagesnap-automate and /pagesnap-testcases to a test repo
                 (.github/prompts for Copilot, .claude/commands for Claude Code)

<session> is a session folder, or "latest" for the newest pageSnapshots/session-*.`;

/** npm run changes cwd to the tool folder; INIT_CWD is where the user (or agent) ran it. */
export function userPath(p: string): string {
  return path.resolve(process.env.INIT_CWD || process.cwd(), p);
}

function flag(args: string[], name: string): string | undefined {
  const hit = args.find((a) => a.startsWith("--" + name + "="));
  return hit ? hit.slice(name.length + 3) : undefined;
}

export function resolveSession(arg: string, root = "pageSnapshots"): string {
  if (arg !== "latest") return userPath(arg);
  if (!fs.existsSync(root)) throw new Error("No " + root + "/ folder here");
  const dirs = fs.readdirSync(root).filter((d) => d.startsWith("session-") && fs.statSync(path.join(root, d)).isDirectory()).sort();
  if (!dirs.length) throw new Error("No session-* folders in " + root);
  return path.resolve(root, dirs[dirs.length - 1]);
}

async function ensureIndex(dir: string): Promise<void> {
  if (indexIsStale(dir)) {
    let embedder: string | undefined;
    try { embedder = loadIndex(dir).embedder; } catch { /* first build */ }
    await buildIndex(dir, { embedder });
  }
}

async function main(argv: string[]): Promise<number> {
  const [cmd, sess, ...rest] = argv;
  const pos = rest.filter((a) => !a.startsWith("--"));
  if (!cmd || !sess || cmd === "--help" || cmd === "-h") {
    console.log(USAGE);
    return cmd ? 0 : 1;
  }
  if (cmd === "install-prompts") {
    const files = installPrompts(userPath(sess));
    console.log("Installed:\n" + files.map((f) => "  " + f).join("\n"));
    console.log("Copilot (agent mode): type /pagesnap-automate.  Claude Code: /pagesnap-automate <session-folder> <spec-name>");
    return 0;
  }
  const dir = resolveSession(sess);
  switch (cmd) {
    case "prompt": {
      const name = flag(rest, "name");
      const goal = sessionGoal(dir);
      const opts = { session: dir, name: name || slugify(goal || path.basename(dir)), goal };
      writeSessionPrompts(dir, name);
      process.stdout.write(rest.includes("--cases") ? testCasesPrompt(opts) : automatePrompt(opts));
      return 0;
    }
    case "build": {
      const mt = flag(rest, "max-tokens");
      const idx = await buildIndex(dir, { embedder: flag(rest, "embedder"), maxTokens: mt ? Number(mt) : undefined, name: flag(rest, "name") });
      const pct = Math.round((1 - idx.stats.compactTokens / idx.stats.rawTokens) * 100);
      console.log("Built " + path.join(dir, LEAN_DIR) + ": " + idx.pages.length + " page(s), " + idx.stats.chunkCount + " chunks, ~" +
        idx.stats.rawTokens + " -> ~" + idx.stats.compactTokens + " tokens (-" + pct + "%), embedder " + idx.embedder);
      return 0;
    }
    case "query": {
      const q = pos.join(" ").trim();
      if (!q) { console.error("query needs step text"); return 1; }
      await ensureIndex(dir);
      const st = flag(rest, "step");
      const k = flag(rest, "k");
      const res = await queryIndex(dir, q, {
        k: k ? Number(k) : undefined,
        step: st ? Number(st) : undefined,
        urlContains: flag(rest, "url"),
        legend: !rest.includes("--no-legend"),
      });
      if (rest.includes("--json")) {
        console.log(JSON.stringify({ tokens: res.tokens, lowConfidence: res.lowConfidence, hits: res.hits.map((h) => ({ id: h.chunk.id, steps: h.chunk.steps, path: h.chunk.path, score: +h.score.toFixed(3), text: h.chunk.text })) }, null, 2));
      } else {
        process.stdout.write(res.text);
        console.error("(~" + res.tokens + " tokens)");
      }
      return 0;
    }
    case "validate": {
      const spec = pos[0];
      if (!spec) { console.error("validate needs a spec file"); return 1; }
      const rep = validateSpec(dir, userPath(spec));
      process.stdout.write(rep.text);
      return rep.counts.missing > 0 ? 1 : 0;
    }
    case "stats": {
      await ensureIndex(dir);
      const idx = loadIndex(dir);
      for (const p of idx.pages) console.log("step " + p.step + "  raw ~" + p.rawTokens + "  compact ~" + p.compactTokens + "  " + p.url);
      console.log("total raw ~" + idx.stats.rawTokens + "  compact ~" + idx.stats.compactTokens + "  chunks " + idx.stats.chunkCount);
      return 0;
    }
    default:
      console.log(USAGE);
      return 1;
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err: unknown) => { console.error(err instanceof Error ? err.message : err); process.exit(1); }
);
