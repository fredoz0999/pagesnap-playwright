# Diff step 8 → 9

Both steps were captured on the same URL: https://parabank.parasoft.com/parabank/billpay.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

- - combobox "fromAccountId":
- - option "18561" [selected]
- - option "18672"
- options:  # native <select> - available without opening UI

## Added

+ - heading "Bill Payment Complete" [level=1]
+ - text "Bill Payment to in the amount of from account was successful."
+ - text "Electric Co"
+ - text "See Account Activity for more details."

## Removed

- #   row 1: Payee Name: |  |
- #   row 2: Address: |  |
- #   row 3: City: |  |
- # table "table-0":
- - button "Send Payment":
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell
- - cell "18561 18672"
- - cell "Account #:"
- - cell "Address:"
- - cell "Amount: $"
- - cell "City:"
- - cell "From account #:"
- - cell "Payee Name:"
- - cell "Phone #:"
- - cell "State:"
- - cell "Verify Account #:"
- - cell "Zip Code:"
- - form:
- - heading "Bill Payment Service" [level=1]
- - row
- - row
- - row
- - row
- - row
- - row
- - row
- - row
- - row
- - row
- - row
- - row
- - row
- - row
- - table
- - text "Enter payee information"
- - textbox "amount":
- - textbox "payee.accountNumber":
- - textbox "payee.address.city":
- - textbox "payee.address.state":
- - textbox "payee.address.street":
- - textbox "payee.address.zipCode":
- - textbox "payee.name":
- - textbox "payee.phoneNumber":
- - textbox "verifyAccount":
- - {by: css, value: "#billpayForm > form:nth-child(3)", stability: low, score: 60}
- - {by: name, value: "amount", stability: high, score: 88}
- - {by: name, value: "fromAccountId", stability: high, score: 88}
- - {by: name, value: "payee.accountNumber", stability: high, score: 88}
- - {by: name, value: "payee.address.city", stability: high, score: 88}
- - {by: name, value: "payee.address.state", stability: high, score: 88}
- - {by: name, value: "payee.address.street", stability: high, score: 88}
- - {by: name, value: "payee.address.zipCode", stability: high, score: 88}
- - {by: name, value: "payee.name", stability: high, score: 88}
- - {by: name, value: "payee.phoneNumber", stability: high, score: 88}
- - {by: name, value: "verifyAccount", stability: high, score: 88}
- - {by: role, value: "button", name: "Send Payment", stability: medium, score: 95}
- locators:
- locators:
