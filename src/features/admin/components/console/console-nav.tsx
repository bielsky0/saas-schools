"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Org-console section nav (apex-dashboard-plan 4.2). Client-only to mark the
 * active section from the pathname — same stateless approach as AdminNav.
 */
const SECTIONS = [
  { href: "settings", label: "Settings" },
  { href: "teams", label: "Teams" },
  { href: "groups", label: "Groups" },
  { href: "limits", label: "Limits" },
  { href: "coupons", label: "Rabaty" },
  { href: "credits", label: "Credits" },
  { href: "pages", label: "Pages" },
  { href: "builder", label: "Builder" },
] as const;

export function ConsoleNav({ base }: { base: string }) {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      {SECTIONS.map((section) => {
        // The builder lives OUTSIDE the console subtree (its own route group and
        // shell are pre-existing; it is a heavy full-screen editor).
        const href = section.href === "builder" ? `${base}/../builder` : `${base}/${section.href}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={section.href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "block rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors",
              active
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}