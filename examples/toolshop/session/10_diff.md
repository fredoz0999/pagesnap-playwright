# Diff step 9 → 10

Both steps were captured on the same URL: https://practicesoftwaretesting.com/checkout

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

+ - combobox "Country":
+ - option "Albania"
+ - option "Algeria"
+ - option "American Samoa"
+ - option "Andorra"
+ - option "Angola"
+ - option "Anguilla"
+ - option "Antarctica"
+ - option "Antigua and Barbuda"
+ - option "Argentina"
+ - option "Armenia"
+ - option "Aruba"
+ - option "Australia"
+ - option "Austria"
+ - option "Azerbaijan"
+ - option "Bahamas (the)"
+ - option "Bahrain"
+ - option "Bangladesh"
+ - option "Barbados"
+ - option "Belarus"
+ - option "Belgium"
+ - option "Belize"
+ - option "Benin"
+ - option "Bermuda"
+ - option "Bhutan"
+ - option "Bolivia (Plurinational State of)"
+ - option "Bonaire, Sint Eustatius and Saba"
+ - option "Bosnia and Herzegovina"
+ - option "Botswana"
+ - option "Bouvet Island"
+ - option "Brazil"
+ - option "British Indian Ocean Territory (the)"
+ - option "Brunei Darussalam"
+ - option "Bulgaria"
+ - option "Burkina Faso"
+ - option "Burundi"
+ - option "Cabo Verde"
+ - option "Cambodia"
+ - option "Cameroon"
+ - option "Canada"
+ - option "Cayman Islands (the)"
+ - option "Central African Republic (the)"
+ - option "Chad"
+ - option "Chile"
+ - option "China"
+ - option "Christmas Island"
+ - option "Cocos (Keeling) Islands (the)"
+ - option "Colombia"
+ - option "Comoros (the)"
+ - option "Congo (the Democratic Republic of the)"
+ - option "Congo (the)"
+ - option "Cook Islands (the)"
+ - option "Costa Rica"
+ - option "Croatia"
+ - option "Cuba"
+ - option "Curaçao"
+ - option "Cyprus"
+ - option "Czechia"
+ - option "Côte d'Ivoire"
+ - option "Denmark"

## Added

+ #   - United States of America (the) (selected)
+ #   - Your country * (disabled)
+ - button "Page Snap" [collapsed]:
+ - button "Proceed to checkout" [disabled]:
+ - form:
+ - generic:
+ - heading "Billing Address" [level=3]
+ - menuitem "Page Snap My accountMy favoritesMy profileMy invoicesMy messagesSign out":
+ - textbox "City":
+ - textbox "House number":
+ - textbox "Postal code":
+ - textbox "State":
+ - textbox "Street":
+ - {by: css, value: "#navbarSupportedContent > ul:nth-child(1) > li:nth-child(4)", stability: low, score: 60}
+ - {by: css, value: "aw-wizard:nth-child(1) > div:nth-child(2) > aw-wizard-step:nth-child(3) > app-address:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > form:nth-child(2)", stability: low, score: 60}
+ - {by: testid, value: "city", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "country", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "house_number", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "nav-menu", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "postal_code", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "postcode-lookup-hint", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "proceed-3", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "state", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "street", attr: data-test, stability: high, score: 98}
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ value: ""
+ value: "1 Test Way"
+ value: "20151"
+ value: "Chantilly"
+ value: "US"
+ value: "VA"

## Removed

- #   - United States of America (the)
- #   - Your country * (disabled, selected)
- - alert "Product added to shopping cart."
- - button "Proceed to checkout":
- - link "Sign in":
- - menuitem "Sign in":
- - text "Hello , you are already logged in. You can proceed to checkout."
- - {by: role, value: "menuitem", name: "Sign in", stability: medium, score: 95}
- - {by: testid, value: "nav-sign-in", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "proceed-2", attr: data-test, stability: high, score: 98}
