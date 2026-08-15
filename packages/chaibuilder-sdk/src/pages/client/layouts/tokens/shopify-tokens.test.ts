import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHAI_CHROME_TOKEN_KEYS,
  CHAI_CHROME_TOKENS,
  CMP_COMPONENT_TOKEN_KEYS,
  CMP_COMPONENT_TOKENS,
} from "./shopify-tokens";

const css = readFileSync(
  resolve(process.cwd(), "src/pages/client/layouts/tokens/shopify-tokens.css"),
  "utf-8",
);

const rootBlock = css.match(/:root\s*{([^}]*)}/)?.[1] ?? "";

const declaredKeys = (prefix: string): string[] =>
  [...rootBlock.matchAll(new RegExp(`(${prefix}[\\w-]+)\\s*:`, "g"))].map((m) => m[1]);

describe("shopify-tokens", () => {
  it("declares every chrome token in CSS with the exact TS key", () => {
    const declared = new Set(declaredKeys("--chai-"));
    for (const key of CHAI_CHROME_TOKEN_KEYS) {
      expect(declared.has(`--chai-${key}`)).toBe(true);
    }
  });

  it("declares every component token in CSS with the exact TS key", () => {
    const declared = new Set(declaredKeys("--cmp-"));
    for (const key of CMP_COMPONENT_TOKEN_KEYS) {
      expect(declared.has(`--cmp-${key}`)).toBe(true);
    }
  });

  it("has no CSS chrome tokens missing from the TS record", () => {
    const declared = declaredKeys("--chai-");
    const expected = new Set(CHAI_CHROME_TOKEN_KEYS.map((k) => `--chai-${k}`));
    for (const key of declared) {
      expect(expected.has(key)).toBe(true);
    }
  });

  it("has no CSS component tokens missing from the TS record", () => {
    const declared = declaredKeys("--cmp-");
    const expected = new Set(CMP_COMPONENT_TOKEN_KEYS.map((k) => `--cmp-${k}`));
    for (const key of declared) {
      expect(expected.has(key)).toBe(true);
    }
  });

  it("keeps TS record values consistent with the CSS declarations", () => {
    const valueOf = (key: string): string => {
      const match = rootBlock.match(new RegExp(`${key}\\s*:\\s*([^;]+);`));
      return match?.[1]?.trim() ?? "";
    };
    for (const [key, tsValue] of Object.entries(CHAI_CHROME_TOKENS)) {
      expect(valueOf(`--chai-${key}`)).toBe(tsValue);
    }
    for (const [key, tsValue] of Object.entries(CMP_COMPONENT_TOKENS)) {
      expect(valueOf(`--cmp-${key}`)).toBe(tsValue);
    }
  });

  it("defines the Shopify geometry: cards 8px, buttons/inputs 4px, modals 12px", () => {
    expect(CHAI_CHROME_TOKENS["radius-card"]).toBe("8px");
    expect(CHAI_CHROME_TOKENS["radius-button"]).toBe("4px");
    expect(CHAI_CHROME_TOKENS["radius-input"]).toBe("4px");
    expect(CHAI_CHROME_TOKENS["radius-modal"]).toBe("12px");
  });

  it("defines the Shopify spacing scale 4/8/12/16/24/32", () => {
    expect(CHAI_CHROME_TOKENS["space-1"]).toBe("4px");
    expect(CHAI_CHROME_TOKENS["space-2"]).toBe("8px");
    expect(CHAI_CHROME_TOKENS["space-3"]).toBe("12px");
    expect(CHAI_CHROME_TOKENS["space-4"]).toBe("16px");
    expect(CHAI_CHROME_TOKENS["space-6"]).toBe("24px");
    expect(CHAI_CHROME_TOKENS["space-8"]).toBe("32px");
  });
});
