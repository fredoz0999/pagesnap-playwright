# Diff step 12 → 13

Both steps were captured on the same URL: https://practicesoftwaretesting.com/checkout

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

- # <select> "payment-method":
- - combobox "Payment Method":
- - option "Bank Transfer"
- - option "Buy Now Pay Later"
- - option "Cash on Delivery" [selected]
- - option "Choose your payment method" [disabled]
- - option "Credit Card"
- - option "Gift Card"
- options:  # native <select> - available without opening UI

## Added

+ - generic:
+ - link "Explore courses":
+ - text "Enjoyed testing this app? Level up with hands-on software testing courses."
+ - text "INV-2026000017"
+ - text "Thanks for your order! Your invoice number is ."
+ - {by: testid, value: "course-promo", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "course-promo-link", attr: data-test, stability: high, score: 98}

## Removed

- #   - Bank Transfer
- #   - Buy Now Pay Later
- #   - Cash on Delivery (selected)
- #   - Choose your payment method (disabled)
- #   - Credit Card
- #   - Gift Card
- - button "Confirm":
- - form:
- - generic "Payment was successful":
- - heading "Payment" [level=3]
- - {by: css, value: "aw-wizard:nth-child(1) > div:nth-child(2) > aw-wizard-completion-step:nth-child(4) > app-payment:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > form:nth-child(2)", stability: low, score: 60}
- - {by: testid, value: "finish", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "payment-method", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "payment-success-message", attr: data-test, stability: high, score: 98}
- locators:
- locators:
- value: "cash-on-delivery"
