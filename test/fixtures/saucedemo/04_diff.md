# Diff step 3 → 4

- Step 3 URL: https://www.saucedemo.com/inventory.html
- Step 4 URL: https://www.saucedemo.com/cart.html

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

- # --- All <select> options ---
- # <select> "unnamed":
- - combobox:
- - option "Name (A to Z)" [selected]
- - option "Name (Z to A)"
- - option "Price (high to low)"
- - option "Price (low to high)"
- options:  # native <select> - available without opening UI

## Added

+ - button "Checkout":
+ - button "Continue Shopping":
+ - generic "1" [dup 1/2]:
+ - generic "1" [dup 2/2]:
+ - generic "Description":
+ - generic "QTY":
+ - generic "Your Cart":
+ - {by: css, value: "#cart_contents_container > div:nth-child(1) > div:nth-child(1) > div:nth-child(3)", stability: low, score: 60}
+ - {by: css, value: "#cart_contents_container > div:nth-child(1) > div:nth-child(1) > div:nth-child(4)", stability: low, score: 60}
+ - {by: testid, value: "cart-desc-label", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "cart-list", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "cart-quantity-label", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "checkout", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "continue-shopping", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "inventory-item-desc", attr: data-test, scopeBy: testid, scopeValue: "inventory-item", scopeAttr: data-test, scopeText: "Sauce Labs Backpack", stability: high, score: 98}
+ - {by: testid, value: "inventory-item-desc", attr: data-test, scopeBy: testid, scopeValue: "inventory-item", scopeAttr: data-test, scopeText: "Sauce Labs Bike Light", stability: high, score: 98}
+ - {by: testid, value: "inventory-item-price", attr: data-test, scopeBy: testid, scopeValue: "inventory-item", scopeAttr: data-test, scopeText: "Sauce Labs Backpack", stability: high, score: 98}
+ - {by: testid, value: "inventory-item-price", attr: data-test, scopeBy: testid, scopeValue: "inventory-item", scopeAttr: data-test, scopeText: "Sauce Labs Bike Light", stability: high, score: 98}
+ - {by: testid, value: "item-quantity", attr: data-test, scopeBy: testid, scopeValue: "inventory-item", scopeAttr: data-test, scopeText: "Sauce Labs Backpack", stability: high, score: 98}
+ - {by: testid, value: "item-quantity", attr: data-test, scopeBy: testid, scopeValue: "inventory-item", scopeAttr: data-test, scopeText: "Sauce Labs Bike Light", stability: high, score: 98}

## Removed

