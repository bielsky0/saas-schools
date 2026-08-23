export type QuickStyleKind = "color" | "radius" | "spacing" | "shadow" | "text";

export interface QuickStyleOption {
  /** Tailwind class applied to the block (twMerge resolves conflicts within a group). */
  value: string;
  /** Kind-specific preview data. */
  color?: string;
  radius?: number;
  spacing?: number;
  shadow?: string;
  fontSize?: number;
}

export interface QuickStyleGroup {
  id: string;
  /** i18n key for the group label. */
  labelKey: string;
  kind: QuickStyleKind;
  options: QuickStyleOption[];
}

export const QUICK_STYLE_GROUPS: QuickStyleGroup[] = [
  {
    id: "background",
    labelKey: "Background",
    kind: "color",
    options: [
      { value: "bg-transparent", color: "transparent" },
      { value: "bg-white", color: "#ffffff" },
      { value: "bg-gray-50", color: "#f9fafb" },
      { value: "bg-gray-100", color: "#f3f4f6" },
      { value: "bg-gray-200", color: "#e5e7eb" },
      { value: "bg-gray-900", color: "#111827" },
      { value: "bg-black", color: "#000000" },
      { value: "bg-blue-600", color: "#2563eb" },
      { value: "bg-emerald-600", color: "#059669" },
      { value: "bg-rose-600", color: "#e11d48" },
    ],
  },
  {
    id: "rounded",
    labelKey: "Border Radius",
    kind: "radius",
    options: [
      { value: "rounded-none", radius: 0 },
      { value: "rounded-sm", radius: 2 },
      { value: "rounded", radius: 4 },
      { value: "rounded-md", radius: 6 },
      { value: "rounded-lg", radius: 8 },
      { value: "rounded-xl", radius: 12 },
      { value: "rounded-2xl", radius: 16 },
      { value: "rounded-full", radius: 9999 },
    ],
  },
  {
    id: "padding",
    labelKey: "Padding",
    kind: "spacing",
    options: [
      { value: "p-0", spacing: 0 },
      { value: "p-1", spacing: 4 },
      { value: "p-2", spacing: 8 },
      { value: "p-3", spacing: 12 },
      { value: "p-4", spacing: 16 },
      { value: "p-6", spacing: 24 },
      { value: "p-8", spacing: 32 },
    ],
  },
  {
    id: "margin",
    labelKey: "Margin",
    kind: "spacing",
    options: [
      { value: "m-0", spacing: 0 },
      { value: "m-1", spacing: 4 },
      { value: "m-2", spacing: 8 },
      { value: "m-3", spacing: 12 },
      { value: "m-4", spacing: 16 },
      { value: "m-6", spacing: 24 },
      { value: "m-8", spacing: 32 },
    ],
  },
  {
    id: "shadow",
    labelKey: "Shadow",
    kind: "shadow",
    options: [
      { value: "shadow-none", shadow: "none" },
      { value: "shadow-sm", shadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
      { value: "shadow", shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)" },
      { value: "shadow-md", shadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" },
      { value: "shadow-lg", shadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" },
      { value: "shadow-xl", shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" },
      { value: "shadow-2xl", shadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)" },
    ],
  },
  {
    id: "fontSize",
    labelKey: "Font size",
    kind: "text",
    options: [
      { value: "text-xs", fontSize: 12 },
      { value: "text-sm", fontSize: 14 },
      { value: "text-base", fontSize: 16 },
      { value: "text-lg", fontSize: 18 },
      { value: "text-xl", fontSize: 20 },
      { value: "text-2xl", fontSize: 24 },
      { value: "text-3xl", fontSize: 30 },
      { value: "text-4xl", fontSize: 36 },
    ],
  },
];

/** Classes that twMerge should treat as mutually exclusive within a group. */
export const QUICK_STYLE_CONFLICT_PREFIXES: Record<string, string[]> = {
  background: ["bg-"],
  rounded: ["rounded"],
  padding: ["p-", "px-", "py-", "pt-", "pr-", "pb-", "pl-"],
  margin: ["m-", "mx-", "my-", "mt-", "mr-", "mb-", "ml-"],
  shadow: ["shadow"],
  fontSize: ["text-"],
};

/**
 * Whether the given class value is active on the block. Only the option class
 * itself matters — twMerge drops any conflicting class when it was applied
 * through the quick styles.
 */
export const isQuickStyleActive = (classes: string[], value: string): boolean => classes.includes(value);