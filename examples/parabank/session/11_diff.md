# Diff step 10 → 11

Both steps were captured on the same URL: https://parabank.parasoft.com/parabank/findtrans.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

- - combobox "accountId":
- - option "13566"
- - option "13677" [selected]
- options:  # native <select> - available without opening UI

## Added

+ #   - 13566 (selected)
+ #   - 13677
+ #   headers: Date | Transaction | Debit (-) | Credit (+)
+ #   row 1: 10-21-2026 | Bill Payment to Electric Co | $12.34 |
+ # table "transactionTable":
+ - cell
+ - cell
+ - cell
+ - cell
+ - columnheader
+ - columnheader
+ - columnheader
+ - columnheader
+ - heading "Transaction Results" [level=1]
+ - link "Bill Payment to Electric Co":
+ - row
+ - row
+ - table
+ - {by: role, value: "link", name: "Bill Payment to Electric Co", stability: medium, score: 95}

## Removed

- #   - 13566
- #   - 13677 (selected)
- - button "Find Transactions" [dup 1/4]:
- - button "Find Transactions" [dup 2/4]:
- - button "Find Transactions" [dup 3/4]:
- - button "Find Transactions" [dup 4/4]:
- - form:
- - heading "Find Transactions" [level=1]
- - textbox "amount":
- - textbox "fromDate":
- - textbox "toDate":
- - textbox "transactionDate":
- - textbox "transactionId":
- - {by: id, value: "accountId", stability: high, score: 90}
- - {by: id, value: "amount", stability: high, score: 90}
- - {by: id, value: "findByAmount", stability: high, score: 90}
- - {by: id, value: "findByDate", stability: high, score: 90}
- - {by: id, value: "findByDateRange", stability: high, score: 90}
- - {by: id, value: "findById", stability: high, score: 90}
- - {by: id, value: "fromDate", stability: high, score: 90}
- - {by: id, value: "toDate", stability: high, score: 90}
- - {by: id, value: "transactionDate", stability: high, score: 90}
- - {by: id, value: "transactionForm", stability: high, score: 90}
- - {by: id, value: "transactionId", stability: high, score: 90}
- locators:
- locators:
- locators:
- locators:
- locators:
- locators:
- locators:
- locators:
- locators:
- locators:
- value: ""
- value: ""
- value: ""
- value: ""
- value: ""
- value: "13677"