- #   - Name (A to Z) (selected)
- #   - Name (Z to A)
- #   - Price (high to low)
- #   - Price (low to high)
- - button "Add to cart" [dup 1/4]:
- - button "Add to cart" [dup 2/4]:
- - button "Add to cart" [dup 3/4]:
- - button "Add to cart" [dup 4/4]:
- - generic "$15.99" [dup 1/2]:
- - generic "$15.99" [dup 2/2]:
- - generic "$49.99":
- - generic "$7.99":
- - generic "Name (A to Z)":
- - generic "Products":
- - generic "Sauce Labs Bolt T-Shirt":
- - generic "Sauce Labs Fleece Jacket":
- - generic "Sauce Labs Onesie":
- - generic "Test.allTheThings() T-Shirt (Red)":
- - generic:
- - generic:
- - generic:
- - generic:
- - generic:
- - generic:
- - generic:
- - generic:
- - generic:
- - generic:
- - generic:
- - generic:
- - generic:
- - generic:
- - generic:
- - img "Sauce Labs Backpack":
- - img "Sauce Labs Bike Light":
- - img "Sauce Labs Bolt T-Shirt":
- - img "Sauce Labs Fleece Jacket":
- - img "Sauce Labs Onesie":
- - img "Test.allTheThings() T-Shirt (Red)":
- - link "Sauce Labs Bolt T-Shirt":
- - link "Sauce Labs Fleece Jacket":
- - link "Sauce Labs Onesie":
- - link "Test.allTheThings() T-Shirt (Red)":
- - link:
- - link:
- - link:
- - link:
- - link:
- - link:
- - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1)", stability: low, score: 60}
- - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2)", stability: low, score: 60}
- - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(3)", stability: low, score: 60}
- - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(4)", stability: low, score: 60}
- - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(5)", stability: low, score: 60}
- - {by: css, value: "#contents_wrapper > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(6)", stability: low, score: 60}
- - {by: testid, value: "active-option", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "add-to-cart-sauce-labs-bolt-t-shirt", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "add-to-cart-sauce-labs-fleece-jacket", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "add-to-cart-sauce-labs-onesie", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "add-to-cart-test-allthethings-t-shirt-red", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "inventory-container", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "inventory-item-desc", attr: data-test, scopeBy: testid, scopeValue: "inventory-item-description", scopeAttr: data-test, scopeText: "Sauce Labs Backpack", stability: high, score: 98}
- - {by: testid, value: "inventory-item-desc", attr: data-test, scopeBy: testid, scopeValue: "inventory-item-description", scopeAttr: data-test, scopeText: "Sauce Labs Bike Light", stability: high, score: 98}
- - {by: testid, value: "inventory-item-desc", attr: data-test, scopeBy: testid, scopeValue: "inventory-item-description", scopeAttr: data-test, scopeText: "Sauce Labs Bolt T-Shirt", stability: high, score: 98}
- - {by: testid, value: "inventory-item-desc", attr: data-test, scopeBy: testid, scopeValue: "inventory-item-description", scopeAttr: data-test, scopeText: "Sauce Labs Fleece Jacket", stability: high, score: 98}
- - {by: testid, value: "inventory-item-desc", attr: data-test, scopeBy: testid, scopeValue: "inventory-item-description", scopeAttr: data-test, scopeText: "Sauce Labs Onesie", stability: high, score: 98}
- - {by: testid, value: "inventory-item-desc", attr: data-test, scopeBy: testid, scopeValue: "inventory-item-description", scopeAttr: data-test, scopeText: "Test.allTheThings() T-Shirt (Red)", stability: high, score: 98}
- - {by: testid, value: "inventory-item-description", attr: data-test, scopeBy: testid, scopeValue: "inventory-item", scopeAttr: data-test, scopeText: "Sauce Labs Backpack", stability: high, score: 98}
- - {by: testid, value: "inventory-item-description", attr: data-test, scopeBy: testid, scopeValue: "inventory-item", scopeAttr: data-test, scopeText: "Sauce Labs Bike Light", stability: high, score: 98}
- - {by: testid, value: "inventory-item-description", attr: data-test, scopeBy: testid, scopeValue: "inventory-item", scopeAttr: data-test, scopeText: "Sauce Labs Bolt T-Shirt", stability: high, score: 98}
- - {by: testid, value: "inventory-item-description", attr: data-test, scopeBy: testid, scopeValue: "inventory-item", scopeAttr: data-test, scopeText: "Sauce Labs Fleece Jacket", stability: high, score: 98}
- - {by: testid, value: "inventory-item-description", attr: data-test, scopeBy: testid, scopeValue: "inventory-item", scopeAttr: data-test, scopeText: "Sauce Labs Onesie", stability: high, score: 98}
- - {by: testid, value: "inventory-item-description", attr: data-test, scopeBy: testid, scopeValue: "inventory-item", scopeAttr: data-test, scopeText: "Test.allTheThings() T-Shirt (Red)", stability: high, score: 98}
- - {by: testid, value: "inventory-item-name", attr: data-test, scopeBy: testid, scopeValue: "item-1-title-link", scopeAttr: data-test, stability: high, score: 98}
- - {by: testid, value: "inventory-item-name", attr: data-test, scopeBy: testid, scopeValue: "item-2-title-link", scopeAttr: data-test, stability: high, score: 98}
- - {by: testid, value: "inventory-item-name", attr: data-test, scopeBy: testid, scopeValue: "item-3-title-link", scopeAttr: data-test, stability: high, score: 98}
- - {by: testid, value: "inventory-item-name", attr: data-test, scopeBy: testid, scopeValue: "item-5-title-link", scopeAttr: data-test, stability: high, score: 98}
- - {by: testid, value: "inventory-item-price", attr: data-test, scopeBy: testid, scopeValue: "inventory-item-description", scopeAttr: data-test, scopeText: "Sauce Labs Backpack", stability: high, score: 98}
- - {by: testid, value: "inventory-item-price", attr: data-test, scopeBy: testid, scopeValue: "inventory-item-description", scopeAttr: data-test, scopeText: "Sauce Labs Bike Light", stability: high, score: 98}
- - {by: testid, value: "inventory-item-price", attr: data-test, scopeBy: testid, scopeValue: "inventory-item-description", scopeAttr: data-test, scopeText: "Sauce Labs Bolt T-Shirt", stability: high, score: 98}
