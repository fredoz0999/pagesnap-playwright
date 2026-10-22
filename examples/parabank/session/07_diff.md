# Diff step 6 → 7

Both steps were captured on the same URL: https://parabank.parasoft.com/parabank/transfer.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

- - combobox "fromAccountId":
- - combobox "toAccountId":
- - option "15009" [selected]
- - option "15009" [selected]
- - option "15120"
- - option "15120"
- options:  # native <select> - available without opening UI
- options:  # native <select> - available without opening UI

## Added

+ #   - 15009
+ #   - 15120 (selected)
+ - heading "Transfer Complete!" [level=1]
+ - text "See Account Activity for more details."
+ - text "has been transferred from account # to account # ."

## Removed

- #   - 15009 (selected)
- #   - 15120
- - button "Transfer":
- - form:
- - heading "Transfer Funds" [level=1]
- - text "Amount:"
- - text "From account # to account #"
- - textbox "input":
- - {by: id, value: "amount", stability: high, score: 80}
- - {by: id, value: "fromAccountId", stability: high, score: 80}
- - {by: id, value: "toAccountId", stability: high, score: 80}
- - {by: id, value: "transferForm", stability: high, score: 80}
- - {by: role, value: "button", name: "Transfer", stability: medium, score: 95}
- locators:
- locators:
- locators:
- locators:
- locators:
- value: ""
- value: "15009"
- value: "15009"
- value: "Transfer"
