/**
 * Typed mirrors of the Shopify-look design tokens declared in
 * `shopify-tokens.css`. Kept as plain records so unit tests can verify
 * the CSS and TS sources of truth do not drift, and so future theme
 * editors (Phase 3) can read token keys/types without parsing CSS.
 */

export const CHAI_CHROME_TOKEN_KEYS = [
  "surface",
  "surface-subdued",
  "surface-hover",
  "accent",
  "accent-foreground",
  "accent-blue",
  "accent-blue-hover",
  "success",
  "danger",
  "text",
  "text-subdued",
  "text-subdued-hex",
  "border",
  "border-dashed",
  "radius-card",
  "radius-button",
  "radius-modal",
  "radius-input",
  "space-1",
  "space-2",
  "space-3",
  "space-4",
  "space-6",
  "space-8",
  "font-panel-heading-size",
  "font-panel-heading-weight",
  "font-label-size",
  "font-label-weight",
  "font-value-size",
  "font-value-weight",
] as const;

export type ChaiChromeTokenKey = (typeof CHAI_CHROME_TOKEN_KEYS)[number];

export const CHAI_CHROME_TOKENS: Record<ChaiChromeTokenKey, string> = {
  surface: "hsl(var(--background))",
  "surface-subdued": "hsl(var(--muted))",
  "surface-hover": "hsl(var(--accent))",
  accent: "hsl(var(--primary))",
  "accent-foreground": "hsl(var(--primary-foreground))",
  "accent-blue": "#006bff",
  "accent-blue-hover": "#0055cc",
  success: "#34a853",
  danger: "hsl(var(--destructive))",
  text: "hsl(var(--foreground))",
  "text-subdued": "hsl(var(--muted-foreground))",
  "text-subdued-hex": "#6b6b7a",
  border: "hsl(var(--border))",
  "border-dashed": "#d9d9d9",
  "radius-card": "8px",
  "radius-button": "4px",
  "radius-modal": "12px",
  "radius-input": "4px",
  "space-1": "4px",
  "space-2": "8px",
  "space-3": "12px",
  "space-4": "16px",
  "space-6": "24px",
  "space-8": "32px",
  "font-panel-heading-size": "16px",
  "font-panel-heading-weight": "600",
  "font-label-size": "13px",
  "font-label-weight": "500",
  "font-value-size": "14px",
  "font-value-weight": "400",
};

export const CMP_COMPONENT_TOKEN_KEYS = [
  "btn-radius",
  "btn-padding",
  "btn-font-size",
  "btn-height",
  "field-radius",
  "field-padding",
  "field-font-size",
  "field-height",
  "card-radius",
  "card-padding",
  "heading-size",
  "body-size",
  "section-gap",
  "container-max-width",
] as const;

export type CmpComponentTokenKey = (typeof CMP_COMPONENT_TOKEN_KEYS)[number];

export const CMP_COMPONENT_TOKENS: Record<CmpComponentTokenKey, string> = {
  "btn-radius": "4px",
  "btn-padding": "8px 16px",
  "btn-font-size": "14px",
  "btn-height": "40px",
  "field-radius": "4px",
  "field-padding": "8px 12px",
  "field-font-size": "14px",
  "field-height": "40px",
  "card-radius": "8px",
  "card-padding": "16px",
  "heading-size": "28px",
  "body-size": "16px",
  "section-gap": "32px",
  "container-max-width": "1200px",
};
