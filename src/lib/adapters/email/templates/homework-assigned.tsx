import type { TemplateProps } from "../contract";
import { EmailLayout, Heading, Text, type EmailTranslator } from "./layout";

/**
 * New homework assigned (langlion §2.42, EPIK 43, Faza 28).
 *
 * E-MAIL-FIRST BY DECISION (Rozstrzygnięcie #3/24): the client is notified
 * the moment staff assigns homework. No link into the client panel — the
 * panel does not show homework yet (F13 retrofit). The email includes the
 * description and optional due date so the parent knows what was assigned.
 */
export function homeworkAssignedSubject(
  { orgName }: TemplateProps["homework-assigned"],
  t: EmailTranslator,
) {
  return t("homework-assigned.subject", { orgName });
}

export function HomeworkAssigned(
  { orgName, sessionDate, description, dueDate }: TemplateProps["homework-assigned"],
  t: EmailTranslator,
) {
  return (
    <EmailLayout preview={t("homework-assigned.preview", { orgName })}>
      <Heading>{t("homework-assigned.heading", { orgName })}</Heading>
      <Text>{t("homework-assigned.body", { sessionDate })}</Text>
      <Text>
        <strong>{t("homework-assigned.description")}:</strong> {description}
      </Text>
      {dueDate ? (
        <Text>
          <strong>{t("homework-assigned.dueDate")}:</strong> {dueDate}
        </Text>
      ) : null}
    </EmailLayout>
  );
}
