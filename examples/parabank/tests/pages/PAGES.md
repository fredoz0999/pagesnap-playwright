# Page objects (generated)

Use these members in specs instead of raw selectors. `import { LoginPage } from './pages';`

## BasePage (on half or more of the pages; every page class extends it)
- aboutUsLink = link "About Us"
- servicesLink = link "Services"
- productsLink = link "Products"
- locationsLink = link "Locations"
- adminPageLink = link "Admin Page"
- homeLink = link "home"
- aboutLink = link "about"
- contactLink = link "contact"
- homeLink2 = link "Home"
- aboutUsLink2 = link "About Us"
- servicesLink2 = link "Services"
- productsLink2 = link "Products"
- locationsLink2 = link "Locations"
- siteMapLink = link "Site Map"
- contactUsLink = link "Contact Us"
- wwwParasoftComLink = link "www.parasoft.com"
- openNewAccountLink = link "Open New Account"
- accountsOverviewLink = link "Accounts Overview"
- transferFundsLink = link "Transfer Funds"
- billPayLink = link "Bill Pay"
- findTransactionsLink = link "Find Transactions"
- updateContactInfoLink = link "Update Contact Info"
- requestLoanLink = link "Request Loan"
- logOutLink = link "Log Out"

## RegisterPage /parabank/register.htm (steps 1,2)
- link = link
- link2 = link
- usernameInput = textbox "username"
- passwordInput = textbox "password"
- logInButton = button "Log In"
- forgotLoginInfoLink = link "Forgot login info?"
- registerLink = link "Register"
- customerFirstNameInput = textbox "customer.firstName"
- customerLastNameInput = textbox "customer.lastName"
- customerAddressStreetInput = textbox "customer.address.street"
- customerAddressCityInput = textbox "customer.address.city"
- customerAddressStateInput = textbox "customer.address.state"
- customerAddressZipCodeInput = textbox "customer.address.zipCode"
- customerPhoneNumberInput = textbox "customer.phoneNumber"
- customerSsnInput = textbox "customer.ssn"
- customerUsernameInput = textbox "customer.username"
- customerPasswordInput = textbox "customer.password"
- repeatedPasswordInput = textbox "repeatedPassword"
- registerButton = button "Register"

## OverviewPage /parabank/overview.htm (steps 3)

## OpenaccountPage /parabank/openaccount.htm (steps 4,5)
- typeSelect = combobox "type"
- fromAccountIdSelect = combobox "fromAccountId"
- openNewAccountButton = button "Open New Account"

## TransferPage /parabank/transfer.htm (steps 6,7)
- amountInput = textbox "input"
- fromAccountIdSelect = combobox "fromAccountId"
- toAccountIdSelect = combobox "toAccountId"
- transferButton = button "Transfer"

## BillpayPage /parabank/billpay.htm (steps 8,9)
- payeeNameInput = textbox "payee.name"
- payeeAddressStreetInput = textbox "payee.address.street"
- payeeAddressCityInput = textbox "payee.address.city"
- payeeAddressStateInput = textbox "payee.address.state"
- payeeAddressZipCodeInput = textbox "payee.address.zipCode"
- payeePhoneNumberInput = textbox "payee.phoneNumber"
- payeeAccountNumberInput = textbox "payee.accountNumber"
- verifyAccountInput = textbox "verifyAccount"
- amountInput = textbox "amount"
- fromAccountIdSelect = combobox "fromAccountId"
- sendPaymentButton = button "Send Payment"

## FindtransPage /parabank/findtrans.htm (steps 10,11)
- accountIdSelect = combobox "accountId"
- transactionIdInput = textbox "transactionId"
- findByIdButton = button "Find Transactions"
- transactionDateInput = textbox "transactionDate"
- findByDateButton = button "Find Transactions"
- fromDateInput = textbox "fromDate"
- toDateInput = textbox "toDate"
- findByDateRangeButton = button "Find Transactions"
- amountInput = textbox "amount"
- findByAmountButton = button "Find Transactions"
- billPaymentToElectricCoLink = link "Bill Payment to Electric Co"

## HomePage /parabank/index.htm (steps 12)
- usernameInput = textbox "username"
- passwordInput = textbox "password"
- logInButton = button "Log In"
- forgotLoginInfoLink = link "Forgot login info?"
- registerLink = link "Register"
- withdrawFundsLink = link "Withdraw Funds"
- transferFundsLink2 = link "Transfer Funds"
- checkBalancesLink = link "Check Balances"
- makeDepositsLink = link "Make Deposits"
- accountHistoryLink = link "Account History"
- transferFundsLink3 = link "Transfer Funds"
- paraBankIsNowReOpenedLink = link "ParaBank Is Now Re-Opened"
- newOnlineBillPayLink = link "New! Online Bill Pay"
- newOnlineAccountTransfersLink = link "New! Online Account Transfers"

## LoginPage /parabank/login.htm (steps 13)
- usernameInput = textbox "username"
- passwordInput = textbox "password"
- logInButton = button "Log In"
- forgotLoginInfoLink = link "Forgot login info?"
- registerLink = link "Register"
