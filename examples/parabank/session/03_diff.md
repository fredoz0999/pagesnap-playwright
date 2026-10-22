# Diff step 2 → 3

- Step 2 URL: https://parabank.parasoft.com/parabank/register.htm
- Step 3 URL: https://parabank.parasoft.com/parabank/overview.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Added

+ #   headers: Account | Balance* | Available Amount
+ #   row 1: 13566 | $515.50 | $515.50
+ #   row 2: Total | $515.50 |
+ # table "accountTable":
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - columnheader
+ - columnheader
+ - columnheader
+ - heading "Accounts Overview" [level=1]
+ - link "13566":
+ - row
+ - row
+ - row
+ - row
+ - table
+ - {by: role, value: "link", name: "13566", stability: medium, score: 95}
+ locators:

## Removed

- - heading "Welcome psmvis00cs" [level=1]
