# Diff step 4 → 5

Both steps were captured on the same URL: https://practicesoftwaretesting.com/product/01M5GRV27BBGJKW219TYFHXV5Y

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Added

+ - alert "Product added to shopping cart."
+ - generic "2":
+ - link "cart":
+ - menuitem "2":
+ - {by: testid, value: "cart-quantity", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "nav-cart", attr: data-test, stability: high, score: 98}
+ locators:
+ locators:
+ value: "2"

## Removed

- value: "1"
