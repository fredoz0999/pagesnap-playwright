# Diff step 1 → 2

Both steps were captured on the same URL: https://parabank.parasoft.com/parabank/register.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Added

+ - heading "Account Services" [level=2]
+ - heading "Welcome psmvis00cs" [level=1]
+ - link "Accounts Overview":
+ - link "Bill Pay":
+ - link "Find Transactions":
+ - link "Log Out":
+ - link "Open New Account":
+ - link "Request Loan":
+ - link "Transfer Funds":
+ - link "Update Contact Info":
+ - list
+ - listitem
+ - listitem
+ - listitem
+ - listitem
+ - listitem
+ - listitem
+ - listitem
+ - listitem
+ - {by: role, value: "link", name: "Accounts Overview", stability: medium, score: 95}
+ - {by: role, value: "link", name: "Bill Pay", stability: medium, score: 95}
+ - {by: role, value: "link", name: "Find Transactions", stability: medium, score: 95}
+ - {by: role, value: "link", name: "Log Out", stability: medium, score: 95}
+ - {by: role, value: "link", name: "Open New Account", stability: medium, score: 95}
+ - {by: role, value: "link", name: "Request Loan", stability: medium, score: 95}
+ - {by: role, value: "link", name: "Transfer Funds", stability: medium, score: 95}
+ - {by: role, value: "link", name: "Update Contact Info", stability: medium, score: 95}

## Removed

- #   row 1: First Name: |  |
- #   row 2: Last Name: |  |
- #   row 3: Address: |  |
- # table "table-0":
- - button "Log In":
- - button "Register":
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
- - form:
- - form:
- - heading "Customer Login" [level=2]
- - heading "Signing up is easy!" [level=1]
- - link "Forgot login info?":
- - link "Register":
- - link:
- - link:
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
- - textbox "customer.address.city":
- - textbox "customer.address.state":
- - textbox "customer.address.street":
- - textbox "customer.address.zipCode":
- - textbox "customer.firstName":
- - textbox "customer.lastName":
- - textbox "customer.password":
- - textbox "customer.phoneNumber":
- - textbox "customer.ssn":
- - textbox "customer.username":
- - textbox "password":
- - textbox "repeatedPassword":
- - textbox "username":
- - {by: css, value: "#topPanel > a:nth-child(1)", stability: low, score: 60}
- - {by: css, value: "#topPanel > a:nth-child(2)", stability: low, score: 60}
- - {by: id, value: "customer.address.city", stability: high, score: 90}
