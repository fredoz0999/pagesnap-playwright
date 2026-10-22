# Diff step 5 → 6

- Step 5 URL: https://parabank.parasoft.com/parabank/openaccount.htm
- Step 6 URL: https://parabank.parasoft.com/parabank/transfer.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

+ # <select> "toAccountId":
+ - combobox "fromAccountId":
+ - combobox "toAccountId":
+ - option "13566" [selected]
+ - option "13566" [selected]
+ - option "13677"
+ - option "13677"
+ options:  # native <select> - available without opening UI
+ options:  # native <select> - available without opening UI
- # <select> "type":

## Added

+ #   - 13566 (selected)
+ #   - 13677
+ #   - 13677
+ - button "Transfer":
+ - form:
+ - heading "Transfer Funds" [level=1]
+ - textbox "input":
+ - {by: id, value: "amount", stability: high, score: 90}
+ - {by: id, value: "fromAccountId", stability: high, score: 90}
+ - {by: id, value: "toAccountId", stability: high, score: 90}
+ - {by: id, value: "transferForm", stability: high, score: 90}
+ - {by: role, value: "button", name: "Transfer", stability: medium, score: 95}
+ locators:
+ locators:
+ locators:
+ locators:
+ value: ""
+ value: "13566"
+ value: "13566"
+ value: "Transfer"

## Removed

- #   - CHECKING
- #   - SAVINGS (selected)
- - heading "Account Opened!" [level=1]
- - link "13677":
- - {by: role, value: "link", name: "13677", stability: medium, score: 95}
