import type { TemplateProps } from "../contract";
import { Button, EmailLayout, FallbackLink, Heading, Text, type EmailTranslator } from "./layout";

export function subscriptionPaymentFailedSubject(
  _props: TemplateProps["subscription-payment-failed"],
  t: EmailTranslator,
) {
  return t("subscription-payment-failed.subject");
}

/**
 * Client-facing subscription payment failure notification (F12d).
 *
 * Sent to a parent when Stripe fails to charge their subscription renewal.
 * Two variants:
 *   - With `portalUrl`: the academy has configured the Stripe Customer Portal.
 *     The parent can update their payment method themselves.
 *   - Without `portalUrl`: the academy has not configured the portal. The
 *     parent is told to contact the academy directly.
 */
export function SubscriptionPaymentFailed(
  { orgName, portalUrl }: TemplateProps["subscription-payment-failed"],
  t: EmailTranslator,
) {
  return (
    <EmailLayout preview={t("subscription-payment-failed.preview", { orgName })}>
      <Heading>{t("subscription-payment-failed.heading")}</Heading>
      <Text>
        {t.rich("subscription-payment-failed.body", {
          orgName,
          b: (chunks) => <strong>{chunks}</strong>,
        })}
      </Text>
      {portalUrl ? (
        <>
          <Text>{t("subscription-payment-failed.action")}</Text>
          <Button href={portalUrl}>{t("subscription-payment-failed.cta")}</Button>
          <FallbackLink href={portalUrl} t={t} />
        </>
      ) : (
        <Text>{t("subscription-payment-failed.noPortal")}</Text>
      )}
    </EmailLayout>
  );
}
