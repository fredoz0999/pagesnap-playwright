import { normalizeFramework, type FrameworkFamily } from "./hints.js";

export interface PromptOpts {
  generated: string;
  startUrl: string;
  framework: string;
  style: string;
  waits: string;
  goal: string;
  ariaWritten?: boolean;
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
  lines.push("Write ONE complete, runnable test file for " + blurb.tests + " covering EVERY step in `steps.md` (then `flow.md`) in order. Do not invent steps or elements. Do not emit extra spec files this tool did not ask for.");
  lines.push("");
  lines.push("## Locators");
  if (family === "playwright") {
    lines.push("- Prefer YAML `by` in this order: testid -> getByTestId, role -> getByRole, label -> getByLabel, id -> locator(\"#id\").");
    lines.push("- Then name -> locator(\"[name=...]\"), placeholder -> getByPlaceholder.");
    lines.push("- Never use stability: low unless nothing else exists. Never page.waitForTimeout.");
    lines.push("- Web-first expect(); native <select> -> selectOption; frames -> frameLocator.");
  } else {
    lines.push("- YAML `by` is framework-neutral. Map testid/id/name/role/label from the snapshot; do not invent selectors.");
    lines.push("- Prefer stability: high. Never use stability: low unless nothing else exists.");
    lines.push("- " + blurb.waits);
  }
  lines.push("");
  lines.push("## Walkthrough");
  lines.push("- `steps.md` is the story (goto/click/fill/check/select/submit/nav + snapshot checkpoints).");
  lines.push("- `action:` = intended act; `assert:` = assertion; `data:` = typed values. Honor those prefixes in notes.");
  lines.push("- YAML snapshots are checkpoints: assert visible text, URL, enabled/visible. Wait for enabled/visible, never sleep.");
  lines.push("- Independent test when possible; reuse storageState/cookies if this session loaded them.");
  lines.push("- Native select: one snapshot (`options:`). Custom dropdown: closed then open; read NN_diff.md.");
  lines.push("- Do not invent UI. Structure: " + opts.style + ".");
  if (opts.ariaWritten) {
    lines.push("- Optional `NN_*_aria.yml` is extra context only; custom YAML locators win.");
  }
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
    : "Lean mode (default): only actionable controls have locators, and only ONE (highest stability). Empty nameless main/region wrappers are omitted.";
  const lines: string[] = [];
  lines.push("# Reading snapshots");
  lines.push("");
  lines.push("YAML trees plus a compact action log so you can generate **" + framework + "** tests that actually run.");
  lines.push("Not a click recorder. Not Playwright ariaSnapshot() unless an NN_*_aria.yml sidecar is present.");
  lines.push("");
  lines.push("## Files");
  lines.push("- steps.md — every goto/click/fill/check/select/submit/nav, plus snapshot checkpoints. This is the walkthrough.");
  lines.push("- flow.md — checkpoint notes (honor action: / assert: / data: prefixes).");
  lines.push("- NN_<host>.yaml — page checkpoint. Header: URL, Title, Viewport, Step, Note, Goal.");
  lines.push("- NN_diff.md — what changed vs previous checkpoint.");
  lines.push("- PROMPT.md — framework, style, waits, goal.");
  lines.push("");
  lines.push(leanNote);
  lines.push("");
  lines.push("## How to read YAML");
  lines.push("- Tree: ARIA-inspired roles and accessible names. Flags: disabled, busy, invalid, required, checked, expanded/collapsed.");
  lines.push("- Under controls: value, one locators candidate (by + stability), native options:, dropdown:, error / validationMessage.");
  lines.push("- by values: testid | id | name | css | role | label | placeholder | linkText | xpath.");
  lines.push("- Prefer testid > id > name > role+name > label > placeholder > linkText > css > xpath.");
  lines.push("- Never use stability: low unless nothing else exists. A matches: N locator is not unique.");
  lines.push("- Native select: one snapshot (options:). Custom dropdown: closed then open; read Dropdown / options changes in NN_diff.md.");
  lines.push("");
  lines.push("## Structured notes");
  lines.push("If a note contains action:, assert:, or data:, treat them as the intended act, assertion, and typed values.");
  lines.push("");
  lines.push("## Generate a test that runs");
  lines.push("Produce ONE complete runnable test covering EVERY steps.md line in order. Web-first expects; no waitForTimeout / Thread.sleep.");
  lines.push("Assert from assert: notes and checkpoints (visible text, URL, enabled/visible). Use filled values from the log. Do not invent steps or elements.");
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
| testid | \`page.getByTestId('…')\` (or \`page.locator('[data-cy="…"]')\` if the attribute is not \`data-testid\`) |
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

export function defaultAgentInstructions(framework: string, style: string, waits: string): string {
  return buildReadingSnapshotsMd(framework, style, waits);
}
