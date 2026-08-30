"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { formatPrice, useEnrollmentData, EnrollmentBlockPlaceholder } from "../shared";
import type { EnrollmentHeroProps } from "./config";

export function EnrollmentHero(props: ChaiBlockComponentProps<EnrollmentHeroProps>) {
  const { styles, blockProps, showPrice, showDescription, ctaLabel, ctaHref } = props;
  const data = useEnrollmentData(props);
  const groupType = data?.groupType;

  if (!groupType) {
    return <EnrollmentBlockPlaceholder blockProps={blockProps} label="Hero zapisu" />;
  }

  return (
    <div {...blockProps} {...styles} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{groupType.name}</h1>
          {showDescription && groupType.description ? (
            <p className="mt-3 whitespace-pre-line text-muted-foreground">
              {groupType.description}
            </p>
          ) : null}
        </div>
        {showPrice ? (
          <div className="shrink-0 text-right">
            <p className="text-3xl font-bold text-foreground">{formatPrice(groupType.price)}</p>
            <p className="text-xs text-muted-foreground">za zajęcia</p>
          </div>
        ) : null}
      </div>
      {ctaLabel ? (
        <a
          href={ctaHref || `#booking`}
          className="inline-flex w-fit items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {ctaLabel}
        </a>
      ) : null}
    </div>
  );
}