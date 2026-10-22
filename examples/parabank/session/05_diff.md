# Diff step 4 → 5

Both steps were captured on the same URL: https://parabank.parasoft.com/parabank/openaccount.htm

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

- - combobox "fromAccountId":
- - combobox "type":
- - option "18561" [selected]
- - option "CHECKING" [selected]
- - option "SAVINGS"
- options:  # native <select> - available without opening UI
- options:  # native <select> - available without opening UI

## Added

+ #   - CHECKING
+ #   - SAVINGS (selected)
+ - heading "Account Opened!" [level=1]
+ - link "18672":
+ - text "Congratulations, your account is now open."
+ - text "Your new account number:"
+ - {by: role, value: "link", name: "18672", stability: medium, score: 95}

## Removed

- #   - CHECKING (selected)
- #   - SAVINGS
- - button "Open New Account":
- - form:
- - heading "Open New Account" [level=1]
- - text "A minimum of $100.00 must be deposited into this account at time of opening. Please choose an existing account to transfer funds into the new account."
- - text "What type of Account would you like to open?"
- - {by: css, value: "#openAccountForm > form:nth-child(2)", stability: low, score: 60}
- - {by: id, value: "fromAccountId", stability: high, score: 90}
- - {by: id, value: "type", stability: high, score: 90}
- - {by: role, value: "button", name: "Open New Account", stability: medium, score: 95}
- locators:
- locators:
- locators:
- value: "0"
- value: "18561"
- value: "Open New Account"
