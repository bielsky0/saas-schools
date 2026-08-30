"use client";

import dynamic from "next/dynamic";
import { Suspense, type ReactNode } from "react";
import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import type { EnrollmentBookingPayload } from "@/lib/enrollment-data";
import type { EnrollmentBookingFlowProps } from "./config";

// Code-split the booking flow so the builder bundle never pulls the step
// machines (calendar, payments, consents) in. Only the public page loads them.
const EnrollmentFlow = dynamic(() =>
  import("@/features/bookings/components/enrollment-flow").then((m) => ({ default: m.EnrollmentFlow })),
);
const SlotFirstFlow = dynamic(() =>
  import("@/features/bookings/components/slot-first-flow").then((m) => ({ default: m.SlotFirstFlow })),
);
const InterestSignupForm = dynamic(() =>
  import("@/features/interest-signups/components/interest-signup-form").then((m) => ({
    default: m.InterestSignupForm,
  })),
);

export function EnrollmentBookingFlow(
  props: ChaiBlockComponentProps<EnrollmentBookingFlowProps>,
) {
  const { styles, blockProps, anchorId } = props;
  const payload: EnrollmentBookingPayload | null = props.inBuilder ? null : (props.data ?? null);

  if (!payload) {
    return (
      <div
        {...blockProps}
        id={anchorId || "booking"}
        className="flex min-h-[120px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center"
      >
        <p className="text-sm text-muted-foreground">
          Sekcja zapisu (kalendarz, płatności, zgody) renderowana na stronie publicznej
        </p>
      </div>
    );
  }

  let flow: ReactNode;
  if (payload.kind === "interest") {
    flow = <InterestSignupForm groupTypeSlug={payload.groupTypeSlug} athletes={payload.athletes} />;
  } else if (payload.kind === "slot_first") {
    flow = <SlotFirstFlow {...payload} />;
  } else {
    flow = <EnrollmentFlow {...payload} />;
  }

  return (
    <div {...blockProps} {...styles} id={anchorId || "booking"}>
      <Suspense
        fallback={
          <div className="flex min-h-[120px] items-center justify-center">
            <p className="text-sm text-muted-foreground">Ładowanie formularza zapisu...</p>
          </div>
        }
      >
        {flow}
      </Suspense>
    </div>
  );
}