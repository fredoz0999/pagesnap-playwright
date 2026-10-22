# Diff step 11 → 12

- Step 11 URL: https://parabank.parasoft.com/parabank/findtrans.htm
- Step 12 URL: https://parabank.parasoft.com/parabank/index.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

- # --- All <select> options ---
- # <select> "accountId":

## Added

+ - button "Log In":
+ - form:
+ - heading "Customer Login" [level=2]
+ - heading "LATEST NEWS" [level=4]
+ - link "Account History":
+ - link "Check Balances":
+ - link "Forgot login info?":
+ - link "Make Deposits":
+ - link "New! Online Account Transfers":
+ - link "New! Online Bill Pay":
+ - link "ParaBank Is Now Re-Opened":
+ - link "Read More" [dup 1/2]:
+ - link "Read More" [dup 2/2]:
+ - link "Register":
+ - link "Transfer Funds" [dup 1/2]:
+ - link "Transfer Funds" [dup 2/2]:
+ - link "Withdraw Funds":
+ - list
+ - list
+ - listitem
+ - listitem
+ - listitem
+ - listitem
+ - listitem
+ - text "Password"
+ - text "Username"
+ - textbox "password":
+ - textbox "username":
+ - {by: css, value: "#rightPanel > p:nth-child(4) > a:nth-child(1)", stability: low, score: 60}
+ - {by: css, value: "#rightPanel > p:nth-child(7) > a:nth-child(1)", stability: low, score: 60}
+ - {by: css, value: "#rightPanel > ul:nth-child(2) > li:nth-child(3) > a:nth-child(1)", stability: low, score: 60}
+ - {by: css, value: "#rightPanel > ul:nth-child(3) > li:nth-child(4) > a:nth-child(1)", stability: low, score: 60}
+ - {by: name, value: "login", stability: high, score: 88}
+ - {by: name, value: "password", stability: high, score: 88}
+ - {by: name, value: "username", stability: high, score: 88}
+ - {by: role, value: "button", name: "Log In", stability: medium, score: 95}
+ - {by: role, value: "link", name: "Account History", stability: medium, score: 95}
+ - {by: role, value: "link", name: "Check Balances", stability: medium, score: 95}
+ - {by: role, value: "link", name: "Forgot login info?", stability: medium, score: 95}
+ - {by: role, value: "link", name: "Make Deposits", stability: medium, score: 95}
+ - {by: role, value: "link", name: "New! Online Account Transfers", stability: medium, score: 95}
+ - {by: role, value: "link", name: "New! Online Bill Pay", stability: medium, score: 95}
+ - {by: role, value: "link", name: "ParaBank Is Now Re-Opened", stability: medium, score: 95}
+ - {by: role, value: "link", name: "Register", stability: medium, score: 95}
+ - {by: role, value: "link", name: "Withdraw Funds", stability: medium, score: 95}
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ value: ""
+ value: "***"
+ value: "Log In"

## Removed

- #   - 18561 (selected)
- #   - 18672
- #   headers: Date | Transaction | Debit (-) | Credit (+)
- #   row 1: 10-21-2026 | Bill Payment to Electric Co | $12.34 |
- # table "transactionTable":
- - cell
- - cell "$12.34"
- - cell "10-21-2026"
- - cell "Bill Payment to Electric Co"
- - columnheader "Credit (+)"
- - columnheader "Date"
- - columnheader "Debit (-)"
- - columnheader "Transaction"
- - heading "Account Services" [level=2]
- - heading "Transaction Results" [level=1]
- - link "Accounts Overview":
- - link "Bill Payment to Electric Co":
- - link "Find Transactions":
- - link "Log Out":
- - link "Open New Account":
- - link "Request Loan":
- - link "Transfer Funds":
- - link "Update Contact Info":
- - row
- - row
- - table
- - text "Page Snap"
- - text "Welcome"
- - {by: role, value: "link", name: "Accounts Overview", stability: medium, score: 95}
- - {by: role, value: "link", name: "Bill Payment to Electric Co", stability: medium, score: 95}
- - {by: role, value: "link", name: "Find Transactions", stability: medium, score: 95}
- - {by: role, value: "link", name: "Log Out", stability: medium, score: 95}
- - {by: role, value: "link", name: "Open New Account", stability: medium, score: 95}
- - {by: role, value: "link", name: "Request Loan", stability: medium, score: 95}
- - {by: role, value: "link", name: "Transfer Funds", stability: medium, score: 95}
- - {by: role, value: "link", name: "Update Contact Info", stability: medium, score: 95}
