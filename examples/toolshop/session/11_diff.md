# Diff step 10 → 11

Both steps were captured on the same URL: https://practicesoftwaretesting.com/checkout

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

+ - combobox "Payment Method":
+ - option "Bank Transfer"
+ - option "Buy Now Pay Later"
+ - option "Cash on Delivery"
+ - option "Choose your payment method" [disabled, selected]
+ - option "Credit Card"
+ - option "Gift Card"
- - combobox "Country":
- - option "Albania"
- - option "Algeria"
- - option "American Samoa"
- - option "Andorra"
- - option "Angola"
- - option "Anguilla"
- - option "Antarctica"
- - option "Antigua and Barbuda"
- - option "Argentina"
- - option "Armenia"
- - option "Aruba"
- - option "Australia"
- - option "Austria"
- - option "Azerbaijan"
- - option "Bahamas (the)"
- - option "Bahrain"
- - option "Bangladesh"
- - option "Barbados"
- - option "Belarus"
- - option "Belgium"
- - option "Belize"
- - option "Benin"
- - option "Bermuda"
- - option "Bhutan"
- - option "Bolivia (Plurinational State of)"
- - option "Bonaire, Sint Eustatius and Saba"
- - option "Bosnia and Herzegovina"
- - option "Botswana"
- - option "Bouvet Island"
- - option "Brazil"
- - option "British Indian Ocean Territory (the)"
- - option "Brunei Darussalam"
- - option "Bulgaria"
- - option "Burkina Faso"
- - option "Burundi"
- - option "Cabo Verde"
- - option "Cambodia"
- - option "Cameroon"
- - option "Canada"
- - option "Cayman Islands (the)"
- - option "Central African Republic (the)"
- - option "Chad"
- - option "Chile"
- - option "China"
- - option "Christmas Island"
- - option "Cocos (Keeling) Islands (the)"
- - option "Colombia"
- - option "Comoros (the)"
- - option "Congo (the Democratic Republic of the)"
- - option "Congo (the)"
- - option "Cook Islands (the)"
- - option "Costa Rica"
- - option "Croatia"
- - option "Cuba"
- - option "Curaçao"
- - option "Cyprus"
- - option "Czechia"
- - option "Côte d'Ivoire"
- - option "Denmark"

## Added

+ - button "Check payment" [disabled]:
+ - heading "Payment" [level=3]
+ - {by: css, value: "aw-wizard:nth-child(1) > div:nth-child(2) > aw-wizard-completion-step:nth-child(4) > app-payment:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > form:nth-child(2)", stability: low, score: 60}
+ - {by: testid, value: "finish", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "payment-method", attr: data-test, stability: high, score: 98}

## Removed

- - button "Proceed to checkout" [disabled]:
- - generic:
- - heading "Billing Address" [level=3]
- - textbox "City":
- - textbox "House number":
- - textbox "Postal code":
- - textbox "State":
- - textbox "Street":
- - {by: css, value: "aw-wizard:nth-child(1) > div:nth-child(2) > aw-wizard-step:nth-child(3) > app-address:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > form:nth-child(2)", stability: low, score: 60}
- - {by: testid, value: "city", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "country", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "house_number", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "postal_code", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "postcode-lookup-hint", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "proceed-3", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "state", attr: data-test, stability: high, score: 98}
- - {by: testid, value: "street", attr: data-test, stability: high, score: 98}
- locators:
- locators:
- locators:
- locators:
- locators:
- locators:
- value: "1 Test Way"
- value: "20151"
- value: "Chantilly"
- value: "US"
- value: "VA"
