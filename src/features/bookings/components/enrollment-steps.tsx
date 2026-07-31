"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * Multi-step indicator for the enrollment flows (Faza 6, EPIK 4).
 *
 * Presentational only: it renders the current step and has no effect on which
 * step is shown — the flows keep their own state. `current` is 1-based.
 */
export function EnrollmentSteps({
  current,
  labels,
}: {
  current: number;
  labels: string[];
}) {
  const t = useTranslations("enrollment");

  return (
    <ol
      className="flex items-center gap-2"
      aria-label={t("steps.of", { current, total: labels.length })}
    >
      {labels.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              active
                ? "font-medium text-foreground"
                : done
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                active
                  ? "bg-primary border-primary text-primary-foreground"
                  : done
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border",
              )}
            >
              {done ? <Check className="size-3" /> : step}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
