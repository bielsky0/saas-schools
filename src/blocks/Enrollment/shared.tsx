"use client";

import { useEnrollmentPreview } from "@chaibuilder/sdk/runtime";
import type { EnrollmentPreview } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";

export type EnrollmentBlockProps = {
  styles?: Record<string, string>;
  data?: EnrollmentPreview | null;
};

export function useEnrollmentData(
  props: ChaiBlockComponentProps<EnrollmentBlockProps>,
): EnrollmentPreview | null {
  const { preview } = useEnrollmentPreview();
  return props.inBuilder ? preview : (props.data ?? null);
}

export function EnrollmentBlockPlaceholder({
  blockProps,
  label,
}: {
  blockProps: Record<string, string>;
  label?: string;
}) {
  return (
    <div
      {...blockProps}
      className="flex min-h-[80px] w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center"
    >
      <p className="text-sm text-muted-foreground">
        {label ? `${label} — ` : ""}Wybierz grupę zajęć do podglądu
      </p>
    </div>
  );
}

/** Grosze → "299,00 zł" (same rendering as the legacy product blocks). */
export function formatPrice(grosze: number): string {
  return `${(grosze / 100).toFixed(2).replace(".", ",")} zł`;
}