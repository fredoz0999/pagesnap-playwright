# Diff step 12 → 13

- Step 12 URL: https://parabank.parasoft.com/parabank/index.htm
- Step 13 URL: https://parabank.parasoft.com/parabank/login.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Added

+ - alert "The username and password could not be verified."
+ - heading "Error!" [level=1]

## Removed

- - heading "LATEST NEWS" [level=4]
- - link "Account History":
- - link "Bill Pay":
- - link "Check Balances":
- - link "Make Deposits":
- - link "New! Online Account Transfers":
- - link "New! Online Bill Pay":
- - link "ParaBank Is Now Re-Opened":
- - link "Read More" [dup 1/2]:
- - link "Read More" [dup 2/2]:
- - link "Transfer Funds" [dup 1/2]:
- - link "Transfer Funds" [dup 2/2]:
- - link "Withdraw Funds":
- - list
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
- - listitem
- - listitem
- - listitem
- - listitem
- - {by: css, value: "#rightPanel > p:nth-child(4) > a:nth-child(1)", stability: low, score: 60}
- - {by: css, value: "#rightPanel > p:nth-child(7) > a:nth-child(1)", stability: low, score: 60}
- - {by: css, value: "#rightPanel > ul:nth-child(2) > li:nth-child(3) > a:nth-child(1)", stability: low, score: 60}
- - {by: css, value: "#rightPanel > ul:nth-child(3) > li:nth-child(4) > a:nth-child(1)", stability: low, score: 60}
- - {by: role, value: "link", name: "Account History", stability: medium, score: 95}
- - {by: role, value: "link", name: "Bill Pay", stability: medium, score: 95}
- - {by: role, value: "link", name: "Check Balances", stability: medium, score: 95}
- - {by: role, value: "link", name: "Make Deposits", stability: medium, score: 95}
- - {by: role, value: "link", name: "New! Online Account Transfers", stability: medium, score: 95}
- - {by: role, value: "link", name: "New! Online Bill Pay", stability: medium, score: 95}
- - {by: role, value: "link", name: "ParaBank Is Now Re-Opened", stability: medium, score: 95}
- - {by: role, value: "link", name: "Withdraw Funds", stability: medium, score: 95}
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
- locators:
- locators:
