# Diff step 7 → 8

Both steps were captured on the same URL: https://practicesoftwaretesting.com/checkout

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Added

+ - generic:
+ - text "Invalid email or password"
+ - {by: testid, value: "login-error", attr: data-test, stability: high, score: 98}
+ locators:
+ value: "***@***.***"

## Removed

- value: ""
