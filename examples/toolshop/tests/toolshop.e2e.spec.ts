/**
 * Toolshop (Angular SPA) shopping flow, UI cross-checked against the REST API.
 * Written from the PageSnap session: page objects from `pack pom`
 * (tests/pages), assertions from `pack query --diff` per flow step.
 * Step numbers refer to session/flow.md.
 *
 * A fresh customer is registered through the API (shared demo accounts get locked).
 */
import { expect, test, type Page } from "@playwright/test";
import { CheckoutPage, HomePage, ProductPage } from "./pages";
import { ToolshopApi, type Customer, type Product } from "./toolshop-api";

const customer: Customer = { email: `e2e${Date.now()}@example.com`, password: "Pagesnap#2026x", first: "Page", last: "Snap" };
let hammer: Product;
let cartId = "";

test.describe.configure({ mode: "serial" });

const money = (n: number) => "$" + n.toFixed(2);
const cartIdOf = (page: Page) => page.evaluate(() => sessionStorage.getItem("cart_id") || "");

test.beforeAll(async ({ request }) => {
  const api = new ToolshopApi(request);
  await api.register(customer);
  // the shared demo's stock moves: take the cheapest in-stock hammer that allows quantity 2
  // (Thor Hammer is capped at one per cart by design)
  hammer = (await api.productsSorted("hammer", "price,asc")).find((p) => p.in_stock !== false && p.name !== "Thor Hammer")!;
  expect(hammer, "an in-stock hammer exists in the catalog").toBeTruthy();
});

test("step 1-2: UI search shows exactly the products the API search returns", async ({ page, request }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.searchQueryInput.fill("hammer");
  await home.searchSubmitButton.click();
  await expect(home.searchCompleted).toBeAttached();
  await expect(home.searchCaptionHeading).toHaveText("Searched for: hammer");

  const api = await new ToolshopApi(request).search("hammer");
  await expect(home.searchResultCount).toHaveText(`${api.total} products found for 'hammer'`);
  const uiNames = await page.getByRole("heading", { level: 5 }).allInnerTexts();
  expect(uiNames.map((n) => n.trim()).sort()).toEqual(api.data.map((p) => p.name).sort());
});

test("step 3: sort by price low to high matches the API price order", async ({ page, request }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.searchQueryInput.fill("hammer");
  await home.searchSubmitButton.click();
  await expect(home.searchCompleted).toBeAttached();
  await home.sortSelect.selectOption({ label: "Price (Low - High)" });
  await expect(home.sortingCompleted).toBeAttached();

  const sorted = await new ToolshopApi(request).productsSorted("hammer", "price,asc");
  const uiNames = (await page.getByRole("heading", { level: 5 }).allInnerTexts()).map((n) => n.trim());
  expect(uiNames).toEqual(sorted.map((p) => p.name));
});

test("step 4-6: product price matches the API, quantity 2 lands in the API cart with the right totals", async ({ page, request }) => {
  const product = new ProductPage(page);
  await product.goto(hammer.id);
  await expect(product.productNameHeading).toHaveText(hammer.name);
  await expect(product.unitPrice).toHaveText(hammer.price.toFixed(2));

  await product.increaseQuantityButton.click();
  await expect(product.quantityInput).toHaveValue("2");
  await product.addToCartButton.click();
  await expect(page.getByRole("alert")).toContainText("Product added to shopping cart.");
  await expect(product.cartQuantity).toHaveText("2");

  cartId = await cartIdOf(page);
  expect(cartId).not.toBe("");
  const apiCart = await new ToolshopApi(request).cart(cartId);
  expect(apiCart.cart_items).toHaveLength(1);
  expect(apiCart.cart_items[0].quantity).toBe(2);
  expect(apiCart.cart_items[0].product.name).toBe(hammer.name);

  const checkout = new CheckoutPage(page);
  await checkout.navCartLink.click();
  await expect(checkout.productTitle).toHaveText(hammer.name);
  await expect(checkout.productQuantityInput).toHaveValue("2");
  await expect(checkout.linePrice).toHaveText(money(2 * hammer.price));
  await expect(checkout.cartTotal).toHaveText(money(2 * hammer.price));
});

