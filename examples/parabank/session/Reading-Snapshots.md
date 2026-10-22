# Reading snapshots

YAML trees so you can generate **playwright** tests that actually run.
Not a click recorder. Not Playwright ariaSnapshot().

## Files
- SESSION.md — start URL, goal, framework, style. Tiny index; read this first.
- TEST_GUIDE.md — short rules for a runnable test. Read second.
- flow.md — ordered steps and notes (the intended scenario narrative). Honor action: / assert: / data: prefixes.
- NN_<host>.yaml — page snapshot. Header: URL, Title, Viewport, Step, Note, Goal.
- NN_diff.md — what changed vs previous capture.
- PROMPT.md — framework, style, waits, goal.
- Reading-Snapshots.md — this file (locator mapping).

Lean mode (default): only actionable controls have locators, and only ONE (highest score). Empty nameless main/region wrappers are omitted. Visible data-test/testid nodes with no ARIA role are kept as generic.

## How to read YAML
- Tree: ARIA-inspired roles and accessible names. Flags: disabled, busy, invalid, required, checked, expanded/collapsed.
- Under controls: value, one locators candidate (by + optional attr + stability + score), native options:, dropdown:, error / validationMessage.
- by values: testid | id | name | css | role | label | placeholder | linkText | xpath.
- Optional `attr` on testid locators names the source attribute when it is not data-testid (e.g. attr: data-test). Still map `by: testid` to getByTestId.
- Locator score (higher is better): testid 98, role 95, label 90, id 90, name 88, placeholder 85, linkText 75, css 60, xpath 40. Prefer higher score; never use score <= 40 unless nothing else exists.
- Never use stability: low unless nothing else exists. A matches: N locator is not unique (score capped at 40).
- Native select: one snapshot (options:). Custom dropdown: closed then open; read Dropdown / options changes in NN_diff.md.
- Do not goto a URL to skip a control that is in the YAML (especially cart). Never getByRole("generic").

## Structured notes
If a note contains action:, assert:, or data:, treat them as the intended act, assertion, and typed values.

## Generate a test that runs
Produce ONE complete runnable test covering EVERY flow.md step in order. Web-first expects; no waitForTimeout / Thread.sleep.
Assert from notes and YAML snapshots (visible text, URL, enabled/visible). Do not invent steps or elements.

## Mapping to @playwright/test

| YAML `by` | Playwright |
|-------------|------------|
| testid | `page.getByTestId('…')` even when YAML `attr` is `data-test` / `data-cy` / `data-qa`. Never `getByRole("generic")`. |
| id | `page.locator('#id')` |
| name | `page.locator('[name="…"]')` |
| role | `page.getByRole('button', { name: '…' })` |
| label | `page.getByLabel('…')` |
| placeholder | `page.getByPlaceholder('…')` |
| css | `page.locator('…')` |
| linkText | `page.getByRole('link', { name: '…' })` |
| xpath | `page.locator('xpath=…')` |

Use web-first `expect(locator).toBeVisible()` / `toHaveValue` / `toHaveURL`. Native select: `locator.selectOption({ label })`. Iframes: `page.frameLocator('iframe[name=…]')`. Page Object when style=pageobject.

Style=pageobject. Waits=web-first.
