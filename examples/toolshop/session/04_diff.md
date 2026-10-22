# Diff step 3 → 4

- Step 3 URL: https://practicesoftwaretesting.com/
- Step 4 URL: https://practicesoftwaretesting.com/product/01M5GND76XN01H7QVXZRB78RDZ

_Tip: For custom dropdowns, capture once closed and once open (Ctrl+Shift+M with notes)._

## Dropdown / options changes

- # --- All <select> options ---
- # <select> "sort":
- - combobox "sort":
- - option ""
- - option "CO₂ Rating (A - E)"
- - option "CO₂ Rating (E - A)"
- - option "Name (A - Z)"
- - option "Name (Z - A)"
- - option "Price (High - Low)"
- - option "Price (Low - High)" [selected]
- options:  # native <select> - available without opening UI

## Added

+ #   row 1: Handle Material | Rubber
+ #   row 2: Head Weight | 400g
+ #   row 3: Length | 320mm
+ # table "table-0":
+ - button "Add to cart":
+ - button "Add to favourites":
+ - button "Compare":
+ - button "Decrease quantity":
+ - button "Increase quantity":
+ - cell "320mm":
+ - cell "3years":
+ - cell "400g":
+ - cell "500g":
+ - cell "Carbon Steel":
+ - cell "Handle Material":
+ - cell "Head Weight":
+ - cell "Length":
+ - cell "Material":
+ - cell "Rubber":
+ - cell "Warranty":
+ - cell "Weight":
+ - generic "3":
+ - generic "320":
+ - generic "400":
+ - generic "500":
+ - generic "A = most environmentally friendly, E = higher environmental impact":
+ - generic "Carbon Steel":
+ - generic "Rubber":
+ - generic "g" [dup 1/2]:
+ - generic "g" [dup 2/2]:
+ - generic "mm":
+ - generic "unit-price":
+ - generic "years":
+ - heading "Claw Hammer with Fiberglass Handle" [level=5]
+ - heading "Claw Hammer with Shock Reduction Grip" [level=5]
+ - heading "Claw Hammer" [level=1]:
+ - heading "Court Hammer" [level=5]
+ - heading "Hammer" [level=5]
+ - heading "Related products" [level=2]
+ - heading "Sledgehammer" [level=5]
+ - heading "Specifications" [level=3]:
+ - heading "Thor Hammer" [level=5]
+ - link "Andrew George":
+ - link "Claw Hammer with Fiberglass Handle More information":
+ - link "Claw Hammer with Shock Reduction Grip More information":
+ - link "Court Hammer More information":
+ - link "Hammer More information":
+ - link "More information" [dup 1/6]:
+ - link "More information" [dup 2/6]:
+ - link "More information" [dup 3/6]:
+ - link "More information" [dup 4/6]:
+ - link "More information" [dup 5/6]:
+ - link "More information" [dup 6/6]:
+ - link "Sledgehammer More information":
+ - link "Thor Hammer More information":
+ - link "Unsplash" [dup 1/2]:
+ - link "Unsplash" [dup 2/2]:
+ - row:
+ - row:
+ - row:
+ - row:
+ - row:
+ - row:
+ - spinbutton "Quantity":
+ - table:
+ - text "Hammer"
+ - text "MightyCraft Hardware"
+ - text "Photo by on ."
+ - {by: css, value: "a[href*=\"https://unsplash.com/photos/YU2mCvXR0wA\"]", stability: medium, score: 60}
+ - {by: css, value: "a[href*=\"https://unsplash.com/photos/t5YUoHW6zRo\"]", stability: medium, score: 60}
+ - {by: css, value: "app-detail:nth-child(2) > div:nth-child(2) > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > span:nth-child(1)", stability: low, score: 60}
+ - {by: css, value: "app-detail:nth-child(2) > div:nth-child(2) > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > span:nth-child(1)", stability: low, score: 60}
+ - {by: css, value: "app-detail:nth-child(2) > div:nth-child(2) > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > span:nth-child(2)", stability: low, score: 60}
+ - {by: css, value: "app-detail:nth-child(2) > div:nth-child(2) > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(2) > span:nth-child(1)", stability: low, score: 60}
+ - {by: css, value: "app-detail:nth-child(2) > div:nth-child(2) > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(2) > span:nth-child(2)", stability: low, score: 60}
+ - {by: css, value: "app-detail:nth-child(2) > div:nth-child(2) > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(4) > td:nth-child(2) > span:nth-child(1)", stability: low, score: 60}
+ - {by: css, value: "app-detail:nth-child(2) > div:nth-child(2) > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(5) > td:nth-child(2) > span:nth-child(1)", stability: low, score: 60}
+ - {by: css, value: "app-detail:nth-child(2) > div:nth-child(2) > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(5) > td:nth-child(2) > span:nth-child(2)", stability: low, score: 60}
+ - {by: css, value: "app-detail:nth-child(2) > div:nth-child(2) > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(6) > td:nth-child(2) > span:nth-child(1)", stability: low, score: 60}
+ - {by: css, value: "app-detail:nth-child(2) > div:nth-child(2) > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(6) > td:nth-child(2) > span:nth-child(2)", stability: low, score: 60}

