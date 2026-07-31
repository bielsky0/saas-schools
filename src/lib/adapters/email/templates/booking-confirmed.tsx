import type { TemplateProps } from "../contract";
import { EmailLayout, Heading, Text, type EmailTranslator } from "./layout";

/**
 * Booking confirmed — sent to the parent after a slot-first individual session
 * is booked (langlion EPIK 34, §2.32, Faza 5).
 */
export function bookingConfirmedSubject(
  { orgName }: TemplateProps["booking-confirmed"],
  t: EmailTranslator,
) {
  return t("booking-confirmed.subject", { orgName });
}

export function BookingConfirmed(
  {
    orgName,
    athleteName,
    groupTypeName,
    trainerName,
    sessionDate,
    sessionTime,
  }: TemplateProps["booking-confirmed"],
  t: EmailTranslator,
) {
  return (
    <EmailLayout preview={t("booking-confirmed.preview", { orgName })}>
      <Heading>{t("booking-confirmed.heading", { orgName })}</Heading>
      <Text>
        {t("booking-confirmed.body", {
          athleteName,
          groupTypeName,
          trainerName,
          sessionDate,
          sessionTime,
        })}
      </Text>
    </EmailLayout>
  );
}
