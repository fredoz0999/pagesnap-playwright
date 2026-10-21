import { test, expect } from "@playwright/test";

test("add two items and check the cart", async ({ page }) => {
  await page.goto("https://www.saucedemo.com/");
  await page.getByTestId("username").fill("standard_user");
  await page.getByPlaceholder("Password").fill("secret_sauce");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("title")).toHaveText("Products");
  await page.getByTestId("add-to-cart-sauce-labs-backpack").click();
  await page.getByTestId("add-to-cart-sauce-labs-bike-light").click();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await expect(page.getByTestId("shopping-cart-badge")).toHaveText("2");
  await page.getByTestId("shopping-cart-link").click();
  await expect(page.getByRole("link", { name: "Sauce Labs Backpack" })).toBeVisible();
  await page.locator("#checkout").click();
  await page.getByTestId("checkout-button").click();
  await page.getByLabel("First Name").fill("Fred");
  await page.locator(`[data-test="remove-${"x"}"]`).click();
});
