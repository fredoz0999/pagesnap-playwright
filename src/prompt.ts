import { normalizeFramework, type FrameworkFamily } from "./hints.js";

export interface PromptOpts {
  generated: string;
  startUrl: string;
  framework: string;
  style: string;
  waits: string;
  goal: string;
  lean?: boolean;
}

function stackBlurb(family: FrameworkFamily, framework: string): { tests: string; waits: string; extra: string } {
  switch (family) {
    case "playwright":
      return {
        tests: "**@playwright/test** TypeScript tests",
        waits: "web-first `expect()` assertions (auto-wait). Avoid `page.waitForTimeout`. Use `selectOption` for native `<select>`. Use `frameLocator` for same-origin iframes.",
        extra:
          "- Native `<select>`: `locator.selectOption({ label: '…' })` — options are in the snapshot even when closed.\n" +
          "- Custom dropdowns: snapshot closed then open; click to open, then click the option. Read `NN_diff.md` **Dropdown / options changes**.\n" +
          "- Page Object when `style=pageobject`; linear specs when `style=linear`.\n",
      };
    case "selenium":
      return {
        tests: "**Selenium Java** automated tests",
        waits: "explicit waits (`WebDriverWait` + `ExpectedConditions`) unless PROMPT says otherwise. Prefer `new Select(element).selectByVisibleText` for native `<select>`.",
        extra:
          "- Native `<select>`: one snapshot; use the Select API, not click-each-option.\n" +
          "- Custom menus: two captures (closed then open); open before selecting.\n" +
          "- Prefer Page Object structure when `style=pageobject`.\n",
      };
    case "cypress":
      return {
        tests: "**Cypress** tests",
        waits: "Cypress built-in retry/timeout. Do not add arbitrary `cy.wait(ms)` unless a note says a spinner needs it.",
        extra:
          "- Native `<select>`: `cy.get('select').select('Visible text')`.\n" +
          "- Custom menus: closed then open snapshots; open first in the test.\n" +
          "- Prefer `cy.get('[data-testid=…]')` / `cy.findByRole` from YAML `by` values.\n",
      };
    case "webdriverio":
      return {
        tests: "**WebdriverIO** tests",
        waits: "WebdriverIO waitUntil / expect-webdriverio auto-waits. Avoid `browser.pause`.",
        extra:
          "- Native `<select>`: `$('select').selectByVisibleText('…')`.\n" +
          "- Custom menus: closed then open snapshots.\n",
      };
    case "testcafe":
      return {
        tests: "**TestCafe** tests",
        waits: "TestCafe auto-waits. Use `Selector` from YAML locators; `t.click` / `t.typeText` / `t.click(select).click(option)`.",
        extra:
          "- Native `<select>`: options listed under `options:` — one snapshot is enough.\n" +
          "- Custom menus: two captures (closed then open).\n",
      };
    default:
      return {
        tests: `**${framework}** automated tests using these YAML snapshots`,
        waits: `Honor the project's wait style (\`${""}\`). Do not invent sleeps. Map generic YAML locators to ${framework}'s native API.`,
        extra:
          "- Native `<select>` options appear under `options:` even when closed.\n" +
          "- Custom menus need a closed snapshot then an open snapshot; read `NN_diff.md` **Dropdown / options changes**.\n",
      };
  }
}

