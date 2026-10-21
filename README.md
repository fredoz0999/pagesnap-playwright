# PageSnap Playwright

Manual page snapshot tool using **TypeScript + Playwright** as the browser driver only.

Captures rich YAML snapshots so an LLM can generate tests with better locators and flow context.

Playwright counterpart of [pagesnap-selenium](https://github.com/fredoz0999/pagesnap-selenium).

Unlike auto-nav capture tools, this does **not** auto-capture on navigation.
You capture only when you press **Ctrl+M** (Cmd+M on Mac).

This is **not** a spec.ts emitter and **not** Playwright `ariaSnapshot()`.

## Demo

```
npm install
npm run capture -- https://example.com
```

Then walk the app. Ctrl+M capture, Ctrl+Shift+M note, Ctrl+Q end. Uses your installed Chrome (no browser download).

```
npm run capture -- https://example.com --framework=playwright --goal='Register a user'
npm run capture -- --help
```

Lean YAML is the default (one locator per control, no hint footer, `/url:` stripped). Use `--full` for the verbose dump.

## Tutorial

Full cheatsheet: **[Tutorial.md](Tutorial.md)**

## Controls

| Control | Action |
|---------|--------|
| **Toolbar** | Capture · Note · End · dock L/M/R · minimize |
| **Ctrl+M / Cmd+M** | Capture snapshot (no note) |
| **Ctrl+Shift+M / Cmd+Shift+M** | Capture with note (`action:` / `assert:` / `data:` prefixes welcome) |
| **Ctrl+Q / Cmd+Q** | End session |

Never Ctrl+K. No auto-capture on navigation. Toast: Saved snapshot #N. `data-snapshot-tool` is excluded from YAML.

## Attach to Chrome

Pass `--connect=` or `--cdp=` with a Chrome DevTools debugging-port URL (for example `http://127.0.0.1:9222`). Start Chrome with a remote-debugging port, then attach. The start URL is optional if a tab is already open.

## Framework-agnostic locators

YAML `by` values: `id | name | css | testid | role | label | placeholder | linkText | xpath`.

`--framework=` swaps PROMPT.md, Reading-Snapshots.md, and footer hints only. `--style=` and `--waits=` copy into the prompt.

## Options

Flags beat `capture.config.properties`. Lean defaults: `--no-urls`, no hints, `maxTableRows=3`. Run `npm run capture -- --help` for the full list. Also: `--goal=` `--output=` `--flat` `--full` `--lean` `--hints` `--urls` plus cookie/storage, timezone, toolbar, headless.

## Output

`pageSnapshots/session-<ts>/` with `flow.md`, `01_<host_path>.yaml`, `NN_diff.md`, `PROMPT.md`, `Reading-Snapshots.md`.

## LLM workflow

1. Walk the app. Press Ctrl+M on each UI state you care about.
2. Hand the session folder to the agent: read PROMPT.md, Reading-Snapshots.md, flow.md, YAML.
3. The agent should emit ONE complete runnable test covering every flow.md step. Do not invent elements. Native select: one snapshot (`options:`). Custom dropdown: closed then open.

Cookie/storage files are secrets. No screenshots. Not ariaSnapshot().

## Token-lean pack (compact + retrieval)

At session end PageSnap also writes `lean/`: compact snapshots, a chunk index and `lean/PACK.md`.
Coding agents (Copilot agent mode, Claude Code) then fetch only the UI each step needs instead of every YAML.

```
npm run pack -- build    latest                     # rebuild lean/ (also runs automatically at Ctrl+Q; --no-pack to skip)
npm run pack -- query    latest "add the Fleece Jacket to the cart" [--step=2] [--k=4]
npm run pack -- validate latest tests/cart.spec.ts  # exit 1 if a locator is not in any snapshot
npm run pack -- stats    latest
```

`latest` is the newest `pageSnapshots/session-*`; any session folder path works too.

What it does:

- **Compact**: one line per node, one inline locator (implied when it equals role + name), no stability/score noise,
  structural `nth-child` css dropped from non-actionable wrappers, nameless wrappers flattened,
  repeated same-shape siblings (product cards, rows) collapsed to two examples + a name list.
- **Chunk**: split by UI region with a breadcrumb; collapsed items stay retrievable as their own small chunks;
  identical chunks across steps (header, footer) are stored once.
- **Query**: hybrid ranking = BM25 keywords + vector cosine + exact accessible-name bonus, with a small UI synonym
  table (sign in/login, basket/cart, ...). Returns the page outline plus the top chunks. A weak match falls back to the
  whole compact page instead of guessing.
- **Validate**: checks every `getByTestId / getByRole / getByLabel / getByPlaceholder / getByText / locator()` in a spec
  against the snapshots. No LLM tokens. Reports ok / missing / ambiguous / unverified.

Measured on the Sauce Demo fixture (`test/fixtures/saucedemo`, 4 captures, ~4 chars/token estimate):

| | tokens |
|---|---|
| raw YAML, all 4 steps | ~7,455 |
| compact `lean/*.txt`, all 4 steps | ~1,173 (-84%) |
| one `query` answer | ~180-440 |

Embedders: `hash` (default) is offline, dependency-free feature hashing. `--embedder=minilm` uses all-MiniLM-L6-v2
through the optional `@huggingface/transformers` package (`npm i -D @huggingface/transformers`, ~23 MB model download on
first use). The MiniLM path is optional and has not been exercised in CI yet.

### Ready-made prompts

Every build writes two prompts into the session, with paths and spec name filled in:

- `lean/AUTOMATE_PROMPT.md` - query each flow step, write one Playwright spec, validate, run, fix (max 3 tries)
- `lean/TESTCASES_PROMPT.md` - manual test cases table (happy, negative, edge) from the captured screens only

Print one to paste into Copilot agent mode or Claude Code:

```
npm run pack -- prompt latest --name=checkout-flow        # automate
npm run pack -- prompt latest --cases                     # manual test cases
```

Or install them once as slash commands in your test repo:

```
npm run pack -- install-prompts /path/to/your/test-repo
```

| Tool | Command |
|---|---|
| Copilot (VS Code, agent mode) | `/pagesnap-automate`, `/pagesnap-testcases` (asks for the session folder and spec name) |
| Claude Code | `/pagesnap-automate <session-folder> <spec-name>`, `/pagesnap-testcases <session-folder> <name>` |

The prompts call this tool with `npm --prefix <this repo> run -s pack -- ...`, so they work from any test repo.

## Sibling

Selenium / Java capture: https://github.com/fredoz0999/pagesnap-selenium


