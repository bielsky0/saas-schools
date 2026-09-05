import type { TemplateProps } from "../contract";
import { EmailLayout, Heading, Text, type EmailTranslator } from "./layout";

export function webhookDeadLetteredSubject(
  _props: TemplateProps["webhook-dead-lettered"],
  t: EmailTranslator,
) {
  return t("webhook-dead-lettered.subject");
}

/**
 * Stripe Connect webhook dead-letter alert (Faza 5.3).
 *
 * Sent to the org owner after an event burned through all replay attempts. The
 * failure is a handler bug, so the email names the event and the error, and
 * leaves the threshold decision to the fallback text — there is no action link,
 * because the correct next step (read the event, fix the handler) is not a URL.
 */
export function WebhookDeadLettered(
  { orgName, eventId, eventType, error }: TemplateProps["webhook-dead-lettered"],
  t: EmailTranslator,
) {
  return (
    <EmailLayout preview={t("webhook-dead-lettered.preview", { orgName })}>
      <Heading>{t("webhook-dead-lettered.heading", { orgName })}</Heading>
      <Text>{t("webhook-dead-lettered.body")}</Text>
      <Text>
        {t.rich("webhook-dead-lettered.details", {
          eventId,
          eventType,
          error,
          b: (chunks) => <strong>{chunks}</strong>,
        })}
      </Text>
    </EmailLayout>
  );
}