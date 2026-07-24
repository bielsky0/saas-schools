import type { ReactElement } from "react";

import type { EmailTranslator } from "./layout";

interface GroupChangeProps {
  athleteName: string;
  sourceGroupName: string;
  targetGroupName: string;
  amount?: string;
  expiresAt?: string;
  reason?: string;
}

export function groupChangeSubject(
  props: Record<string, string>,
  t: EmailTranslator,
): string {
  return t("groupChangeSubject", {
    athleteName: props.athleteName ?? "",
    sourceGroupName: props.sourceGroupName ?? "",
    targetGroupName: props.targetGroupName ?? "",
  });
}

export function GroupChangeNotification(
  props: GroupChangeProps,
  _t: EmailTranslator,
  _locale: string,
): ReactElement {
  return <div />;
}

interface CreditTransferProps {
  sourceAthleteName: string;
  targetAthleteName: string;
}

export function creditTransferSubject(
  props: Record<string, string>,
  t: EmailTranslator,
): string {
  return t("creditTransferSubject", {
    sourceAthleteName: props.sourceAthleteName ?? "",
    targetAthleteName: props.targetAthleteName ?? "",
  });
}

export function CreditTransferNotification(
  props: CreditTransferProps,
  _t: EmailTranslator,
  _locale: string,
): ReactElement {
  return <div />;
}
