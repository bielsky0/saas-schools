import { getTranslations } from "next-intl/server";

import { resolveClientSession } from "@/features/client-auth/session";
import { listClientPreferences } from "@/features/notifications/data";
import { ClientNotificationPreferencesForm } from "@/features/notifications/components/client-notification-preferences-form";
import { requireServedOrganization } from "@/features/organizations/served-org";

export const dynamic = "force-dynamic";

/**
 * Client notification settings (Faza 6, EPIK 44) — the parent's per-event-type
 * switches, rendered from `notification_preference`. Stored preferences are
 * DEVIATIONS from the default-on (mirrors the staff page at
 * `/settings/notifications`), so a type absent from the ledger renders enabled.
 */
export default async function ClientNotificationSettingsPage() {
  const org = await requireServedOrganization();
  const t = await getTranslations("enrollment");

  const principal = await resolveClientSession(org.id);
  if (!principal?.isVerified) {
    return <p>{t("errors.verifyFirst")}</p>;
  }

  const prefs = await listClientPreferences(principal.clientId, org.id);

  // type → true when the parent turned that event type OFF.
  const disabledByType: Record<string, boolean> = {};
  for (const p of prefs) {
    if (!p.inAppEnabled) disabledByType[p.type] = true;
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("notificationSettings")}</h1>
        <p className="text-muted-foreground text-sm">{t("notificationSettingsSubheading")}</p>
      </div>
      <ClientNotificationPreferencesForm disabledByType={disabledByType} />
    </main>
  );
}
