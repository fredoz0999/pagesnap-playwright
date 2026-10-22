# Diff step 7 → 8

- Step 7 URL: https://parabank.parasoft.com/parabank/transfer.htm
- Step 8 URL: https://parabank.parasoft.com/parabank/billpay.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

+ - combobox "fromAccountId":
+ - option "21558" [selected]
+ - option "21669"
+ options:  # native <select> - available without opening UI
- # <select> "toAccountId":

## Added

+ #   row 1: Payee Name: |  |
+ #   row 2: Address: |  |
+ #   row 3: City: |  |
+ # table "table-0":
+ - button "Send Payment":
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell
+ - cell "21558 21669"
+ - cell "Account #:"
+ - cell "Address:"
+ - cell "Amount: $"
+ - cell "City:"
+ - cell "From account #:"
+ - cell "Payee Name:"
+ - cell "Phone #:"
+ - cell "State:"
+ - cell "Verify Account #:"
+ - cell "Zip Code:"
+ - form:
+ - heading "Bill Payment Service" [level=1]
+ - link "About Us":
+ - link "Locations":
+ - link "Products":
+ - link "Services":
+ - row
+ - row
+ - row
+ - row
+ - row
+ - row
+ - row
+ - row
+ - row
+ - row
+ - row
+ - row
+ - row
+ - row
+ - table
+ - text "Enter payee information"
+ - textbox "amount":
+ - textbox "payee.accountNumber":
+ - textbox "payee.address.city":
+ - textbox "payee.address.state":
+ - textbox "payee.address.street":
+ - textbox "payee.address.zipCode":
+ - textbox "payee.name":
+ - textbox "payee.phoneNumber":
+ - textbox "verifyAccount":
+ - {by: css, value: "#billpayForm > form:nth-child(3)", stability: low, score: 60}
+ - {by: name, value: "amount", stability: high, score: 88}
+ - {by: name, value: "fromAccountId", stability: high, score: 88}
+ - {by: name, value: "payee.accountNumber", stability: high, score: 88}
+ - {by: name, value: "payee.address.city", stability: high, score: 88}
+ - {by: name, value: "payee.address.state", stability: high, score: 88}
+ - {by: name, value: "payee.address.street", stability: high, score: 88}
+ - {by: name, value: "payee.address.zipCode", stability: high, score: 88}
+ - {by: name, value: "payee.name", stability: high, score: 88}
+ - {by: name, value: "payee.phoneNumber", stability: high, score: 88}

## Removed

- #   - 21558
- #   - 21669 (selected)
- - heading "Transfer Complete!" [level=1]
- - link "About Us" [dup 1/2]:
- - link "About Us" [dup 2/2]:
- - link "Contact Us":
- - link "Home":
- - link "Locations" [dup 1/2]:
- - link "Locations" [dup 2/2]:
- - link "Products" [dup 1/2]:
- - link "Products" [dup 2/2]:
- - link "Services" [dup 1/2]:
- - link "Services" [dup 2/2]:
- - link "Site Map":
- - link "www.parasoft.com":
- - list
- - list
- - listitem
- - listitem
- - listitem
- - listitem
- - listitem
- - listitem
- - listitem
- - listitem
- - listitem
- - text "See Account Activity for more details."
- - text "has been transferred from account # to account # ."
- - text "© Parasoft. All rights reserved."
- - {by: css, value: "#footerPanel > ul:nth-child(1) > li:nth-child(2) > a:nth-child(1)", stability: low, score: 60}
- - {by: css, value: "#footerPanel > ul:nth-child(1) > li:nth-child(3) > a:nth-child(1)", stability: low, score: 60}
- - {by: css, value: "#footerPanel > ul:nth-child(1) > li:nth-child(4) > a:nth-child(1)", stability: low, score: 60}
- - {by: css, value: "#footerPanel > ul:nth-child(1) > li:nth-child(5) > a:nth-child(1)", stability: low, score: 60}
- - {by: css, value: "#headerPanel > ul:nth-child(1) > li:nth-child(3) > a:nth-child(1)", stability: low, score: 60}
- - {by: css, value: "#headerPanel > ul:nth-child(1) > li:nth-child(4) > a:nth-child(1)", stability: low, score: 60}
- - {by: css, value: "#headerPanel > ul:nth-child(1) > li:nth-child(5) > a:nth-child(1)", stability: low, score: 60}
- - {by: role, value: "link", name: "Contact Us", stability: medium, score: 95}
- - {by: role, value: "link", name: "Home", stability: medium, score: 95}
- - {by: role, value: "link", name: "Site Map", stability: medium, score: 95}
- - {by: role, value: "link", name: "www.parasoft.com", stability: medium, score: 95}
