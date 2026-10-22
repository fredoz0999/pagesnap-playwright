# Capture session flow

- Updated: 2026-10-22T02:36:12Z
- Start URL: https://parabank.parasoft.com/parabank/register.htm
- Goal: Parabank: register, open savings account, transfer, pay bill, find transaction
- Steps captured: 13

## Steps

### 1. action: open Register | data: new unique username
- File: `01_parabank.parasoft.com_parabank_register.htm.yaml`
- URL: https://parabank.parasoft.com/parabank/register.htm
- Captured: 2026-10-22T02:36:05Z

### 2. action: submit registration | assert: welcome title with username, account created message
- File: `02_parabank.parasoft.com_parabank_register.htm.yaml`
- URL: https://parabank.parasoft.com/parabank/register.htm
- Captured: 2026-10-22T02:36:07Z
- Diff vs previous: `02_diff.md`

### 3. action: open Accounts Overview | assert: one account listed with balance $515.50
- File: `03_parabank.parasoft.com_parabank_overview.htm.yaml`
- URL: https://parabank.parasoft.com/parabank/overview.htm
- Captured: 2026-10-22T02:36:07Z
- Diff vs previous: `03_diff.md`

### 4. action: open Open New Account | data: type SAVINGS, from first account
- File: `04_parabank.parasoft.com_parabank_openaccount.htm.yaml`
- URL: https://parabank.parasoft.com/parabank/openaccount.htm
- Captured: 2026-10-22T02:36:08Z
- Diff vs previous: `04_diff.md`

### 5. action: click Open New Account | assert: 'Account Opened!' and new account number shown
- File: `05_parabank.parasoft.com_parabank_openaccount.htm.yaml`
- URL: https://parabank.parasoft.com/parabank/openaccount.htm
- Captured: 2026-10-22T02:36:08Z
- Diff vs previous: `05_diff.md`

### 6. action: open Transfer Funds | data: amount 25 from first account to the new savings account
- File: `06_parabank.parasoft.com_parabank_transfer.htm.yaml`
- URL: https://parabank.parasoft.com/parabank/transfer.htm
- Captured: 2026-10-22T02:36:09Z
- Diff vs previous: `06_diff.md`

### 7. action: click Transfer | assert: 'Transfer Complete!' with $25.00 and both account ids
- File: `07_parabank.parasoft.com_parabank_transfer.htm.yaml`
- URL: https://parabank.parasoft.com/parabank/transfer.htm
- Captured: 2026-10-22T02:36:10Z
- Diff vs previous: `07_diff.md`

### 8. action: open Bill Pay | data: payee Electric Co, account 12345, amount 12.34
- File: `08_parabank.parasoft.com_parabank_billpay.htm.yaml`
- URL: https://parabank.parasoft.com/parabank/billpay.htm
- Captured: 2026-10-22T02:36:10Z
- Diff vs previous: `08_diff.md`

### 9. action: click Send Payment | assert: 'Bill Payment Complete' naming Electric Co and $12.34
- File: `09_parabank.parasoft.com_parabank_billpay.htm.yaml`
- URL: https://parabank.parasoft.com/parabank/billpay.htm
- Captured: 2026-10-22T02:36:10Z
- Diff vs previous: `09_diff.md`

### 10. action: open Find Transactions | data: account used for the bill payment, find by amount 12.34
- File: `10_parabank.parasoft.com_parabank_findtrans.htm.yaml`
- URL: https://parabank.parasoft.com/parabank/findtrans.htm
- Captured: 2026-10-22T02:36:11Z
- Diff vs previous: `10_diff.md`

### 11. action: click Find Transactions by amount | assert: results table lists the Bill Payment to Electric Co
- File: `11_parabank.parasoft.com_parabank_findtrans.htm.yaml`
- URL: https://parabank.parasoft.com/parabank/findtrans.htm
- Captured: 2026-10-22T02:36:11Z
- Diff vs previous: `11_diff.md`

### 12. action: log out | assert: Customer Login form visible
- File: `12_parabank.parasoft.com_parabank_index.htm.yaml`
- URL: https://parabank.parasoft.com/parabank/index.htm
- Captured: 2026-10-22T02:36:12Z
- Diff vs previous: `12_diff.md`

### 13. action: log in with wrong password | assert: error 'The username and password could not be verified.'
- File: `13_parabank.parasoft.com_parabank_login.htm.yaml`
- URL: https://parabank.parasoft.com/parabank/login.htm
- Captured: 2026-10-22T02:36:12Z
- Diff vs previous: `13_diff.md`
