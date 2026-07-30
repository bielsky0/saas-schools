"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import type { BookingButtonProps } from "./config";

const VARIANT_CLASSES: Record<string, string> = {
  primary:
    "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90",
  secondary:
    "inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80",
  outline:
    "inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent",
};

export function BookingButton(
  props: ChaiBlockComponentProps<BookingButtonProps>,
) {
  const { groupTypeSlug, label, variant, inBuilder, styles, blockProps } = props;

  const href = `/zapisy/${groupTypeSlug}`;
  const variantClasses = VARIANT_CLASSES[variant ?? "primary"];
  const mergedClassName = styles?.className
    ? `${variantClasses} ${styles.className}`
    : variantClasses;

  if (inBuilder && !groupTypeSlug) {
    return (
      <div
        {...blockProps}
        className="flex min-h-[60px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-4"
      >
        <p className="text-sm text-muted-foreground">
          Wybierz slug oferty w panelu konfiguracji
        </p>
      </div>
    );
  }

  return (
    <a {...blockProps} {...styles} href={href} className={mergedClassName}>
      {label ?? "Zapisz się"}
    </a>
  );
}
