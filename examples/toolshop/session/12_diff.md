# Diff step 11 → 12

Both steps were captured on the same URL: https://practicesoftwaretesting.com/checkout

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

+ - option "Cash on Delivery" [selected]
+ - option "Choose your payment method" [disabled]
- - option "Cash on Delivery"
- - option "Choose your payment method" [disabled, selected]

## Added

+ #   - Cash on Delivery (selected)
+ #   - Choose your payment method (disabled)
+ - button "Confirm":
+ - generic "Payment was successful":
+ - {by: testid, value: "payment-success-message", attr: data-test, stability: high, score: 98}
+ locators:
+ value: "cash-on-delivery"

## Removed

- #   - Cash on Delivery
- #   - Choose your payment method (disabled, selected)
- - button "Check payment" [disabled]:
- value: ""
