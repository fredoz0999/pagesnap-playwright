# Diff step 9 → 10

- Step 9 URL: https://parabank.parasoft.com/parabank/billpay.htm
- Step 10 URL: https://parabank.parasoft.com/parabank/findtrans.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

+ # <select> "accountId":
+ - combobox "accountId":
+ - option "20115"
+ - option "20226" [selected]
+ options:  # native <select> - available without opening UI
- # <select> "fromAccountId":

## Added

+ #   - 20115
+ #   - 20226 (selected)
+ - button "Find Transactions" [dup 1/4]:
+ - button "Find Transactions" [dup 2/4]:
+ - button "Find Transactions" [dup 3/4]:
+ - button "Find Transactions" [dup 4/4]:
+ - form:
+ - heading "Find Transactions" [level=1]
+ - text ": ( MM-DD-YYYY )"
+ - text "Between and ( MM-DD-YYYY )"
+ - text "Find by Amount"
+ - text "Find by Date Range"
+ - text "Find by Date"
+ - text "Find by Transaction ID"
+ - text "Select an account"
+ - textbox "amount":
+ - textbox "fromDate":
+ - textbox "toDate":
+ - textbox "transactionDate":
+ - textbox "transactionId":
+ - {by: id, value: "accountId", stability: high, score: 90}
+ - {by: id, value: "amount", stability: high, score: 90}
+ - {by: id, value: "findByAmount", stability: high, score: 90}
+ - {by: id, value: "findByDate", stability: high, score: 90}
+ - {by: id, value: "findByDateRange", stability: high, score: 90}
+ - {by: id, value: "findById", stability: high, score: 90}
+ - {by: id, value: "fromDate", stability: high, score: 90}
+ - {by: id, value: "toDate", stability: high, score: 90}
+ - {by: id, value: "transactionDate", stability: high, score: 90}
+ - {by: id, value: "transactionForm", stability: high, score: 90}
+ - {by: id, value: "transactionId", stability: high, score: 90}
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ value: ""
+ value: ""
+ value: ""
+ value: ""
+ value: ""
+ value: "20226"

## Removed

- #   - 20115 (selected)
- #   - 20226
- - heading "Bill Payment Complete" [level=1]
- - text "Bill Payment to in the amount of from account was successful."
- - text "Electric Co"
- - text "See Account Activity for more details."
