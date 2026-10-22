# Diff step 3 → 4

- Step 3 URL: https://parabank.parasoft.com/parabank/overview.htm
- Step 4 URL: https://parabank.parasoft.com/parabank/openaccount.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

+ # --- All <select> options ---
+ # <select> "fromAccountId":
+ # <select> "type":
+ - combobox "fromAccountId":
+ - combobox "type":
+ - option "20115" [selected]
+ - option "CHECKING" [selected]
+ - option "SAVINGS"
+ options:  # native <select> - available without opening UI
+ options:  # native <select> - available without opening UI

## Added

+ #   - 20115 (selected)
+ #   - CHECKING (selected)
+ #   - SAVINGS
+ - button "Open New Account":
+ - form:
+ - heading "Open New Account" [level=1]
+ - text "A minimum of $100.00 must be deposited into this account at time of opening. Please choose an existing account to transfer funds into the new account."
+ - text "What type of Account would you like to open?"
+ - {by: css, value: "#openAccountForm > form:nth-child(2)", stability: low, score: 60}
+ - {by: id, value: "fromAccountId", stability: high, score: 90}
+ - {by: id, value: "type", stability: high, score: 90}
+ - {by: role, value: "button", name: "Open New Account", stability: medium, score: 95}
+ locators:
+ locators:
+ locators:
+ value: "0"
+ value: "20115"
+ value: "Open New Account"

## Removed

- #   headers: Account | Balance* | Available Amount
- #   row 1: 20115 | $515.50 | $515.50
- #   row 2: Total | $515.50 |
- # table "accountTable":
- - cell
- - cell "$515.50" [dup 1/3]
- - cell "$515.50" [dup 2/3]
- - cell "$515.50" [dup 3/3]
- - cell "*Balance includes deposits that may be subject to holds"
- - cell "20115"
- - cell "Total"
- - columnheader "Account"
- - columnheader "Available Amount"
- - columnheader "Balance*"
- - heading "Accounts Overview" [level=1]
- - link "20115":
- - row
- - row
- - row
- - row
- - table
- - {by: role, value: "link", name: "20115", stability: medium, score: 95}
