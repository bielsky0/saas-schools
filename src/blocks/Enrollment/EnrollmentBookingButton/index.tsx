"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import type { EnrollmentBookingButtonProps } from "./config";

const VARIANT_CLASSES: Record<string, string> = {
  primary:
    "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90",
  secondary:
    "inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80",
  outline:
    "inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent",
};

export function EnrollmentBookingButton(
  props: ChaiBlockComponentProps<EnrollmentBookingButtonProps>,
) {
  const { groupTypeSlug, label, variant, styles, blockProps } = props;

  // The booking widget renders inline on the same page under `#booking`; when a
  // slug is provided the CTA still points at the group's own landing page.
  const href = groupTypeSlug ? `/zapisy/${groupTypeSlug}#booking` : `#booking`;
  const variantClasses = VARIANT_CLASSES[variant ?? "primary"];
  const mergedClassName = styles?.className
    ? `${variantClasses} ${styles.className}`
    : variantClasses;

  return (
    <a {...blockProps} {...styles} href={href} className={mergedClassName}>
      {label ?? "Zapisz się"}
    </a>
  );
}