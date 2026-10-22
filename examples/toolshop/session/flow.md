# Capture session flow

- Updated: 2026-10-22T02:29:10Z
- Start URL: https://practicesoftwaretesting.com/
- Goal: Toolshop: search, sort, add to cart, sign in, check out, get invoice
- Steps captured: 13

## Steps

### 1. action: open the shop | assert: product grid, search, sort and filters visible
- File: `01_practicesoftwaretesting.com_root.yaml`
- URL: https://practicesoftwaretesting.com/
- Captured: 2026-10-22T02:28:55Z

### 2. action: search 'hammer' | assert: caption 'Searched for: hammer', only hammer products listed
- File: `02_practicesoftwaretesting.com_root.yaml`
- URL: https://practicesoftwaretesting.com/
- Captured: 2026-10-22T02:28:56Z
- Diff vs previous: `02_diff.md`

### 3. action: sort by Price (Low - High) | assert: cheapest hammer first
- File: `03_practicesoftwaretesting.com_root.yaml`
- URL: https://practicesoftwaretesting.com/
- Captured: 2026-10-22T02:28:57Z
- Diff vs previous: `03_diff.md`

### 4. action: open Claw Hammer | assert: name, unit price, quantity 1, Add to cart
- File: `04_practicesoftwaretesting.com_product_01M5GND76XN01H7QVXZRB78RDZ.yaml`
- URL: https://practicesoftwaretesting.com/product/01M5GND76XN01H7QVXZRB78RDZ
- Captured: 2026-10-22T02:28:58Z
- Diff vs previous: `04_diff.md`

### 5. action: quantity 2, Add to cart | assert: toast shown, cart badge shows 2
- File: `05_practicesoftwaretesting.com_product_01M5GND76XN01H7QVXZRB78RDZ.yaml`
- URL: https://practicesoftwaretesting.com/product/01M5GND76XN01H7QVXZRB78RDZ
- Captured: 2026-10-22T02:29:00Z
- Diff vs previous: `05_diff.md`

### 6. action: open cart | assert: Claw Hammer x2, line price = 2 x unit price, cart total
- File: `06_practicesoftwaretesting.com_checkout.yaml`
- URL: https://practicesoftwaretesting.com/checkout
- Captured: 2026-10-22T02:29:02Z
- Diff vs previous: `06_diff.md`

### 7. action: Proceed to checkout | assert: Sign in step with email, password, Login
- File: `07_practicesoftwaretesting.com_checkout.yaml`
- URL: https://practicesoftwaretesting.com/checkout
- Captured: 2026-10-22T02:29:02Z
- Diff vs previous: `07_diff.md`

### 8. action: log in with a wrong password | assert: login error shown, still on Sign in
- File: `08_practicesoftwaretesting.com_checkout.yaml`
- URL: https://practicesoftwaretesting.com/checkout
- Captured: 2026-10-22T02:29:04Z
- Diff vs previous: `08_diff.md`

### 9. action: log in with the new customer | assert: 'already logged in' and Proceed to checkout
- File: `09_practicesoftwaretesting.com_checkout.yaml`
- URL: https://practicesoftwaretesting.com/checkout
- Captured: 2026-10-22T02:29:05Z
- Diff vs previous: `09_diff.md`

### 10. action: Proceed to billing address | assert: address prefilled from the account, house number empty
- File: `10_practicesoftwaretesting.com_checkout.yaml`
- URL: https://practicesoftwaretesting.com/checkout
- Captured: 2026-10-22T02:29:07Z
- Diff vs previous: `10_diff.md`

### 11. action: house number 12, Proceed | assert: payment method select, Confirm disabled
- File: `11_practicesoftwaretesting.com_checkout.yaml`
- URL: https://practicesoftwaretesting.com/checkout
- Captured: 2026-10-22T02:29:07Z
- Diff vs previous: `11_diff.md`

### 12. action: Cash on Delivery, Confirm | assert: 'Payment was successful'
- File: `12_practicesoftwaretesting.com_checkout.yaml`
- URL: https://practicesoftwaretesting.com/checkout
- Captured: 2026-10-22T02:29:08Z
- Diff vs previous: `12_diff.md`

### 13. action: Confirm | assert: 'Thanks for your order! Your invoice number is INV-...'
- File: `13_practicesoftwaretesting.com_checkout.yaml`
- URL: https://practicesoftwaretesting.com/checkout
- Captured: 2026-10-22T02:29:10Z
- Diff vs previous: `13_diff.md`
