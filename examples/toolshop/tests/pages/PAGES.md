# Page objects (generated)

Use these members in specs instead of raw selectors. `import { LoginPage } from './pages';`

playwright.config: `use: { testIdAttribute: 'data-test' }`

## BasePage (on half or more of the pages; every page class extends it)
- notificationBar = generic "View the for this application."
- documentationLink = link "Documentation"
- testingGuideButton = button "Testing Guide"
- bugHuntingButton = button "🐛 Bug Hunting"
- practiceSoftwareTestingToolshopLink = link "Practice Software Testing - Toolshop"
- homeMenuItem = menuitem "Home"
- homeLink = link "Home"
- categoriesButton = button "Categories"
- contactMenuItem = menuitem "Contact"
- contactLink = link "Contact"
- signInMenuItem = menuitem "Sign in"
- signInLink = link "Sign in"
- selectLanguageButton = button "Select language"
- coursePromo = generic
- exploreCoursesLink = link "Explore courses"
- footerExplore = generic
- footerLearnCoursesLink = link "Learn Test AutomationHands-on courses for Playwright, Robot Framework, APIs and more"
- footerLearnSpectorLink = link "API SpectorOpen-source API testing, mocking and contract testing"
- footerLearnGithubLink = link "GitHubSource code, issues and contributions"
- privacyPolicyLink = link "Privacy Policy"
- barnImagesLink = link "Barn Images"
- unsplashLink = link "Unsplash"
- openChatButton = button "Open chat"
- showLiveShopActivityButton = button "Show live shop activity"
- cartLink = link "cart"
- cartQuantity = generic "2"

## HomePage / (steps 1,2,3)
- filters = generic
- sortSelect = combobox "sort"
- ngxSlider = slider "ngx-slider"
- ngxSliderMaxSlider = slider "ngx-slider-max"
- searchInput = textbox "Search"
- searchResetButton = button "X"
- searchButton = button "Search"
- showOnlyEcoFriendlyProductsCheckbox = checkbox "Show only eco-friendly products"
- outOfStock = generic "Out of stock"
- previousButton = button "Previous"
- page1Button = button "Page-1"
- page2Button = button "Page-2"
- page3Button = button "Page-3"
- page4Button = button "Page-4"
- page5Button = button "Page-5"
- nextButton = button "Next"
- searchCaptionHeading = heading "Searched for: hammer"
- searchTerm = generic "hammer"
- searchResultCount = generic "6 products found for 'hammer'"
- searchCompleted = generic
- sortingCompleted = generic

## ProductPage /product/:id (steps 4,5)
- andrewGeorgeLink = link "Andrew George"
- unsplashLink2 = link "Unsplash"
- productNameHeading = heading "Claw Hammer"
- unitPrice = generic "unit-price"
- co2RatingBadge = generic "A = most environmentally friendly, E = higher environmental impact"
- productDescription = generic
- decreaseQuantityButton = button "Decrease quantity"
- quantityInput = spinbutton "Quantity"
- increaseQuantityButton = button "Increase quantity"
- addToCartButton = button "Add to cart"
- addToFavouritesButton = button "Add to favourites"
- compareButton = button "Compare"
- specsTitleHeading = heading "Specifications"
- productSpecsTable = table
- link = link "Claw Hammer with Shock Reduction Grip More information"
- hammerMoreInformationLink = link "Hammer More information"
- thorHammerMoreInformationLink = link "Thor Hammer More information"
- sledgehammerMoreInformationLink = link "Sledgehammer More information"
- link2 = link "Claw Hammer with Fiberglass Handle More information"
- courtHammerMoreInformationLink = link "Court Hammer More information"
- unsplashLink3 = link "Unsplash"

## CheckoutPage /checkout (steps 6,7,8,9,10,11,12,13)
- productTitle = generic "Claw Hammer"
- quantityForClawHammerInput = spinbutton "Quantity for Claw Hammer"
- productPrice = generic "$11.48"
- linePrice = generic "$22.96"
- cartTotal = cell "$22.96"
- continueShoppingButton = button "Continue Shopping"
- proceed1Button = button "Proceed to checkout"
- signInTab = tab "Sign in"
- continueAsGuestTab = tab "Continue as Guest"
- emailAddressInput = textbox "Email address"
- passwordInput = textbox "Password"
- loginButton = button "Login"
- registerYourAccountLink = link "Register your account"
- forgotYourPasswordLink = link "Forgot your Password?"
- loginError = generic
- proceed2Button = button "Proceed to checkout"
- menuitem = menuitem "Page Snap My accountMy favoritesMy profileMy invoicesMy messagesSign out" (fragile)
- pageSnapButton = button "Page Snap"
- countrySelect = combobox "Country"
- postcodeLookupHint = generic
- postalCodeInput = textbox "Postal code"
- houseNumberInput = textbox "House number"
- streetInput = textbox "Street"
- cityInput = textbox "City"
- stateInput = textbox "State"
- proceed3Button = button "Proceed to checkout"
- paymentMethodSelect = combobox "Payment Method"
- checkPaymentButton = button "Check payment"
- paymentSuccessMessage = generic "Payment was successful"
