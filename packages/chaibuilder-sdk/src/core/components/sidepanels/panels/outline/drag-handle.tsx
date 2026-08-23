import React from "react";
import { cn } from "~/core/utils/cn";

/**
 * Faza 2 (§3.2): uchwyt drag 6 kropek (Shopify-like). Widoczny na hover węzła
 * (`opacity-0 group-hover:opacity-100`), służy jako `dragHandle` dla
 * react-arborist (patrz node.tsx — spike weryfikacyjny).
 *
 * `passive`: czysto wizualny uchwyt bez przechwytywania zdarzeń — używany dla
 * wierszy sekcji, gdzie drag działa na całym wierszu (nie tylko za uchwyt).
 */
export const DragHandle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { passive?: boolean }
>(function DragHandle({ className, passive, ...props }, ref) {
  return (
    <div
      ref={ref}
      role={passive ? undefined : "button"}
      aria-label={passive ? undefined : "Drag to reorder"}
      className={cn(
        "flex h-4 w-4 shrink-0 cursor-grab items-center justify-center rounded p-px opacity-0 transition-opacity hover:bg-primary/10 group-hover:opacity-100",
        className,
      )}
      onPointerDown={passive ? undefined : (e) => e.stopPropagation()}
      {...props}>
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
        <circle cx="4" cy="2" r="1.1" className="fill-current" />
        <circle cx="8" cy="2" r="1.1" className="fill-current" />
        <circle cx="4" cy="6" r="1.1" className="fill-current" />
        <circle cx="8" cy="6" r="1.1" className="fill-current" />
        <circle cx="4" cy="10" r="1.1" className="fill-current" />
        <circle cx="8" cy="10" r="1.1" className="fill-current" />
      </svg>
    </div>
  );
});