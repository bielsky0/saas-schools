import type { ReactNode } from "react";

import { resolveClientSession } from "@/features/client-auth/session";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { ClientNotificationBell } from "@/features/notifications/components/client-notification-bell";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  let hasSession = false;
  try {
    const org = await requireServedOrganization();
    const principal = await resolveClientSession(org.id);
    hasSession = principal !== null;
  } catch {}

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 py-8">
      {hasSession ? (
        <div className="mb-6 flex items-center justify-end gap-4">
          <ClientNotificationBell />
        </div>
      ) : null}
      {children}
    </div>
  );
}
