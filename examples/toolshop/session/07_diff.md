# Diff step 6 → 7

Both steps were captured on the same URL: https://practicesoftwaretesting.com/checkout

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Added

+ - button "Login":
+ - form:
+ - heading "Login" [level=3]
+ - link "Forgot your Password?":
+ - link "Register your account":
+ - listitem
+ - listitem
+ - tab "Continue as Guest":
+ - tab "Sign in":
+ - tablist
+ - tabpanel
+ - text "Not yet an account?"
+ - textbox "Email address" [required]:
+ - textbox "Password" [required]:
+ - {by: css, value: "#signin-tab > form:nth-child(2)", stability: low, score: 60}
+ - {by: role, value: "tab", name: "Continue as Guest", stability: medium, score: 95}
+ - {by: role, value: "tab", name: "Sign in", stability: medium, score: 95}
+ - {by: testid, value: "email", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "forgot-password-link", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "login-submit", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "password", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "register-link", attr: data-test, stability: high, score: 98}
+ locators:
+ value: ""
+ value: "***"
+ value: "Login"

## Removed

- #   headers: Item | Quantity | Price | Total
- #   row 1: Claw Hammer | Quantity for Claw Hammer | $11.48 | $22.96 |
- # table "table-0":
- - button "Continue Shopping":
- - button "Proceed to checkout":
- - cell
- - cell
- - cell
- - cell
- - cell "$11.48"
- - cell "$22.96" [dup 1/2]
- - cell "$22.96" [dup 2/2]:
- - cell "Claw Hammer"
- - cell "Quantity for Claw Hammer"
- - cell "Total"
- - columnheader
- - columnheader "Item"
- - columnheader "Price"
- - columnheader "Quantity"
- - columnheader "Total"
- - generic "$11.48":
- - generic "$22.96":
- - generic "Claw Hammer":
- - row
- - row
- - row
- - spinbutton "Quantity for Claw Hammer":
- - table
- - {by: testid, value: "cart-total", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "continue-shopping", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "line-price", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "proceed-1", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "product-price", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "product-quantity", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "product-title", attr: data-test, stability: high, score: 98}
- value: "2"
