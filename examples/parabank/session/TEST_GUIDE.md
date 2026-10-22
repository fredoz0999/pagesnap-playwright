# Test generation guide

Read in this order: SESSION.md → TEST_GUIDE.md → flow.md → YAML snapshots → PROMPT.md / Reading-Snapshots.md

## Goal
Produce ONE runnable test covering EVERY flow.md step in order. Do not invent steps or elements.

## Locators
- Prefer higher `score`. Never use score <= 40 unless nothing else exists. Never use stability: low unless nothing else exists.
- YAML `by: testid` → `getByTestId` even when `attr` is data-test / data-cy / data-qa. Never `getByRole("generic")`.
- Do not goto a URL to skip a control that is in the YAML (especially cart).

## Actions
- Native `<select>`: `selectOption` from `options:`. Custom dropdown: closed then open; read NN_diff.md.
- Web-first expects only. Never `waitForTimeout` / `Thread.sleep` / `cy.wait(ms)`.
- Honor `action:` / `assert:` / `data:` prefixes in notes.
- Iframes: YAML `iframe "name":` → frameLocator. Nested path uses `/`.

Framework=playwright. Style=pageobject. Waits=web-first.
