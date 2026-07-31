import type { TemplateProps } from "../contract";
import { EmailLayout, Heading, Text, type EmailTranslator } from "./layout";

/**
 * Session created for a trainer — sent when a slot-first booking assigns a
 * session to a trainer (langlion EPIK 34, §2.32, Faza 5).
 */
export function slotFirstSessionCreatedSubject(
  { orgName }: TemplateProps["slot-first-session-created"],
  t: EmailTranslator,
) {
  return t("slot-first-session-created.subject", { orgName });
}

export function SlotFirstSessionCreated(
  {
    orgName,
    athleteName,
    groupTypeName,
    sessionDate,
    sessionTime,
  }: TemplateProps["slot-first-session-created"],
  t: EmailTranslator,
) {
  return (
    <EmailLayout preview={t("slot-first-session-created.preview", { orgName })}>
      <Heading>{t("slot-first-session-created.heading", { orgName })}</Heading>
      <Text>
        {t("slot-first-session-created.body", {
          athleteName,
          groupTypeName,
          sessionDate,
          sessionTime,
        })}
      </Text>
    </EmailLayout>
  );
}
