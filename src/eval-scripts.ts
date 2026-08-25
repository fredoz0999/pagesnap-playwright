import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));

export function injectedPath(name: string): string {
  return path.join(here, "injected", name);
}

export function loadInjected(name: string): string {
  return fs.readFileSync(injectedPath(name), "utf8");
}

/** Evaluate a function-body script with positional args. */
export async function evalBody<T>(page: Page, body: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(
    (payload: { src: string; a: unknown[] }) => {
      return new Function("...args", payload.src)(...payload.a);
    },
    { src: body, a: args }
  ) as Promise<T>;
}

export async function evalNamed<T>(
  page: Page,
  paramNames: string[],
  body: string,
  args: unknown[]
): Promise<T> {
  return page.evaluate(
    (payload: { names: string[]; src: string; a: unknown[] }) => {
      return new Function(...payload.names, payload.src)(...payload.a);
    },
    { names: paramNames, src: body, a: args }
  ) as Promise<T>;
}