export function buildPromptMd(opts: PromptOpts): string {
  const family = normalizeFramework(opts.framework);
  const blurb = stackBlurb(family, opts.framework);
  if (family === "generic") {
    blurb.waits = "Honor waits=" + opts.waits + ". Do not invent sleeps. Map YAML locators to " + opts.framework + " native API.";
  }
  const lines: string[] = [];
  lines.push("# Test generation prompt");
  lines.push("");
  lines.push("Generated: " + opts.generated);
  lines.push("Start URL: " + opts.startUrl);
  lines.push("Framework: " + opts.framework);
  lines.push("Style: " + opts.style);
  lines.push("Waits: " + opts.waits);
  if (opts.goal) lines.push("Goal: " + opts.goal);
  if (opts.lean !== false) lines.push("Snapshot mode: lean (one locator per control)");
  lines.push("");
  lines.push("## Task");
  lines.push("");
  lines.push("Read SESSION.md, then TEST_GUIDE.md, then flow.md, then YAML snapshots, then PROMPT.md / Reading-Snapshots.md.");
  lines.push("Using the YAML page snapshots and `flow.md` in this folder, generate " + blurb.tests + ". Do not invent steps or elements. Do not emit extra spec files this tool did not ask for.");
  lines.push("");
  lines.push("## Locators");
  if (family === "playwright") {
    lines.push("- Prefer YAML `by` in this order: testid -> getByTestId, role -> getByRole, label -> getByLabel, id -> locator(\"#id\").");
    lines.push("- Then name -> locator(\"[name=...]\"), placeholder -> getByPlaceholder.");
    lines.push("- YAML `by: testid` maps to getByTestId even if `attr` is data-test / data-cy / data-qa (not data-testid). The `attr` field is informational; do not switch to a CSS attribute selector.");
    lines.push("- `generic` nodes are testid-only (no ARIA role). Use getByTestId, never getByRole(\"generic\"). Do not goto a URL to skip a control that is in the YAML (especially cart).");
    lines.push("- Prefer higher `score`. Never use score <= 40 unless nothing else exists. Never use stability: low unless nothing else exists. Never page.waitForTimeout.");
    lines.push("- Web-first expect(); native <select> -> selectOption; frames -> frameLocator.");
  } else {
    lines.push("- YAML `by` is framework-neutral. Map testid/id/name/role/label from the snapshot; do not invent selectors.");
    lines.push("- YAML `by: testid` still means the test-id value even when `attr` is data-test / data-cy (not data-testid). Never treat role generic as a locator.");
    lines.push("- Prefer higher `score`. Never use score <= 40 unless nothing else exists. Prefer stability: high. Never use stability: low unless nothing else exists.");
    lines.push("- Do not goto a URL to skip a control that is in the YAML.");
    lines.push("- " + blurb.waits);
  }
  lines.push("");
  lines.push("## Walkthrough");
  lines.push("- Follow each step in `flow.md` and honor step notes as intended actions/assertions.");
  lines.push("- `action:` = intended act; `assert:` = assertion; `data:` = typed values. Honor those prefixes in notes.");
  lines.push("- YAML snapshots are page states: assert visible text, URL, enabled/visible. Wait for enabled/visible, never sleep.");
  lines.push("- Independent test when possible; reuse storageState/cookies if this session loaded them.");
  lines.push("- Native select: one snapshot (`options:`). Custom dropdown: closed then open; read NN_diff.md.");
  lines.push("- Do not invent UI. Do not goto a URL to skip a YAML control. Structure: " + opts.style + ".");
  if (opts.goal) {
    lines.push("");
    lines.push("User goal: " + opts.goal);
  }
  lines.push("");
  return lines.join("\n");
}