test("step 7-13: API-registered customer checks out in the UI; the API has the invoice", async ({ page, request }) => {
  // the cart lives in sessionStorage; rebuild it in this test's fresh page
  const product = new ProductPage(page);
  await product.goto(hammer.id);
  await product.increaseQuantityButton.click();
  await product.addToCartButton.click();
  await expect(product.cartQuantity).toHaveText("2");

  const checkout = new CheckoutPage(page);
  await checkout.navCartLink.click();
  await checkout.proceed1Button.click();
  await checkout.emailInput.fill(customer.email);
  await checkout.passwordInput.fill(customer.password);
  await checkout.loginSubmitButton.click();
  await checkout.proceed2Button.click();

  // address comes from the API registration
  await expect(checkout.streetInput).toHaveValue("1 Test Way");
  await expect(checkout.cityInput).toHaveValue("Chantilly");
  // Country + postal code + house number triggers GET /postcode-lookup, which rewrites
  // street/city/state in the form (the UI hint says so). Wait for it, then check the
  // form shows the lookup result before proceeding; reading the form earlier races it.
  const lookup = page.waitForResponse((r) => r.url().includes("/postcode-lookup"));
  await checkout.houseNumberInput.fill("12");
  await checkout.houseNumberInput.blur();
  const found = await (await lookup).json();
  await expect(checkout.streetInput).toHaveValue(found.street);
  await expect(checkout.cityInput).toHaveValue(found.city);
  const billed = { street: found.street as string, city: found.city as string };
  await expect(checkout.proceed3Button).toBeEnabled();
  await checkout.proceed3Button.click();

  await checkout.paymentMethodSelect.selectOption({ label: "Cash on Delivery" });
  await checkout.finishButton.click();
  await expect(checkout.paymentSuccessMessage).toHaveText("Payment was successful");
  // same button, relabelled from "Check payment" to "Confirm" once the payment check passes
  await expect(checkout.finishButton).toHaveText(/Confirm/);
  await expect(checkout.finishButton).toBeEnabled();
  await checkout.finishButton.click();

  await expect(page.getByText("Thanks for your order!")).toBeVisible({ timeout: 30_000 });
  const invoiceNumber = (await page.getByText(/^INV-\d+$/).innerText()).trim();

  const api = new ToolshopApi(request);
  expect(await api.login(customer.email, customer.password)).toBe(200);
  const listed = (await api.invoices()).find((i) => i.invoice_number === invoiceNumber);
  expect(listed, "invoice " + invoiceNumber + " in GET /invoices").toBeTruthy();
  const invoice = await api.invoice(listed!.id);
  expect(invoice.total).toBeCloseTo(2 * hammer.price, 2);
  expect(invoice.invoicelines.map((l) => [l.product_id, l.quantity, l.unit_price])).toEqual([[hammer.id, 2, hammer.price]]);
  expect(invoice.billing_postal_code).toBe("20151");
  expect({ street: invoice.billing_street, city: invoice.billing_city }).toEqual(billed);
});

test("step 8 (negative): wrong password is rejected in the UI and by the API", async ({ page, request }) => {
  const product = new ProductPage(page);
  await product.goto(hammer.id);
  await product.addToCartButton.click();
  const checkout = new CheckoutPage(page);
  await checkout.navCartLink.click();
  await checkout.proceed1Button.click();
  await checkout.emailInput.fill(customer.email);
  await checkout.passwordInput.fill("wrong-password");
  await checkout.loginSubmitButton.click();
  await expect(checkout.loginError).toHaveText("Invalid email or password");
  await expect(checkout.proceed2Button).toBeHidden();

  expect(await new ToolshopApi(request).login(customer.email, "wrong-password")).toBe(401);
});
