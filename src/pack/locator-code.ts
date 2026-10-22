/**
 * One place that turns a PageSnap locator into Playwright, used by page objects,
 * heal suggestions, the agent-facing compact view and the live verifier.
 */
import { idSelector, type Locator } from "./parse.js";

const js = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

/** Playwright call chain for one strategy, without a receiver ("getByTestId('x')"). */
export function strategyCode(by: string, value: string, name?: string, _attr?: string): string {
  switch (by) {
    // getByTestId whatever the attribute: playwright.config sets use.testIdAttribute (PAGES.md says which)
    case "testid": return "getByTestId(" + js(value) + ")";
    case "id": return "locator(" + js(idSelector(value)) + ")";
    case "name": return "locator(" + js('[name="' + value + '"]') + ")";
    case "role": return "getByRole(" + js(value) + (name ? ", { name: " + js(name) + ", exact: true }" : "") + ")";
    case "label": return "getByLabel(" + js(value) + ", { exact: true })";
    case "placeholder": return "getByPlaceholder(" + js(value) + ", { exact: true })";
    case "linkText": return "getByRole('link', { name: " + js(value) + ", exact: true })";
    case "alt": return "getByAltText(" + js(value) + ", { exact: true })";
    case "title": return "getByTitle(" + js(value) + ", { exact: true })";
    case "text": return "getByText(" + js(value) + ", { exact: true })";
    case "xpath": return "locator(" + js("xpath=" + value) + ")";
    default: return "locator(" + js(value) + ")";
  }
}

/** frameLocator chain for an iframe path ("outer/inner"). */
export function frameCode(framePath: string): string {
  return framePath.split("/").filter(Boolean).map((seg) => {
    const m = /^frame-(\d+)$/.exec(seg);
    const sel = m ? "iframe >> nth=" + m[1] : 'iframe[name="' + seg + '"], iframe#' + seg;
    return "frameLocator(" + js(sel) + ")";
  }).join(".");
}

/** Full chain for a locator: receiver.frame?.scope?.filter?.strategy */
export function locatorChain(l: Locator, receiver = "page"): string {
  const parts: string[] = [receiver];
  if (l.frame) parts.push(frameCode(l.frame));
  if (l.scopeBy && l.scopeValue != null) {
    parts.push(strategyCode(l.scopeBy, l.scopeValue, l.scopeName, l.scopeAttr));
    if (l.scopeText) parts.push("filter({ hasText: " + js(l.scopeText) + " })");
  }
  parts.push(strategyCode(l.by, l.value, l.name, l.attr));
  return parts.join(".");
}
