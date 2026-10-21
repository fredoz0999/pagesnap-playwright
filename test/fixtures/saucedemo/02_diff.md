# Diff step 1 → 2

- Step 1 URL: https://www.saucedemo.com/
- Step 2 URL: https://www.saucedemo.com/inventory.html

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

+ # --- All <select> options ---
+ # <select> "unnamed":
+ - combobox:
+ - option "Name (A to Z)" [selected]
+ - option "Name (Z to A)"
+ - option "Price (high to low)"
+ - option "Price (low to high)"
+ options:  # native <select> - available without opening UI

## Added

+ #   - Name (A to Z) (selected)
+ #   - Name (Z to A)
+ #   - Price (high to low)
+ #   - Price (low to high)
+ - button "Add to cart" [dup 1/6]:
+ - button "Add to cart" [dup 2/6]:
+ - button "Add to cart" [dup 3/6]:
+ - button "Add to cart" [dup 4/6]:
+ - button "Add to cart" [dup 5/6]:
+ - button "Add to cart" [dup 6/6]:
+ - button "Open Menu":
+ - generic "$15.99" [dup 1/2]:
+ - generic "$15.99" [dup 2/2]:
+ - generic "$29.99":
+ - generic "$49.99":
+ - generic "$7.99":
+ - generic "$9.99":
+ - generic "Name (A to Z)":
+ - generic "Products":
+ - generic "Sauce Labs Backpack":
+ - generic "Sauce Labs Bike Light":
+ - generic "Sauce Labs Bolt T-Shirt":
+ - generic "Sauce Labs Fleece Jacket":
+ - generic "Sauce Labs Onesie":
+ - generic "Test.allTheThings() T-Shirt (Red)":
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - generic:
+ - img "Sauce Labs Backpack"
+ - img "Sauce Labs Bike Light"
+ - img "Sauce Labs Bolt T-Shirt"
+ - img "Sauce Labs Fleece Jacket"
+ - img "Sauce Labs Onesie"
+ - img "Test.allTheThings() T-Shirt (Red)"
+ - link "Facebook":
+ - link "LinkedIn":
+ - link "Sauce Labs Backpack":
+ - link "Sauce Labs Bike Light":
+ - link "Sauce Labs Bolt T-Shirt":
+ - link "Sauce Labs Fleece Jacket":
+ - link "Sauce Labs Onesie":
+ - link "Test.allTheThings() T-Shirt (Red)":
+ - link "Twitter":
+ - link:
+ - link:
+ - link:
+ - link:
+ - link:
+ - link:
+ - list
+ - listitem
+ - listitem
+ - listitem
+ - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2)", stability: low, score: 60}
+ - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1)", stability: low, score: 60}
+ - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2)", stability: low, score: 60}
+ - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2)", stability: low, score: 60}
+ - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(3) > div:nth-child(2)", stability: low, score: 60}
+ - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(3)", stability: low, score: 60}
+ - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(4) > div:nth-child(2)", stability: low, score: 60}
+ - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(4)", stability: low, score: 60}

## Removed

- - button "login-button":
- - form:
- - generic "secret_sauce":
- - heading "Accepted usernames are:" [level=4]
- - heading "Password for all users:" [level=4]
- - textbox "Password":
- - textbox "Username":
- - {by: css, value: "#login_button_container > div:nth-child(1) > form:nth-child(1)", stability: low, score: 60}
- - {by: testid, value: "login-button", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "login-credentials", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "login-password", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "password", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "username", attr: data-test, stability: high, score: 98}
- value: ""
- value: "***"
- value: "Login"
