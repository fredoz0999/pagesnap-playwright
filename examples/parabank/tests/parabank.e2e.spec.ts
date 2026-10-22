/**
 * Parabank end-to-end: UI flow cross-checked against the REST API, and API
 * actions cross-checked in the UI. Written from the PageSnap session:
 * page objects come from `pack pom` (tests/pages), assertions from the
 * `pack query --diff` results per flow step. No hand-picked selectors.
 *
 * One fresh customer per run (the public demo DB is shared), tests run in order.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  BillpayPage, FindtransPage, HomePage, LoginPage, OpenaccountPage, OverviewPage, RegisterPage, TransferPage,
} from "./pages";
import { ParabankApi, type Account } from "./parabank-api";

const user = {
  username: "e2e" + Date.now().toString(36),
  password: "Pagesnap#1",
};
const INITIAL_BALANCE = 515.5; // every new Parabank customer starts with one $515.50 checking account

let customerId = 0;
let checking: Account;
let savings: Account;

test.describe.configure({ mode: "serial" });

/** The demo URL-rewrites ;jsessionid= on the first response and then rejects it; load once to get the cookie. */
async function warmSession(page: Page) {
  await page.goto(HomePage.path);
  await page.goto(HomePage.path);
}

async function login(page: Page) {
  await warmSession(page);
  const home = new HomePage(page);
  await home.usernameInput.fill(user.username);
  await home.passwordInput.fill(user.password);
  await home.logInButton.click();
  await expect(home.logOutLink).toBeVisible();
}

test("step 1-3: register in the UI, the API sees the new customer and opening balance", async ({ page, request }) => {
  await warmSession(page);
  const reg = new RegisterPage(page);
  await reg.goto();
  await reg.customerFirstNameInput.fill("Page");
  await reg.customerLastNameInput.fill("Snap");
  await reg.customerAddressStreetInput.fill("1 Test Way");
  await reg.customerAddressCityInput.fill("Chantilly");
  await reg.customerAddressStateInput.fill("VA");
  await reg.customerAddressZipCodeInput.fill("20151");
  await reg.customerPhoneNumberInput.fill("5550100");
  await reg.customerSsnInput.fill("123-45-6789");
  await reg.customerUsernameInput.fill(user.username);
  await reg.customerPasswordInput.fill(user.password);
  await reg.repeatedPasswordInput.fill(user.password);
  await reg.registerButton.click();
  await expect(page.getByRole("heading", { name: "Welcome " + user.username })).toBeVisible();

  const api = new ParabankApi(request);
  customerId = (await api.login(user.username, user.password)).id;
  const accounts = await api.accounts(customerId);
  expect(accounts).toHaveLength(1);
  checking = accounts[0];
  expect(checking.type).toBe("CHECKING");
  expect(checking.balance).toBe(INITIAL_BALANCE);

  const overview = new OverviewPage(page);
  await overview.accountsOverviewLink.click();
  await expect(page.getByRole("heading", { name: "Accounts Overview" })).toBeVisible();
  await expect(page.getByRole("table")).toContainText(String(checking.id));
  await expect(page.getByRole("table")).toContainText("$515.50");
});

test("step 4-5: open a savings account in the UI, the API lists it as SAVINGS", async ({ page, request }) => {
  await login(page);
  const open = new OpenaccountPage(page);
  await open.openNewAccountLink.click();
  await open.typeSelect.selectOption({ label: "SAVINGS" });
  await open.fromAccountIdSelect.selectOption(String(checking.id));
  await open.openNewAccountButton.click();
  await expect(page.getByRole("heading", { name: "Account Opened!" })).toBeVisible();

  const api = new ParabankApi(request);
  const accounts = await api.accounts(customerId);
  expect(accounts).toHaveLength(2);
  savings = accounts.find((a) => a.id !== checking.id)!;
  expect(savings.type).toBe("SAVINGS");
  // the UI shows the new account number the API returned
  await expect(page.getByRole("link", { name: String(savings.id), exact: true })).toBeVisible();
  // Parabank funds a new account with $100.00 from the source account
  expect(savings.balance).toBe(100);
  expect((await api.account(checking.id)).balance).toBe(INITIAL_BALANCE - 100);
});

