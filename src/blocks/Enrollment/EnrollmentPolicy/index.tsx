"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { useEnrollmentData, EnrollmentBlockPlaceholder } from "../shared";
import type { EnrollmentPolicyProps } from "./config";

export function EnrollmentPolicy(props: ChaiBlockComponentProps<EnrollmentPolicyProps>) {
  const { styles, blockProps, showConsents } = props;
  const data = useEnrollmentData(props);
  const policy = data?.policy ?? null;
  const consents = data?.consents ?? [];

  if (!data?.groupType) {
    return <EnrollmentBlockPlaceholder blockProps={blockProps} label="Zasady zapisu" />;
  }

  if (!policy && (!showConsents || consents.length === 0)) return null;

  return (
    <div {...blockProps} {...styles} className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-foreground">Informacje o zapisie</h2>
      <div className="flex flex-col gap-3">
        {policy ? (
          <div className="rounded-lg border bg-card p-4">
            <p className="font-medium text-foreground">Regulamin: {policy.name}</p>
            <p className="text-sm text-muted-foreground">wersja {policy.version}</p>
          </div>
        ) : null}
        {showConsents && consents.length > 0 ? (
          <div className="rounded-lg border bg-card p-4">
            <p className="mb-2 font-medium text-foreground">Zgody wymagane przy zapisie</p>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {consents.map((c) => (
                <li key={c.id}>
                  {c.name} (wersja {c.version})
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}