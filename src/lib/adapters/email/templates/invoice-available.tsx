import type { TemplateProps } from "../contract";
import { EmailLayout, Heading, Text, type EmailTranslator } from "./layout";

/**
 * Invoice available — sent to the parent when an invoice/FA for a purchase is
 * ready (langlion Faza 6, EPIK 44). Reserved: F27 invoice generation is not
 * built, so nothing emits this yet.
 */
export function invoiceAvailableSubject(
  { orgName }: TemplateProps["invoice-available"],
  t: EmailTranslator,
) {
  return t("invoice-available.subject", { orgName });
}

export function InvoiceAvailable(
  { orgName, invoiceLabel }: TemplateProps["invoice-available"],
  t: EmailTranslator,
) {
  return (
    <EmailLayout preview={t("invoice-available.preview", { orgName })}>
      <Heading>{t("invoice-available.heading", { orgName })}</Heading>
      <Text>
        {t("invoice-available.body", {
          orgName,
          invoiceLabel,
        })}
      </Text>
    </EmailLayout>
  );
}
