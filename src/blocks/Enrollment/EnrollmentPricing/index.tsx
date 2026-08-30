"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { formatPrice, useEnrollmentData, EnrollmentBlockPlaceholder } from "../shared";
import type { EnrollmentPricingProps } from "./config";

function billingLabel(billingType: "one_time" | "recurring"): string {
  return billingType === "recurring" ? "Subskrypcja" : "Pakiet";
}

export function EnrollmentPricing(props: ChaiBlockComponentProps<EnrollmentPricingProps>) {
  const { styles, blockProps, showSinglePrice, showPackages } = props;
  const data = useEnrollmentData(props);
  const groupType = data?.groupType;
  const packages = data?.packages ?? [];

  if (!groupType) {
    return <EnrollmentBlockPlaceholder blockProps={blockProps} label="Cennik zapisów" />;
  }

  const hasPackages = packages.length > 0 && showPackages;
  if (!showSinglePrice && !hasPackages) return null;

  return (
    <div {...blockProps} {...styles} className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-foreground">Cennik</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {showSinglePrice ? (
          <div className="flex flex-col gap-2 rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Pojedyncze zajęcia</p>
            <p className="text-3xl font-bold text-foreground">{formatPrice(groupType.price)}</p>
          </div>
        ) : null}
        {hasPackages
          ? packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex flex-col gap-2 rounded-lg border bg-card p-6 shadow-sm"
              >
                <p className="text-sm font-medium text-muted-foreground">
                  {billingLabel(pkg.billingType)}
                </p>
                <p className="font-semibold text-foreground">{pkg.name}</p>
                <p className="text-2xl font-bold text-foreground">{formatPrice(pkg.price)}</p>
              </div>
            ))
          : null}
      </div>
    </div>
  );
}