export function buildReadingSnapshotsMd(framework: string, style: string, waits: string, lean?: boolean): string {
  const family = normalizeFramework(framework);
  const mapping = mappingSection(family, framework);
  const leanNote = lean === false
    ? "Full mode: up to two locators per control; optional hint footer."
    : "Lean mode (default): only actionable controls have locators, and only ONE (highest score). Empty nameless main/region wrappers are omitted. Visible data-test/testid nodes with no ARIA role are kept as generic.";
  const lines: string[] = [];
  lines.push("# Reading snapshots");
  lines.push("");
  lines.push("YAML trees so you can generate **" + framework + "** tests that actually run.");
  lines.push("Not a click recorder. Not Playwright ariaSnapshot().");
  lines.push("");
  lines.push("## Files");
  lines.push("- SESSION.md — start URL, goal, framework, style. Tiny index; read this first.");
  lines.push("- TEST_GUIDE.md — short rules for a runnable test. Read second.");
  lines.push("- flow.md — ordered steps and notes (the intended scenario narrative). Honor action: / assert: / data: prefixes.");
  lines.push("- NN_<host>.yaml — page snapshot. Header: URL, Title, Viewport, Step, Note, Goal.");
  lines.push("- NN_diff.md — what changed vs previous capture.");
  lines.push("- PROMPT.md — framework, style, waits, goal.");
  lines.push("- Reading-Snapshots.md — this file (locator mapping).");
  lines.push("");
  lines.push(leanNote);
  lines.push("");
  lines.push("## How to read YAML");
  lines.push("- Tree: ARIA-inspired roles and accessible names. Flags: disabled, busy, invalid, required, checked, expanded/collapsed.");
  lines.push("- Under controls: value, one locators candidate (by + optional attr + stability + score), native options:, dropdown:, error / validationMessage.");
  lines.push("- by values: testid | id | name | css | role | label | placeholder | linkText | xpath.");
  lines.push("- Optional `attr` on testid locators names the source attribute when it is not data-testid (e.g. attr: data-test). Still map `by: testid` to getByTestId.");
  lines.push("- Locator score (higher is better): testid 98, role 95, label 90, id 90, name 88, placeholder 85, linkText 75, css 60, xpath 40. Prefer higher score; never use score <= 40 unless nothing else exists.");
  lines.push("- Never use stability: low unless nothing else exists. A matches: N locator is not unique (score capped at 40).");
  lines.push("- Native select: one snapshot (options:). Custom dropdown: closed then open; read Dropdown / options changes in NN_diff.md.");
  lines.push("- Do not goto a URL to skip a control that is in the YAML (especially cart). Never getByRole(\"generic\").");
  lines.push("");
  lines.push("## Structured notes");
  lines.push("If a note contains action:, assert:, or data:, treat them as the intended act, assertion, and typed values.");
  lines.push("");
  lines.push("## Generate a test that runs");
  lines.push("Produce ONE complete runnable test covering EVERY flow.md step in order. Web-first expects; no waitForTimeout / Thread.sleep.");
  lines.push("Assert from notes and YAML snapshots (visible text, URL, enabled/visible). Do not invent steps or elements.");
  lines.push("");
  lines.push(mapping.trimEnd());
  lines.push("");
  lines.push("Style=" + style + ". Waits=" + waits + ".");
  lines.push("");
  return lines.join("\n");
}


function mappingSection(family: FrameworkFamily, framework: string): string {
  switch (family) {
    case "playwright":
      return `## Mapping to @playwright/test

| YAML \`by\` | Playwright |
|-------------|------------|
| testid | \`page.getByTestId('…')\` even when YAML \`attr\` is \`data-test\` / \`data-cy\` / \`data-qa\`. Never \`getByRole("generic")\`. |
| id | \`page.locator('#id')\` |
| name | \`page.locator('[name="…"]')\` |
| role | \`page.getByRole('button', { name: '…' })\` |
| label | \`page.getByLabel('…')\` |
| placeholder | \`page.getByPlaceholder('…')\` |
| css | \`page.locator('…')\` |
| linkText | \`page.getByRole('link', { name: '…' })\` |
| xpath | \`page.locator('xpath=…')\` |

Use web-first \`expect(locator).toBeVisible()\` / \`toHaveValue\` / \`toHaveURL\`. Native select: \`locator.selectOption({ label })\`. Iframes: \`page.frameLocator('iframe[name=…]')\`. Page Object when style=pageobject.
`;
    case "selenium":
      return `## Mapping to Selenium Java

| YAML \`by\` | Selenium |
|-------------|----------|
| testid | \`By.cssSelector("[data-testid='…']")\` |
| id | \`By.id("…")\` |
| name | \`By.name("…")\` |
| role | role+name XPath or By.cssSelector("[role=…]") |
| label | label-for / aria-label |
| placeholder | \`By.cssSelector("[placeholder='…']")\` |
| css | \`By.cssSelector("…")\` |
| linkText | \`By.linkText("…")\` |
| xpath | \`By.xpath("…")\` |

Use explicit waits. Native select: \`new Select(element).selectByVisibleText\`. Never \`driver.findElement\` on an unverified locator.
`;
    case "cypress":
      return `## Mapping to Cypress

| YAML \`by\` | Cypress |
|-------------|--------|
| testid | \`cy.get('[data-testid="…"]')\` |
| id | \`cy.get('#id')\` |
| name | \`cy.get('[name="…"]')\` |
| role | \`cy.findByRole('button', { name: '…' })\` |
| label | \`cy.findByLabelText('…')\` |
| placeholder | \`cy.get('[placeholder="…"]')\` |
| css | \`cy.get('…')\` |
| linkText | \`cy.contains('a', '…')\` |
| xpath | \`cy.xpath('…')\` (plugin) |

Native select: \`cy.get('select').select('Visible text')\`.
`;
    case "webdriverio":
      return `## Mapping to WebdriverIO

| YAML \`by\` | WebdriverIO |
|-------------|-------------|
| testid | \`$('[data-testid="…"]')\` |
| id | \`$('#id')\` |
| name | \`$('[name="…"]')\` |
| role / label | \`$('aria/…')\` or attribute selectors |
| css | \`$('…')\` |
| linkText | \`$('=text')\` |
| xpath | \`$('//…')\` |

Native select: \`$('select').selectByVisibleText('…')\`.
`;
    case "testcafe":
      return `## Mapping to TestCafe

| YAML \`by\` | TestCafe |
|-------------|----------|
| testid | \`Selector('[data-testid="…"]')\` |
| id | \`Selector('#id')\` |
| name | \`Selector('[name="…"]')\` |
| css | \`Selector('…')\` |
| linkText | \`Selector('a').withText('…')\` |
| role | \`Selector('[role="…"]').withText('…')\` |

Native \`<select>\`: options listed in YAML — click the select then the option, or use \`t.click\`.
`;
    default:
      return `## Mapping to ${framework}

YAML locators are framework-neutral. Translate each \`by\` using the table above into **${framework}**'s native selector API. Do not emit Playwright \`getByRole\` / Selenium \`By.id\` unless that is actually this stack. Prefer high-stability id/name/testid. Never invent elements.
`;
  }
}

