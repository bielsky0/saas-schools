import type { TemplateProps } from "../contract";
import { EmailLayout, Heading, Text, type EmailTranslator } from "./layout";

/**
 * Qualification card reminder — sent to the parent when a required qualification
 * card is still missing (langlion Faza 6, EPIK 44). Reserved: no reminder
 * scheduler emits it yet.
 */
export function qualificationCardReminderSubject(
  { orgName }: TemplateProps["qualification-card-reminder"],
  t: EmailTranslator,
) {
  return t("qualification-card-reminder.subject", { orgName });
}

export function QualificationCardReminder(
  {
    orgName,
    athleteName,
    groupTypeName,
  }: TemplateProps["qualification-card-reminder"],
  t: EmailTranslator,
) {
  return (
    <EmailLayout preview={t("qualification-card-reminder.preview", { orgName })}>
      <Heading>{t("qualification-card-reminder.heading", { orgName })}</Heading>
      <Text>
        {t("qualification-card-reminder.body", {
          orgName,
          athleteName,
          groupTypeName,
        })}
      </Text>
    </EmailLayout>
  );
}
