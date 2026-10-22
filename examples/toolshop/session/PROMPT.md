# Test generation prompt

Generated: 2026-10-22T03:19:44Z
Start URL: https://practicesoftwaretesting.com/
Framework: playwright
Style: pageobject
Waits: web-first
Goal: Toolshop: search, sort, add to cart, sign in, check out, get invoice
Snapshot mode: lean (one locator per control)

## Task

Read SESSION.md, then TEST_GUIDE.md, then flow.md, then YAML snapshots, then PROMPT.md / Reading-Snapshots.md.
Using the YAML page snapshots and `flow.md` in this folder, generate **@playwright/test** TypeScript tests. Do not invent steps or elements. Do not emit extra spec files this tool did not ask for.

## Locators
- Prefer YAML `by` in this order: testid -> getByTestId, role -> getByRole, label -> getByLabel, id -> locator("#id").
- Then name -> locator("[name=...]"), placeholder -> getByPlaceholder.
- YAML `by: testid` maps to getByTestId even if `attr` is data-test / data-cy / data-qa (not data-testid). The `attr` field is informational; do not switch to a CSS attribute selector.
- `generic` nodes are testid-only (no ARIA role). Use getByTestId, never getByRole("generic"). Do not goto a URL to skip a control that is in the YAML (especially cart).
- Prefer higher `score`. Never use score <= 40 unless nothing else exists. Never use stability: low unless nothing else exists. Never page.waitForTimeout.
- Web-first expect(); native <select> -> selectOption; frames -> frameLocator.

## Walkthrough
- Follow each step in `flow.md` and honor step notes as intended actions/assertions.
- `action:` = intended act; `assert:` = assertion; `data:` = typed values. Honor those prefixes in notes.
- YAML snapshots are page states: assert visible text, URL, enabled/visible. Wait for enabled/visible, never sleep.
- Independent test when possible; reuse storageState/cookies if this session loaded them.
- Native select: one snapshot (`options:`). Custom dropdown: closed then open; read NN_diff.md.
- Do not invent UI. Do not goto a URL to skip a YAML control. Structure: pageobject.

User goal: Toolshop: search, sort, add to cart, sign in, check out, get invoice