## Removed

- #   -
- #   - CO₂ Rating (A - E)
- #   - CO₂ Rating (E - A)
- #   - Name (A - Z)
- #   - Name (Z - A)
- #   - Price (High - Low)
- #   - Price (Low - High) (selected)
- - button "Compare" [dup 1/7]:
- - button "Compare" [dup 2/7]:
- - button "Compare" [dup 3/7]:
- - button "Compare" [dup 4/7]:
- - button "Compare" [dup 5/7]:
- - button "Compare" [dup 6/7]:
- - button "Compare" [dup 7/7]:
- - button "Search":
- - button "X":
- - checkbox "Chisels":
- - checkbox "Drill":
- - checkbox "Fasteners":
- - checkbox "ForgeFlex Tools":
- - checkbox "Grinder":
- - checkbox "Hammer":
- - checkbox "Hand Saw":
- - checkbox "Hand Tools":
- - checkbox "Measures":
- - checkbox "MightyCraft Hardware":
- - checkbox "Other":
- - checkbox "Pliers":
- - checkbox "Power Tools":
- - checkbox "Safety Gear":
- - checkbox "Sander":
- - checkbox "Saw":
- - checkbox "Screwdriver":
- - checkbox "Show only eco-friendly products":
- - checkbox "Storage Solutions":
- - checkbox "Tool Belts":
- - checkbox "Workbench":
- - checkbox "Wrench":
- - form:
- - form:
- - generic "$11.14":
- - generic "$11.48":
- - generic "$12.58":
- - generic "$13.41":
- - generic "$17.75":
- - generic "$18.63":
- - generic "$20.14":
- - generic "7 products found for 'hammer'":
- - generic "A = most environmentally friendly, E = higher environmental impact" [dup 1/7]:
- - generic "A = most environmentally friendly, E = higher environmental impact" [dup 2/7]:
- - generic "A = most environmentally friendly, E = higher environmental impact" [dup 3/7]:
- - generic "A = most environmentally friendly, E = higher environmental impact" [dup 4/7]:
- - generic "A = most environmentally friendly, E = higher environmental impact" [dup 5/7]:
- - generic "A = most environmentally friendly, E = higher environmental impact" [dup 6/7]:
- - generic "A = most environmentally friendly, E = higher environmental impact" [dup 7/7]:
- - generic "hammer":
- - generic:
- - generic:
- - heading "By brand:" [level=4]
- - heading "By category:" [level=4]
- - heading "Claw Hammer with Fiberglass Handle" [level=5]:
- - heading "Claw Hammer with Shock Reduction Grip" [level=5]:
- - heading "Claw Hammer" [level=5]:
- - heading "Court Hammer" [level=5]:
- - heading "Filters" [level=4]
- - heading "Hammer" [level=5]:
- - heading "Practice Software Testing - Toolshop" [level=1]
- - heading "Price Range" [level=4]
- - heading "Search" [level=4]
- - heading "Searched for: hammer" [level=3]:
- - heading "Sledgehammer" [level=5]:
- - heading "Sort" [level=4]
- - heading "Sustainability:" [level=4]
- - heading "Thor Hammer" [level=5]:
- - img "Banner"
- - link "Claw Hammer ABCDE$11.48":
- - link "Claw Hammer with Fiberglass Handle ABCDE$20.14":
- - link "Claw Hammer with Shock Reduction Grip ABCDE$13.41":
- - link "Court Hammer ABCDE$18.63":
- - link "Explore courses":
