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
+ - option "13566" [selected]
+ - option "CHECKING" [selected]
+ - option "SAVINGS"
+ options:  # native <select> - available without opening UI
+ options:  # native <select> - available without opening UI

## Added

+ #   - 13566 (selected)
+ #   - CHECKING (selected)
+ #   - SAVINGS
+ - button "Open New Account":
+ - form:
+ - heading "Open New Account" [level=1]
+ - {by: css, value: "#openAccountForm > form:nth-child(2)", stability: low, score: 60}
+ - {by: id, value: "fromAccountId", stability: high, score: 90}
+ - {by: id, value: "type", stability: high, score: 90}
+ - {by: role, value: "button", name: "Open New Account", stability: medium, score: 95}
+ locators:
+ locators:
+ locators:
+ value: "0"
+ value: "13566"
+ value: "Open New Account"

## Removed

- #   headers: Account | Balance* | Available Amount
- #   row 1: 13566 | $515.50 | $515.50
- #   row 2: Total | $515.50 |
- # table "accountTable":
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - columnheader
- - columnheader
- - columnheader
- - heading "Accounts Overview" [level=1]
- - link "13566":
- - row
- - row
- - row
- - row
- - table
- - {by: role, value: "link", name: "13566", stability: medium, score: 95}
