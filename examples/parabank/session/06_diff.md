# Diff step 5 → 6

- Step 5 URL: https://parabank.parasoft.com/parabank/openaccount.htm
- Step 6 URL: https://parabank.parasoft.com/parabank/transfer.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

+ # <select> "toAccountId":
+ - combobox "fromAccountId":
+ - combobox "toAccountId":
+ - option "18561" [selected]
+ - option "18561" [selected]
+ - option "18672"
+ - option "18672"
+ options:  # native <select> - available without opening UI
+ options:  # native <select> - available without opening UI
- # <select> "type":

## Added

+ #   - 18561 (selected)
+ #   - 18672
+ #   - 18672
+ - button "Transfer":
+ - form:
+ - heading "Transfer Funds" [level=1]
+ - text "Amount:"
+ - text "From account # to account #"
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
+ value: "18561"
+ value: "18561"
+ value: "Transfer"

## Removed

- #   - CHECKING
- #   - SAVINGS (selected)
- - heading "Account Opened!" [level=1]
- - link "18672":
- - text "Congratulations, your account is now open."
- - text "Your new account number:"
- - {by: role, value: "link", name: "18672", stability: medium, score: 95}
