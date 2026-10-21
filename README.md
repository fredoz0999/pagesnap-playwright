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
npm run pack -- query    latest "add the Fleece Jacket to the cart" [--step=2] [--diff] [--k=4]
npm run pack -- pom      latest --out=tests/pages   # page objects from verified locators, no LLM
npm run pack -- validate latest tests/cart.spec.ts  # exit 1 if a locator is not in any snapshot
npm run pack -- heal     latest tests/cart.spec.ts [--log=pw-output.txt] [--write]
npm run pack -- verify   latest [--storage=state.json]   # live drift check, exit 1 if a locator is gone
npm run pack -- bench    latest [--md]               # tokens per approach for the whole flow
npm run pack -- stats    latest
npm run mcp                                          # same tools as an MCP server (stdio)
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
- **Diff** (`--diff` with `--step`): regions unchanged since the previous step on the same page become a one-line
  reference; regions that changed are added even when they rank lower, since that is usually what the step asserts.
- **All locators kept**: the YAML still shows one locator per control, but every verified unique locator is written
  to `NN_<host>.locators.json`. `validate`, `heal` and `verify` accept any of them, so `#checkout` validates even when
  the YAML shows `testid=checkout`.
- **Page objects** (`pom`): one class per URL path plus a `BasePage` for controls on 2+ pages, every getter backed by a
  verified locator, and `PAGES.md` (member map) for the agent. The agent writes only the flow.
- **Validate**: checks every `getByTestId / getByRole / getByLabel / getByPlaceholder / getByText / locator()` in a spec
  against the snapshots. No LLM tokens. Reports ok / missing / ambiguous / unverified.
- **Heal**: for missing / ambiguous locators, or ones a Playwright run reported (`--log`), ranks the closest captured
  controls (word overlap weighted by rarity, plus character bigrams for respellings like `user_name` -> `username`).
  `--write` replaces a call only when the winner is clear (confidence >= 0.75 and 0.15 ahead of the runner-up).
- **Verify**: reopens each captured page headless and counts matches for every recorded locator: ok / gone / ambiguous.
  Pages behind login need `--storage` (save it during capture with `--save-storage`).
- **Scripted capture**: `ScriptedSession` (`src/scripted.ts`) captures from your own Playwright code, same output as
  Ctrl+M, for CI smoke runs or regenerating fixtures.

`npm run pack -- bench test/fixtures/saucedemo` (4 captures, ~4 chars/token, whole flow):

| Approach | Tokens | vs raw |
|---|---|---|
| raw YAML | 7,455 | baseline |
| compact lean | 1,173 | -84% |
| query per step | 1,330 | -82% |
| query --diff per step | 1,232 | -83% |
| PAGES.md + query --diff | 1,759 | -76% |
| Playwright ariaSnapshot, one per step | 1,600 | -79% |

On pages this small the lean pack and a raw ariaSnapshot are about the same size; the difference is that the lean pack
carries verified locators (test ids, ids) that ariaSnapshot does not, and a live MCP browser re-sends a snapshot after
most actions rather than once per step. Run `bench` on your own app before quoting numbers.

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
`install-prompts` also writes `.vscode/mcp.json` (if absent) so Copilot agent mode gets the `pagesnap_*` tools.

### MCP server

`npm run mcp` serves `pagesnap_overview`, `pagesnap_query`, `pagesnap_pom`, `pagesnap_validate`, `pagesnap_heal`,
`pagesnap_verify` and `pagesnap_build` over stdio (no extra dependencies). Relative paths resolve against
`PAGESNAP_CWD` (your test repo).

```
claude mcp add pagesnap -e PAGESNAP_CWD="$PWD" -- npm --prefix /path/to/pagesnap-playwright run -s mcp
```

### Browser for verify / live tests

Installed Google Chrome by default. `PS_CHROMIUM=/path/to/chrome` uses that executable; `PS_BROWSER=bundled` uses
Playwright's own Chromium (CI). `test/live.test.ts` runs only when one of those is set.

## Sibling

Selenium / Java capture: https://github.com/fredoz0999/pagesnap-selenium


