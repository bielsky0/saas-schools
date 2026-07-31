import type { TemplateProps } from "../contract";
import { EmailLayout, Heading, Text, type EmailTranslator } from "./layout";

/**
 * Session reminder — sent to the parent before an upcoming session
 * (langlion Faza 6, EPIK 44; job `bookings.remind_session`).
 */
export function sessionReminderSubject(
  { orgName }: TemplateProps["session-reminder"],
  t: EmailTranslator,
) {
  return t("session-reminder.subject", { orgName });
}

export function SessionReminder(
  {
    orgName,
    athleteName,
    groupTypeName,
    sessionDate,
    sessionTime,
  }: TemplateProps["session-reminder"],
  t: EmailTranslator,
) {
  return (
    <EmailLayout preview={t("session-reminder.preview", { orgName })}>
      <Heading>{t("session-reminder.heading", { orgName })}</Heading>
      <Text>
        {t("session-reminder.body", {
          athleteName,
          groupTypeName,
          sessionDate,
          sessionTime,
        })}
      </Text>
    </EmailLayout>
  );
}
