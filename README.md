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

## Sibling

Selenium / Java capture: https://github.com/fredoz0999/pagesnap-selenium


