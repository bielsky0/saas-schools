import type { TemplateProps } from "../contract";
import { EmailLayout, Heading, Text, type EmailTranslator } from "./layout";

/**
 * Individual session rejected — sent to the parent when an individual session
 * request is declined (langlion Faza 6, EPIK 44). Reserved: slot-first books
 * directly and has no rejection flow, so nothing emits this yet.
 */
export function individualSessionRejectedSubject(
  { orgName }: TemplateProps["individual-session-rejected"],
  t: EmailTranslator,
) {
  return t("individual-session-rejected.subject", { orgName });
}

export function IndividualSessionRejected(
  {
    orgName,
    athleteName,
    groupTypeName,
    trainerName,
    reason,
  }: TemplateProps["individual-session-rejected"],
  t: EmailTranslator,
) {
  return (
    <EmailLayout preview={t("individual-session-rejected.preview", { orgName })}>
      <Heading>{t("individual-session-rejected.heading", { orgName })}</Heading>
      <Text>
        {t("individual-session-rejected.body", {
          athleteName,
          groupTypeName,
          trainerName,
        })}
        {reason ? ` ${reason}` : ""}
      </Text>
    </EmailLayout>
  );
}
