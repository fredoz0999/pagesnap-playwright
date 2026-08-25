export interface HintRec {
  label: string;
  by: string;
  value: string;
  name?: string;
  prefix?: string;
}

export type FrameworkFamily =
  | "playwright"
  | "selenium"
  | "cypress"
  | "webdriverio"
  | "testcafe"
  | "generic";

export function normalizeFramework(raw: string | null | undefined): FrameworkFamily {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || s === "playwright" || s === "pw" || s === "@playwright/test") return "playwright";
  if (
    s === "selenium" ||
    s === "junit5" ||
    s === "junit" ||
    s === "testng" ||
    s === "java" ||
    s === "selenium-java"
  ) {
    return "selenium";
  }
  if (s === "cypress") return "cypress";
  if (s === "webdriverio" || s === "wdio" || s === "webdriver") return "webdriverio";
  if (s === "testcafe") return "testcafe";
  return "generic";
}

function q(s: string, quote: string = "'"): string {
  return String(s).replace(/\\/g, "\\\\").replace(new RegExp(quote.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "\\" + quote);
}

function pageExpr(prefix: string | undefined, family: FrameworkFamily): string {
  if (!prefix || !String(prefix).startsWith("in-iframe=")) {
    if (family === "playwright") return "page";
    if (family === "selenium") return "driver";
    if (family === "cypress") return "cy";
    if (family === "webdriverio") return "browser";
    if (family === "testcafe") return "";
    return "page";
  }
  const fp = String(prefix).slice("in-iframe=".length).split("/")[0];
  if (family === "playwright") return "page.frameLocator('iframe[name=\"" + q(fp) + "\"]')";
  if (family === "selenium") return "driver.switchTo().frame(\"" + q(fp, '"') + "\") /* then */ driver";
  if (family === "cypress") return "cy.iframe('[name=\"" + q(fp) + "\"]')";
  return "page";
}

function playwrightHint(h: HintRec): string {
  const p = pageExpr(h.prefix, "playwright");
  const v = q(h.value);
  switch (h.by) {
    case "testid":
      return p + ".getByTestId('" + v + "')";
    case "id":
      return p + ".locator('#" + v + "')";
    case "name":
      return p + ".locator('[name=\"" + q(h.value, '"') + "\"]')";
    case "role": {
      const opts = h.name ? ", { name: '" + q(h.name) + "' }" : "";
      return p + ".getByRole('" + v + "'" + opts + ")";
    }
    case "label":
      return p + ".getByLabel('" + v + "')";
    case "placeholder":
      return p + ".getByPlaceholder('" + v + "')";
    case "linkText":
      return p + ".getByRole('link', { name: '" + v + "' })";
    case "xpath":
      return p + ".locator('xpath=" + v + "')";
    case "css":
    default:
      return p + ".locator('" + v + "')";
  }
}

function seleniumHint(h: HintRec): string {
  const v = q(h.value, '"');
  switch (h.by) {
    case "id":
      return "driver.findElement(By.id(\"" + v + "\"))";
    case "name":
      return "driver.findElement(By.name(\"" + v + "\"))";
    case "testid":
      return "driver.findElement(By.cssSelector(\"[data-testid='" + q(h.value) + "']\"))";
    case "css":
      return "driver.findElement(By.cssSelector(\"" + v + "\"))";
    case "linkText":
      return "driver.findElement(By.linkText(\"" + v + "\"))";
    case "xpath":
      return "driver.findElement(By.xpath(\"" + v + "\"))";
    case "role": {
      if (h.name) {
        return "driver.findElement(By.xpath(\"//*[@role='" + q(h.value) + "' and contains(normalize-space(.), '" + q(h.name) + "')]\"))";
      }
      return "driver.findElement(By.cssSelector(\"[role='" + q(h.value) + "']\"))";
    }
    case "label":
      return "driver.findElement(By.xpath(\"//label[normalize-space()='" + v + "']/following::*[1]\"))";
    case "placeholder":
      return "driver.findElement(By.cssSelector(\"[placeholder='" + v + "']\"))";
    default:
      return "driver.findElement(By.cssSelector(\"" + v + "\"))";
  }
}

function cypressHint(h: HintRec): string {
  const v = q(h.value);
  switch (h.by) {
    case "testid":
      return "cy.get('[data-testid=\"" + q(h.value, '"') + "\"]')";
    case "id":
      return "cy.get('#" + v + "')";
    case "name":
      return "cy.get('[name=\"" + q(h.value, '"') + "\"]')";
    case "css":
      return "cy.get('" + v + "')";
    case "linkText":
      return "cy.contains('a', '" + v + "')";
    case "xpath":
      return "cy.xpath('" + v + "')";
    case "role":
      return h.name
        ? "cy.findByRole('" + v + "', { name: '" + q(h.name) + "' })"
        : "cy.findByRole('" + v + "')";
    case "label":
      return "cy.findByLabelText('" + v + "')";
    case "placeholder":
      return "cy.get('[placeholder=\"" + q(h.value, '"') + "\"]')";
    default:
      return "cy.get('" + v + "')";
  }
}

function wdioHint(h: HintRec): string {
  const v = q(h.value);
  switch (h.by) {
    case "id":
      return "$('#" + v + "')";
    case "name":
      return "$('[name=\"" + q(h.value, '"') + "\"]')";
    case "testid":
      return "$('[data-testid=\"" + q(h.value, '"') + "\"]')";
    case "css":
      return "$('" + v + "')";
    case "linkText":
      return "$('=" + h.value + "')";
    case "xpath":
      return "$('" + (h.value.startsWith("//") ? h.value : "//" + h.value) + "')";
    case "role":
      return h.name ? "$('aria/" + q(h.name) + "')" : "browser.$('[role=\"" + v + "\"]')";
    case "label":
      return "$('aria/" + v + "')";
    case "placeholder":
      return "$('[placeholder=\"" + q(h.value, '"') + "\"]')";
    default:
      return "$('" + v + "')";
  }
}

function testcafeHint(h: HintRec): string {
  const v = q(h.value);
  switch (h.by) {
    case "id":
      return "Selector('#" + v + "')";
    case "name":
      return "Selector('[name=\"" + q(h.value, '"') + "\"]')";
    case "testid":
      return "Selector('[data-testid=\"" + q(h.value, '"') + "\"]')";
    case "css":
      return "Selector('" + v + "')";
    case "linkText":
      return "Selector('a').withText('" + v + "')";
    case "xpath":
      return "Selector('xpath', '" + v + "')";
    case "role":
      return h.name
        ? "Selector('[role=\"" + v + "\"]').withText('" + q(h.name) + "')"
        : "Selector('[role=\"" + v + "\"]')";
    case "label":
      return "Selector('label').withText('" + v + "')";
    case "placeholder":
      return "Selector('[placeholder=\"" + q(h.value, '"') + "\"]')";
    default:
      return "Selector('" + v + "')";
  }
}

function genericHint(h: HintRec): string {
  const name = h.name ? " name=" + JSON.stringify(h.name) : "";
  return "by=" + h.by + " value=" + JSON.stringify(h.value) + name;
}

export function formatHint(h: HintRec, framework: string): string {
  const family = normalizeFramework(framework);
  let expr: string;
  switch (family) {
    case "playwright":
      expr = playwrightHint(h);
      break;
    case "selenium":
      expr = seleniumHint(h);
      break;
    case "cypress":
      expr = cypressHint(h);
      break;
    case "webdriverio":
      expr = wdioHint(h);
      break;
    case "testcafe":
      expr = testcafeHint(h);
      break;
    default:
      expr = genericHint(h);
  }
  return h.label + ": " + expr;
}

export function hintsFooterTitle(framework: string): string {
  const family = normalizeFramework(framework);
  switch (family) {
    case "playwright":
      return "# --- Playwright hints (best-effort; prefer high-stability locators) ---";
    case "selenium":
      return "# --- Selenium hints (best-effort; prefer high-stability locators) ---";
    case "cypress":
      return "# --- Cypress hints (best-effort; prefer high-stability locators) ---";
    case "webdriverio":
      return "# --- WebdriverIO hints (best-effort; prefer high-stability locators) ---";
    case "testcafe":
      return "# --- TestCafe hints (best-effort; prefer high-stability locators) ---";
    default:
      return "# --- Locator hints for " + framework + " (best-effort; map generic by= to your API) ---";
  }
}
