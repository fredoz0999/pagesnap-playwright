# Diff step 2 → 3

- Step 2 URL: https://parabank.parasoft.com/parabank/register.htm
- Step 3 URL: https://parabank.parasoft.com/parabank/overview.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Added

+ #   headers: Account | Balance* | Available Amount
+ #   row 1: 15009 | $515.50 | $515.50
+ #   row 2: Total | $515.50 |
+ # table "accountTable":
+ - cell
+ - cell "$515.50" [dup 1/3]
+ - cell "$515.50" [dup 2/3]
+ - cell "$515.50" [dup 3/3]
+ - cell "*Balance includes deposits that may be subject to holds"
+ - cell "15009"
+ - cell "Total"
+ - columnheader "Account"
+ - columnheader "Available Amount"
+ - columnheader "Balance*"
+ - heading "Accounts Overview" [level=1]
+ - link "15009":
+ - row
+ - row
+ - row
+ - row
+ - table
+ - {by: role, value: "link", name: "15009", stability: medium, score: 95}
+ locators:

## Removed

- - heading "Welcome psmviz0h21" [level=1]
- - text "Your account was created successfully. You are now logged in."
