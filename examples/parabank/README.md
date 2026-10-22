# Parabank: PageSnap end to end on a live app

[Parabank](https://parabank.parasoft.com/parabank) is Parasoft's public demo bank with a UI and a REST API.
This folder is the whole PageSnap loop run against it.

| Step | Command | Output |
|---|---|---|
| 1. Capture 13 UI states (scripted, new user each run) | `npx tsx examples/parabank/capture.ts` | `session/` (YAML, locator sidecars, flow.md, lean pack, prompts) |
| 2. Page objects, no LLM | `npm run pack -- pom examples/parabank/session --out=examples/parabank/tests/pages` | 8 page classes + `BasePage`, `PAGES.md` |
| 3. Spec from PAGES.md + `pack query --diff` per step | written by the agent | `tests/parabank.e2e.spec.ts` |
| 4. Static check | `npm run pack -- validate examples/parabank/session examples/parabank/tests/parabank.e2e.spec.ts` | 14 ok, 0 missing |
| 5. Run | `cd examples/parabank && npx playwright test` | 6 tests |
| 6. Drift check by replay | `npm run pack -- verify examples/parabank/session --vars=examples/parabank/.auth/vars.json` | 13/13 steps (registers a fresh user each replay); 347 ok, 0 gone, 2 account-number links reported as data |

## The E2E spec

UI actions are cross-checked through the REST API (`tests/parabank-api.ts`) and the other way round:

1. Register in the UI; the API login returns the customer, one CHECKING account at $515.50, also shown in Accounts Overview.
2. Open a SAVINGS account in the UI; the API lists it with $100.00 moved from checking.
3. Transfer $25 in the UI; both API balances move by $25.
4. Pay a bill in the UI; the API transactions-by-amount and the UI Find Transactions both show "Bill Payment to Electric Co".
5. Transfer $7.77 through the API; Accounts Overview and Find Transactions show it in the UI.
6. Log out; a wrong password shows the UI error and the API login returns 400.

The spec uses only generated page-object members plus role/name lookups that `validate` confirmed in the snapshots.

## What running it on a real app found and fixed in PageSnap

- Unlabeled inputs (`<td>First Name:</td><td><input name="customer.firstName">`) were given role locators named after
  their `name` attribute. Playwright's accessible name for them is empty, so those locators never matched. Role locators
  now use the real accessible name only; `verify` went from 22/35 to 35/35 on the register page.
- `<input type="submit" value="Register">` had no name; it is now `button "Register"`.
- Ids with dots were emitted as `#customer.firstName` (id `customer` + class `firstName`); they are now
  `[id="customer.firstName"]`. `validate` flagged it before any test ran.
- Site chrome (left menu, header, footer) was repeated in every step's answer; it is now stored once.
- Account-number links were turned into page-object members; data-named controls are now skipped.

## Replay notes

- The capture records each action; `replay.json` declares the username fresh (`ps{ts}`) and the password secret.
- Account ids differ for every new user, so recorded `<select>` values fall back to the option position.
- Two capture fixes came from replaying here: a field with a per-render UUID id (`payee.phoneNumber`) is no longer
  located by that id, and a link-text fallback for header/footer links that matched twice is now rejected.

## Notes

- The first page load URL-rewrites `;jsessionid=` and the demo's proxy rejects it ("matrix parameter separator");
  the spec and `login.ts` load the home page twice to get the cookie first.
- The demo is shared and occasionally slow: the config uses one worker and one retry. In 3 runs: 2 clean, 1 passed on retry.
- `.auth/` (credentials and storage state for the throwaway demo user) is git-ignored.
