import type { TemplateProps } from "../contract";
import { EmailLayout, Heading, Text, type EmailTranslator } from "./layout";

/**
 * Session rescheduled — sent to the parent when a session they are booked into
 * moves (langlion Faza 6, EPIK 44). Reserved: no reschedule flow emits it yet.
 */
export function sessionRescheduledSubject(
  { orgName }: TemplateProps["session-rescheduled"],
  t: EmailTranslator,
) {
  return t("session-rescheduled.subject", { orgName });
}

export function SessionRescheduled(
  {
    orgName,
    athleteName,
    groupTypeName,
    sessionDate,
    sessionTime,
  }: TemplateProps["session-rescheduled"],
  t: EmailTranslator,
) {
  return (
    <EmailLayout preview={t("session-rescheduled.preview", { orgName })}>
      <Heading>{t("session-rescheduled.heading", { orgName })}</Heading>
      <Text>
        {t("session-rescheduled.body", {
          athleteName,
          groupTypeName,
          sessionDate,
          sessionTime,
        })}
      </Text>
    </EmailLayout>
  );
}