export function buildTestGuideMd(framework: string, style: string, waits: string): string {
  const family = normalizeFramework(framework);
  const testidLine = family === "playwright"
    ? "- YAML `by: testid` → `getByTestId` even when `attr` is data-test / data-cy / data-qa. Never `getByRole(\"generic\")`."
    : "- YAML `by: testid` maps to this stack's test-id API even when `attr` is data-test / data-cy (not data-testid). Never treat role `generic` as a locator.";
  const waitLine = family === "playwright"
    ? "- Web-first expects only. Never `waitForTimeout` / `Thread.sleep` / `cy.wait(ms)`."
    : "- Honor waits=" + waits + ". Never `waitForTimeout` / `Thread.sleep` / `cy.wait(ms)`.";
  const lines: string[] = [];
  lines.push("# Test generation guide");
  lines.push("");
  lines.push("Read in this order: SESSION.md → TEST_GUIDE.md → flow.md → YAML snapshots → PROMPT.md / Reading-Snapshots.md");
  lines.push("");
  lines.push("## Goal");
  lines.push("Produce ONE runnable test covering EVERY flow.md step in order. Do not invent steps or elements.");
  lines.push("");
  lines.push("## Locators");
  lines.push("- Prefer higher `score`. Never use score <= 40 unless nothing else exists. Never use stability: low unless nothing else exists.");
  lines.push(testidLine);
  lines.push("- Do not goto a URL to skip a control that is in the YAML (especially cart).");
  lines.push("");
  lines.push("## Actions");
  lines.push("- Native `<select>`: `selectOption` from `options:`. Custom dropdown: closed then open; read NN_diff.md.");
  lines.push(waitLine);
  lines.push("- Honor `action:` / `assert:` / `data:` prefixes in notes.");
  lines.push("- Iframes: YAML `iframe \"name\":` → frameLocator. Nested path uses `/`.");
  lines.push("");
  lines.push("Framework=" + framework + ". Style=" + style + ". Waits=" + waits + ".");
  lines.push("");
  return lines.join("\n");
}

export interface SessionMdOpts {
  startUrl: string;
  goal: string;
  generated: string;
  framework: string;
  style: string;
}

export function buildSessionMd(opts: SessionMdOpts): string {
  const lines: string[] = [];
  lines.push("# PageSnap session");
  lines.push("");
  lines.push("- Start URL: " + opts.startUrl);
  if (opts.goal) lines.push("- Goal: " + opts.goal);
  lines.push("- Framework: " + opts.framework);
  lines.push("- Style: " + opts.style);
  lines.push("- Generated: " + opts.generated);
  lines.push("");
  lines.push("Steps: see flow.md (updated as you capture)");
  lines.push("");
  lines.push("Read order: SESSION.md → TEST_GUIDE.md → flow.md → YAML snapshots → PROMPT.md / Reading-Snapshots.md");
  lines.push("");
  return lines.join("\n");
}

export function defaultAgentInstructions(framework: string, style: string, waits: string): string {
  return buildReadingSnapshotsMd(framework, style, waits);
}