test("step 6-7: transfer $25 in the UI, both API balances move by $25", async ({ page, request }) => {
  const api = new ParabankApi(request);
  const before = { from: (await api.account(checking.id)).balance, to: (await api.account(savings.id)).balance };
  await login(page);
  const transfer = new TransferPage(page);
  await transfer.transferFundsLink.click();
  await transfer.amountInput.fill("25");
  await transfer.fromAccountIdSelect.selectOption(String(checking.id));
  await transfer.toAccountIdSelect.selectOption(String(savings.id));
  await transfer.transferButton.click();
  await expect(page.getByRole("heading", { name: "Transfer Complete!" })).toBeVisible();

  expect((await api.account(checking.id)).balance).toBeCloseTo(before.from - 25, 2);
  expect((await api.account(savings.id)).balance).toBeCloseTo(before.to + 25, 2);
});

test("step 8-11: pay a bill in the UI, the API and Find Transactions both show it", async ({ page, request }) => {
  await login(page);
  const bill = new BillpayPage(page);
  await bill.billPayLink.click();
  await bill.payeeNameInput.fill("Electric Co");
  await bill.payeeAddressStreetInput.fill("2 Power St");
  await bill.payeeAddressCityInput.fill("Reston");
  await bill.payeeAddressStateInput.fill("VA");
  await bill.payeeAddressZipCodeInput.fill("20190");
  await bill.payeePhoneNumberInput.fill("5550111");
  await bill.payeeAccountNumberInput.fill("12345");
  await bill.verifyAccountInput.fill("12345");
  await bill.amountInput.fill("12.34");
  await bill.fromAccountIdSelect.selectOption(String(checking.id));
  await bill.sendPaymentButton.click();
  await expect(page.getByRole("heading", { name: "Bill Payment Complete" })).toBeVisible();

  const tx = await new ParabankApi(request).transactionsByAmount(checking.id, 12.34);
  expect(tx.map((t) => t.description)).toContain("Bill Payment to Electric Co");
  expect(tx.find((t) => t.description === "Bill Payment to Electric Co")!.type).toBe("Debit");

  const find = new FindtransPage(page);
  await find.findTransactionsLink.click();
  await find.accountIdSelect.selectOption(String(checking.id));
  await find.amountInput.fill("12.34");
  await find.findByAmountButton.click();
  await expect(page.getByRole("heading", { name: "Transaction Results" })).toBeVisible();
  await expect(find.billPaymentToElectricCoLink).toBeVisible();
});

test("API -> UI: a transfer made through the API appears in Accounts Overview and Find Transactions", async ({ page, request }) => {
  const api = new ParabankApi(request);
  const msg = await api.transfer(savings.id, checking.id, 7.77);
  expect(msg).toContain("Successfully transferred $7.77");
  const savingsNow = await api.account(savings.id);

  await login(page);
  const overview = new OverviewPage(page);
  await overview.accountsOverviewLink.click();
  const row = page.getByRole("row").filter({ hasText: String(savings.id) });
  await expect(row).toContainText("$" + savingsNow.balance.toFixed(2));

  const find = new FindtransPage(page);
  await find.findTransactionsLink.click();
  await find.accountIdSelect.selectOption(String(savings.id));
  await find.amountInput.fill("7.77");
  await find.findByAmountButton.click();
  await expect(page.getByRole("heading", { name: "Transaction Results" })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Funds Transfer Sent");
});

test("step 12-13: log out, then a wrong password is rejected in the UI and by the API", async ({ page, request }) => {
  await login(page);
  const home = new HomePage(page);
  await home.logOutLink.click();
  await expect(page.getByRole("heading", { name: "Customer Login" })).toBeVisible();

  const loginPage = new LoginPage(page);
  await loginPage.usernameInput.fill(user.username);
  await loginPage.passwordInput.fill("wrong-password");
  await loginPage.logInButton.click();
  await expect(page.getByRole("heading", { name: "Error!" })).toBeVisible();
  await expect(page.getByText("The username and password could not be verified.")).toBeVisible();

  expect(await new ParabankApi(request).loginStatus(user.username, "wrong-password")).toBe(400);
});
