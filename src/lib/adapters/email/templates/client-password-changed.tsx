import type { TemplateProps } from "../contract";
import { EmailLayout, Heading, Text, type EmailTranslator } from "./layout";

/**
 * Client password changed — security alert (langlion spec v19, EPIK 44, Faza 29a).
 *
 * NOT suppressible (is_overridable=false): this is a security notification, not a
 * marketing one. It fires when a client password is reset through the "forgot
 * password" OTP flow (F29b) or a future staff-initiated reset.
 *
 * DOES NOT FIRE on the initial password set from the booking confirmation
 * screen — the client just chose the password and sees the visual confirmation.
 */
export function clientPasswordChangedSubject(
  { orgName }: TemplateProps["client-password-changed"],
  t: EmailTranslator,
) {
  return t("client-password-changed.subject", { orgName });
}

export function ClientPasswordChanged(
  { orgName }: TemplateProps["client-password-changed"],
  t: EmailTranslator,
) {
  return (
    <EmailLayout preview={t("client-password-changed.preview", { orgName })}>
      <Heading>{t("client-password-changed.heading", { orgName })}</Heading>
      <Text>{t("client-password-changed.body", { orgName })}</Text>
    </EmailLayout>
  );
}
