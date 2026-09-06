import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { requireSuperAdmin } from "@/features/admin/context";
import { getOrgSettingsData } from "@/features/admin/org-console/data";
import { SettingsForm } from "@/features/admin/components/console/settings-form";

/**
 * Org-console settings tab (apex-dashboard-plan 4.2 settings).
 *
 * Edits the target org's own columns (name, timezone, currency, schedule
 * bounds, subdomain, plan). The `admin_client_setting_override` diff is a
 * future-key extension (risk #5) — the list is rendered read-only for now.
 */
export default async function OrgConsoleSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await requireSuperAdmin(`/admin/orgs/${orgId}/console/settings`);

  const settings = await getOrgSettingsData(orgId);
  if (!settings) notFound();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization settings</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            organizationId={orgId}
            defaults={{
              name: settings.name,
              timezone: settings.timezone,
              currency: settings.currency,
              scheduleStartHour: settings.scheduleStartHour ?? 6,
              scheduleEndHour: settings.scheduleEndHour ?? 22,
              scheduleSlotMinutes: settings.scheduleSlotMinutes ?? 30,
              subdomain: settings.subdomain,
              planId: settings.planId,
            }}
            plans={settings.plans}
          />
        </CardContent>
      </Card>

      {settings.overrides.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Setting overrides</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-border border-border divide-y rounded-md border">
              {settings.overrides.map((override) => (
                <li key={override.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="font-medium">{override.settingKey}</span>
                  <code className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
                    {JSON.stringify(override.valueJson)}
                  </code>
                  <span className="text-muted-foreground ml-auto text-xs">
                    default: {JSON.stringify(override.defaultValueJson)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}