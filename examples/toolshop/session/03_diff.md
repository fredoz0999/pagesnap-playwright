# Diff step 2 → 3

Both steps were captured on the same URL: https://practicesoftwaretesting.com/

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

+ - option ""
+ - option "Price (Low - High)" [selected]
- - option "" [selected]
- - option "Price (Low - High)"

## Added

+ #   -
+ #   - Price (Low - High) (selected)
+ - button "Compare" [dup 1/7]:
+ - button "Compare" [dup 2/7]:
+ - button "Compare" [dup 3/7]:
+ - button "Compare" [dup 4/7]:
+ - button "Compare" [dup 5/7]:
+ - button "Compare" [dup 6/7]:
+ - button "Compare" [dup 7/7]:
+ - generic "$17.75":
+ - generic "7 products found for 'hammer'":
+ - generic "A = most environmentally friendly, E = higher environmental impact" [dup 1/7]:
+ - generic "A = most environmentally friendly, E = higher environmental impact" [dup 2/7]:
+ - generic "A = most environmentally friendly, E = higher environmental impact" [dup 3/7]:
+ - generic "A = most environmentally friendly, E = higher environmental impact" [dup 4/7]:
+ - generic "A = most environmentally friendly, E = higher environmental impact" [dup 5/7]:
+ - generic "A = most environmentally friendly, E = higher environmental impact" [dup 6/7]:
+ - generic "A = most environmentally friendly, E = higher environmental impact" [dup 7/7]:
+ - heading "Sledgehammer" [level=5]:
+ - img "Sledgehammer":
+ - link "Sledgehammer ABCDE$17.75":
+ - {by: alt, value: "Sledgehammer", stability: medium, score: 89}
+ - {by: css, value: "app-overview:nth-child(2) > div:nth-child(3) > div:nth-child(3) > div:nth-child(3) > a:nth-child(7) > div:nth-child(3) > span:nth-child(1) > span:nth-child(1)", stability: low, score: 60}
+ - {by: css, value: "div:nth-child(3) > app-overview:nth-child(2) > div:nth-child(3) > div:nth-child(3) > div:nth-child(3) > a:nth-child(7) > div:nth-child(1) > button:nth-child(2)", stability: low, score: 60}
+ - {by: css, value: "div:nth-child(3) > app-overview:nth-child(2) > div:nth-child(3) > div:nth-child(3) > div:nth-child(3) > a:nth-child(7) > div:nth-child(2) > div:nth-child(2)", stability: low, score: 60}
+ - {by: css, value: "div:nth-child(3) > app-overview:nth-child(2) > div:nth-child(3) > div:nth-child(3) > div:nth-child(3) > a:nth-child(7) > div:nth-child(2) > h5:nth-child(1)", stability: low, score: 60}
+ - {by: testid, value: "product-01M5GRV27N1VYEGTT63SWF2DZB", attr: data-test, stability: high, score: 98}
+ - {by: testid, value: "sorting_completed", attr: data-test, stability: high, score: 98}
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ locators:
+ value: "price,asc"

## Removed

- #   -  (selected)
- #   - Price (Low - High)
- - button "Compare" [dup 1/6]:
- - button "Compare" [dup 2/6]:
- - button "Compare" [dup 3/6]:
- - button "Compare" [dup 4/6]:
- - button "Compare" [dup 5/6]:
- - button "Compare" [dup 6/6]:
- - generic "6 products found for 'hammer'":
- - generic "A = most environmentally friendly, E = higher environmental impact" [dup 1/6]:
- - generic "A = most environmentally friendly, E = higher environmental impact" [dup 2/6]:
- - generic "A = most environmentally friendly, E = higher environmental impact" [dup 3/6]:
- - generic "A = most environmentally friendly, E = higher environmental impact" [dup 4/6]:
- - generic "A = most environmentally friendly, E = higher environmental impact" [dup 5/6]:
- - generic "A = most environmentally friendly, E = higher environmental impact" [dup 6/6]:
- - {by: testid, value: "search_completed", attr: data-test, stability: high, score: 98}
- value: ""
