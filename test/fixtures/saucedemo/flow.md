# Capture session flow

- Updated: 2026-10-22T00:10:51Z
- Start URL: https://www.saucedemo.com/
- Goal: Log in, add two items, verify cart
- Steps captured: 4

## Steps

### 1. Open the login page
- File: `01_www.saucedemo.com_root.yaml`
- URL: https://www.saucedemo.com/
- Captured: 2026-10-22T00:10:51Z

### 2. action: log in as standard_user | assert: Products title visible
- File: `02_www.saucedemo.com_inventory.html.yaml`
- URL: https://www.saucedemo.com/inventory.html
- Captured: 2026-10-22T00:10:51Z
- Diff vs previous: `02_diff.md`

### 3. action: add Backpack and Bike Light to cart | assert: cart badge shows 2
- File: `03_www.saucedemo.com_inventory.html.yaml`
- URL: https://www.saucedemo.com/inventory.html
- Captured: 2026-10-22T00:10:51Z
- Diff vs previous: `03_diff.md`

### 4. action: open cart | assert: both items listed, Checkout enabled
- File: `04_www.saucedemo.com_cart.html.yaml`
- URL: https://www.saucedemo.com/cart.html
- Captured: 2026-10-22T00:10:51Z
- Diff vs previous: `04_diff.md`
