# Toolshop: PageSnap on an Angular single-page app

[Toolshop](https://practicesoftwaretesting.com) is a public demo store (Angular 20, `data-test` attributes) with a REST
API at `api.practicesoftwaretesting.com`. This is the shopping flow end to end.

| Step | Command | Result |
|---|---|---|
| 1. Capture 13 UI states (new customer registered through the API each run) | `npx tsx examples/toolshop/capture.ts` | `session/` |
| 2. Page objects, no LLM | `npm run pack -- pom examples/toolshop/session --out=examples/toolshop/tests/pages` | `HomePage`, `ProductPage` (`/product/:id`), `CheckoutPage`, `BasePage`; 97 members |
| 3. Spec from PAGES.md + `pack query --diff` per step | written by the agent | `tests/toolshop.e2e.spec.ts` |
| 4. Static check | `npm run pack -- validate examples/toolshop/session examples/toolshop/tests/toolshop.e2e.spec.ts` | 4 ok, 0 missing |
| 5. Run | `cd examples/toolshop && npx playwright test` | 5 passed, 3 runs in a row |
| 6. Drift check by replay | `npm run pack -- verify examples/toolshop/session --vars=examples/toolshop/.auth/vars.json` | 13/13 steps reached and checked; 530-532 locators ok, 0-2 gone (a promo banner the site shows at random) |

## The E2E spec

1. Search "hammer" in the UI: the result count and the product names equal `GET /products/search?q=hammer`.
2. Sort by price low to high: the UI order equals `GET /products?q=hammer&sort=price,asc`.
3. Product page price equals `GET /products/{id}`; quantity 2 + Add to cart puts exactly 2 Claw Hammers in
   `GET /carts/{cart_id}` (id read from the SPA's sessionStorage); cart line price and total are 2 x unit price.
4. A customer registered through the API checks out in the UI (sign in, billing address, Cash on Delivery, Confirm);
   the invoice number shown in the UI is in `GET /invoices`, and `GET /invoices/{id}` has the right total, line
   (product, quantity 2, unit price) and billing address.
5. Wrong password: the UI shows "Invalid email or password" and `POST /users/login` returns 401.

## What this run found and fixed in PageSnap

- Toolshop puts `data-test` on table cells (`cart-total`). Only actionable roles got locators, so the cart total
  had none; any element with a test id now gets locators. Table footers (totals) are now in the tables block.
- The order confirmation ("Thanks for your order! Your invoice number is INV-...") is plain text in a `<div>` and was
  not captured; visible free text that no named element already carries is now captured.
- A menuitem wrapping a dropdown got a role locator whose name Playwright computes differently. Role locators are
  now re-checked with Playwright's `getByRole` at capture time and replaced when they do not resolve.
- `/product/01M5GHZ87CWW...` produced a class named after the id; record ids in paths become `:id`
  (`ProductPage.goto(id)`). Product cards ("Claw Hammer ABCDE$11.48") and repeated positional "Compare" buttons are
  no longer page-object members; three "Proceed to checkout" buttons are named `proceed1Button`..`proceed3Button`.
- An SPA renders after load: `verify` now counts repeatedly until the result stops improving, and judges page state
  by page-specific locators (site chrome is present in every state).
- The first capture of the search page was taken before results re-rendered (old grid, wrong count). The driver
  now waits for the app's own `search_completed` / `sorting_completed` markers.

## Things worth knowing about this app

- Entering a house number triggers `GET /postcode-lookup`, which rewrites street and city in the form with the
  lookup result. The spec waits for that response and then checks the invoice bills the looked-up address. An early
  version read the form before the lookup landed and looked like a billing bug; it was a race in the test.
- Shared demo accounts get locked by other users, so every run registers a new customer through the API.
- Opening URLs (`verify --by-url`) only reaches 5 of 13 steps: search results and the checkout wizard need app
  state. Replaying the recorded flow reaches all 13. Two things the replay had to learn on this app: the billing
  form validates on blur (Proceed stays disabled until the field is left), and the address prefill can land after
  the house number was typed and wipe it, so replay leaves each field and retypes a value that did not stick.
