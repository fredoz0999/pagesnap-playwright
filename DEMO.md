# PageSnap speaker notes

## 30-second pitch

You walk the app. You choose when to snapshot (Cmd+M). PageSnap writes lean YAML with live-verified locators and a reliability score. An LLM reads the folder and writes a runnable Playwright test. Playwright is only the browser driver. Not a click recorder.

## Key points (say these)

- Manual snapshots of UI states, not every click
- Locators uniqueness-checked on the live page, with scores (testid 98 … xpath 40)
- Sauce Demo uses data-test → getByTestId (testIdAttribute)
- Notes: action: / assert: / data:  (this is your Gherkin, without Cucumber)
- Session pack: SESSION.md, TEST_GUIDE.md, flow.md, YAML, PROMPT.md
- Framework-agnostic YAML; --framework= only changes the prompt

## Vs Playwright codegen (colleague already showed this)

Codegen records how you clicked. It emits a spec live. Locators often getByText / getByPlaceholder / chained CSS; they flake when copy or layout changes. Extra clicks land in the test. No score, no uniqueness stamp, no action vs assert.

PageSnap records what was on the page. One locator per control, verified unique, scored. LLM writes the spec from YAML + notes.

One-liner: codegen records how you clicked; PageSnap records what was on the page with locators you would keep.

## Vs LocatorLabs / aria snapshots (if asked)

LocatorLabs auto-scans a URL into a registry. No scenario. PageSnap only includes what you walked, in order.

toMatchAriaSnapshot YAML is for asserting the a11y tree. PageSnap YAML is for generating tests (by/value/score).

## Demo beats (talk while you do them)

Repo: pagesnap-playwright. Command: npm run capture -- https://www.saucedemo.com --framework=playwright --goal='Login, sort, cart, checkout, logout'

Use PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1; installed Chrome; never npx playwright install.

Credentials on the page: standard_user / secret_sauce.

Walk, Cmd+M after each state, Cmd+Shift+M for notes:

1. Login — data: username=standard_user password=secret_sauce
2. Sort Price low to high — native select, one snapshot
3. Add backpack + bike light — assert: cart badge is 2
4. Cart icon (shopping-cart-link) — do NOT type /cart.html — remove bike light
5. Checkout — data: firstName lastName postal
6. Thank-you heading (no testid → getByRole heading is OK)
7. Open menu, snapshot while open, logout

End Cmd+Q. Show YAML: score 98, attr: data-test, cart as generic+testid.

Copy session to playwright-ts-framework/snapshots/. Prompt LLM: one spec, page objects, no waitForTimeout, no invented locators, no goto skip.

Run: npm run test:headed in playwright-ts-framework.

## Gotchas if something looks wrong

- Cart: getByTestId("shopping-cart-link") not goto /cart.html, not getByRole("generic")
- Logout only exists in the menu-open snapshot
- Native select → selectOption from options:

## Advantages

- Stable locators (testid/role, scored, unique)
- You control the scenario (same as choosing which Cucumber scenarios to automate)
- Lean YAML → cheaper, less hallucinated locators
- Same pack can target Playwright, Selenium, or Cypress (prompt only)
- Fits an existing Playwright TS framework (page objects + fixtures), not a new runner

## How this helps a Serenity / Selenium / Cucumber team move to Playwright

This is the conversion story. Say it after the test goes green.

Serenity+Cucumber today: Feature file (Gherkin) + step defs + Serenity page objects (@FindBy / By.css) + WebDriverWait / Serenity ensureThat. Locators live in Java POs. Scenarios live in .feature files. Glue is the expensive part of a rewrite.

| Today (Serenity / Selenium / Cucumber) | PageSnap → Playwright TS |
|----------------------------------------|---------------------|
| A Cucumber scenario (Given/When/Then) | One PageSnap walk. flow.md is the scenario narrative. action:/assert:/data: are When/Then/Examples without a second language. |
| Serenity page objects / @FindBy | Playwright page objects from YAML `by` (testid → getByTestId, role → getByRole). Not re-hunting locators in Chrome DevTools. |
| By.id / By.css / By.xpath / Thread.sleep / WebDriverWait | Scored locators + web-first expect(). Sleeps stay out because TEST_GUIDE forbids them. |
| Screenplay tasks/questions | Can wait. Start with style=pageobject so it looks like current POs, not a new pattern on day one. |

You do not convert the whole suite on day one. Pick the journeys that matter (checkout, login), snapshot the states, generate Playwright specs, run headed, keep Serenity for the rest until they are replaced.

YAML is stack-neutral, so a holdout Selenium suite can still consume the same snapshots if needed. The demo generates Playwright because that is the destination.

Outcome: locators and flow come from the live app, not from translating 5-year-old By.xpath out of a Serenity PO. Cucumber duplication (same step, three defs) goes away; one spec covers the journey.

One-liner for leadership: we stop rewriting locators by hand. We walk the journey we already test in Cucumber, snapshot the states, and generate Playwright tests that use getByTestId/getByRole instead of Serenity By.css.

## Locator scores (if asked)

| by | score |
|----|------:|
| testid | 98 |
| role | 95 |
| label / id | 90 |
| name | 88 |
| placeholder | 85 |
| linkText | 75 |
| css | 60 |
| xpath | 40 |

Prefer higher. `matches: N` caps at 40. generic+testid → getByTestId, never getByRole("generic").

