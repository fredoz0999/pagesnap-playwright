# PageSnap Playwright

Manual checkpoints + an auto-recorded action log. You walk headed Chromium (or a browser you already opened). Clicks, fills, checks, selects, and navigations are recorded in `steps.md`. Press **Ctrl+M** when you want a YAML checkpoint (asserts, locators, dropdown options). An LLM generates tests from the session folder.

Clicks/fills are logged automatically in `steps.md`. YAML checkpoints are **manual** (Ctrl+M). This is **not** a spec.ts emitter and **not** Playwright `ariaSnapshot()`.

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
| **Toolbar** | Capture (checkpoint) · Note · End · dock L/M/R · minimize |
| **Ctrl+M / Cmd+M** | Checkpoint snapshot (no note) |
| **Ctrl+Shift+M / Cmd+Shift+M** | Checkpoint with note (`action:` / `assert:` / `data:` prefixes welcome) |
| **Ctrl+Q / Cmd+Q** | End session |

Never Ctrl+K. No auto-capture on navigation. Toast: Saved snapshot #N. `data-snapshot-tool` is excluded from YAML and from the action log.

## Attach to Chrome

Pass `--connect=` or `--cdp=` with a Chrome DevTools debugging-port URL (for example `http://127.0.0.1:9222`). Start Chrome with a remote-debugging port, then attach. The start URL is optional if a tab is already open.

## Framework-agnostic locators

YAML `by` values: `id | name | css | testid | role | label | placeholder | linkText | xpath`.

`--framework=` swaps PROMPT.md, Reading-Snapshots.md, and footer hints only. `--style=` and `--waits=` copy into the prompt.

## Options

Flags beat `capture.config.properties`. Lean defaults: `--no-urls`, no hints, `maxTableRows=3`. Run `npm run capture -- --help` for the full list. Also: `--goal=` `--output=` `--flat` `--full` `--lean` `--hints` `--urls` `--aria` plus cookie/storage, timezone, toolbar, headless.

## Output

`pageSnapshots/session-<ts>/` with `steps.md` (the walkthrough), `flow.md`, `01_<host_path>.yaml` checkpoints, `NN_diff.md`, `PROMPT.md`, `Reading-Snapshots.md`. Optional `NN_<host>_aria.yml` only with `--aria`.

## LLM workflow

1. Walk the app. Checkpoints with Ctrl+M when you need asserts / extra locators.
2. Hand the session folder to the agent: read PROMPT.md, steps.md, Reading-Snapshots.md, flow.md, YAML.
3. The agent should emit ONE complete runnable test covering every steps.md line. Do not invent elements. Native select: one snapshot (`options:`). Custom dropdown: closed then open.

Cookie/storage files are secrets. No screenshots. Not ariaSnapshot() by default.

