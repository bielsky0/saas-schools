import type { TemplateProps } from "../contract";
import { EmailLayout, Heading, Text, type EmailTranslator } from "./layout";

/**
 * New lesson topic recorded (langlion §2.42, EPIK 43, Faza 28).
 *
 * E-MAIL-FIRST BY DECISION (Rozstrzygnięcie #3/24): the client is notified
 * the moment staff record a lesson topic. No link into the client panel —
 * the panel does not show topics yet (F13 retrofit). Only the fact that
 * a topic was recorded, not the content.
 */
export function lessonTopicAddedSubject(
  { orgName }: TemplateProps["lesson-topic-added"],
  t: EmailTranslator,
) {
  return t("lesson-topic-added.subject", { orgName });
}

export function LessonTopicAdded(
  { orgName, sessionDate }: TemplateProps["lesson-topic-added"],
  t: EmailTranslator,
) {
  return (
    <EmailLayout preview={t("lesson-topic-added.preview", { orgName })}>
      <Heading>{t("lesson-topic-added.heading", { orgName })}</Heading>
      <Text>{t("lesson-topic-added.body", { sessionDate })}</Text>
    </EmailLayout>
  );
}
