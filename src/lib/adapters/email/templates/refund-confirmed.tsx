import type { TemplateProps } from "../contract";
import { EmailLayout, Heading, Text, type EmailTranslator } from "./layout";

export function refundConfirmedSubject(
  _props: TemplateProps["refund-confirmed"],
  t: EmailTranslator,
) {
  return t("refund-confirmed.subject");
}

export function RefundConfirmed(
  { refundAmount, refundVariant }: TemplateProps["refund-confirmed"],
  t: EmailTranslator,
) {
  const variantKey = refundVariant === "full_reversal" ? "fullReversal" : "partial";
  return (
    <EmailLayout preview={t("refund-confirmed.preview")}>
      <Heading>{t("refund-confirmed.heading")}</Heading>
      <Text>
        {t("refund-confirmed.body", { refundAmount, variant: t(`refund-confirmed.${variantKey}`) })}
      </Text>
    </EmailLayout>
  );
}
