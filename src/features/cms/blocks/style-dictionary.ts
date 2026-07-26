export const GAP_CLASSES = {
  small: "gap-2",
  medium: "gap-4",
  large: "gap-8",
} as const;

export const BUTTON_SIZE_CLASSES = {
  small: "px-3 py-1.5 text-sm",
  medium: "px-4 py-2 text-base",
  large: "px-6 py-3 text-lg",
} as const;

export const BUTTON_VARIANT_CLASSES = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
} as const;

export const GRID_COLUMNS_CLASSES = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 sm:grid-cols-2",
  "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  "4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

export function gapClass(gap: string): string {
  return GAP_CLASSES[gap as keyof typeof GAP_CLASSES] ?? "gap-4";
}

export function buttonSizeClass(size: string): string {
  return BUTTON_SIZE_CLASSES[size as keyof typeof BUTTON_SIZE_CLASSES] ?? "px-4 py-2 text-base";
}

export function buttonVariantClass(variant: string): string {
  return BUTTON_VARIANT_CLASSES[variant as keyof typeof BUTTON_VARIANT_CLASSES] ?? "bg-primary text-primary-foreground hover:bg-primary/90";
}

export function gridColumnsClass(columns: number): string {
  const key = String(columns) as keyof typeof GRID_COLUMNS_CLASSES;
  return GRID_COLUMNS_CLASSES[key] ?? "grid-cols-1 sm:grid-cols-2";
}
