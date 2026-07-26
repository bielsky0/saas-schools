import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ClientLoginPanel } from "@/features/client-auth/components/client-login-panel";
import { resolveClientSession } from "@/features/client-auth/session";
import { requireServedOrganization } from "@/features/organizations/served-org";

export const dynamic = "force-dynamic";

/**
 * Client login panel (langlion spec v19, EPIK 44 US-44.2/US-44.3, Faza 29b).
 *
 * ⚠️ `requireServedOrganization()` is the first statement, before anything else,
 * for the same reason it is on every `(site)` page: the proxy forwards
 * tenant-stage prefixes via an early return that skips default-deny. This call
 * is what `notFound()`s for the apex, a foreign host, or an unknown academy.
 */
export default async function ClientLoginPage() {
  const org = await requireServedOrganization();
  const t = await getTranslations("clientLogin");

  const principal = await resolveClientSession(org.id);
  if (principal?.isVerified) {
    redirect("/moje-zajecia");
  }

  return (
    <main className="mx-auto w-full max-w-sm space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{org.name}</p>
      </div>
      <ClientLoginPanel />
    </main>
  );
}
