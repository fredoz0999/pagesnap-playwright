# Diff step 8 → 9

Both steps were captured on the same URL: https://practicesoftwaretesting.com/checkout

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Added

+ - button "Proceed to checkout":
+ - text "Hello , you are already logged in. You can proceed to checkout."
+ - {by: testid, value: "proceed-2", attr: data-test, stability: high, score: 98}

## Removed

- - button "Login":
- - form:
- - generic:
- - heading "Login" [level=3]
- - link "Forgot your Password?":
- - link "Register your account":
- - listitem
- - listitem
- - tab "Continue as Guest":
- - tab "Sign in":
- - tablist
- - tabpanel
- - text "Invalid email or password"
- - text "Not yet an account?"
- - textbox "Email address" [required]:
- - textbox "Password" [required]:
- - {by: css, value: "#signin-tab > form:nth-child(2)", stability: low, score: 60}
- - {by: role, value: "tab", name: "Continue as Guest", stability: medium, score: 95}
- - {by: role, value: "tab", name: "Sign in", stability: medium, score: 95}
- - {by: testid, value: "email", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "forgot-password-link", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "login-error", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "login-submit", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "password", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "register-link", attr: data-test, stability: high, score: 98}
- locators:
- locators:
- locators:
- locators:
- locators:
- locators:
- locators:
- locators:
- value: "***"
- value: "***@***.***"
- value: "Login"
