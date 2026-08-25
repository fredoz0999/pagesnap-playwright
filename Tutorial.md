# Tutorial

Node 20+.

```
npm install
npx playwright install chromium
npm run capture -- https://example.com
```

Walk the app. Ctrl+M checkpoint, Ctrl+Shift+M note, Ctrl+Q end. Never Ctrl+K.
Clicks/fills/selects/nav are recorded automatically in steps.md. YAML is a checkpoint, not the whole story.

```
npm run capture -- https://example.com --framework=playwright --goal='Register a user'
npm run capture -- --help
```

Lean is default. --full restores the verbose dump. Flags override capture.config.properties.
--framework= swaps prompt and hints; YAML locators stay generic.
Attach: --connect= or --cdp= with a DevTools debugging-port URL. URL optional if a tab is open.
Native select: one snapshot. Custom dropdown: closed then open. Session folder goes to pageSnapshots/.
Honor action: / assert: / data: prefixes in notes.

