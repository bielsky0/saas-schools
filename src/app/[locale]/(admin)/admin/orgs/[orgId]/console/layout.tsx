import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui";
import { requireSuperAdmin } from "@/features/admin/context";
import { getConsoleOrg } from "@/features/admin/org-console/data";
import { ConsoleNav } from "@/features/admin/components/console/console-nav";

/**
 * Org-console shell (apex-dashboard-plan 4.2) — `/admin/orgs/[orgId]/console/*`.
 *
 * Section nav + the org's name in the header. The guard is re-checked here and —
 * as in the root admin layout — this is NOT the security boundary for the
 * routes' server actions, each of which calls `requireSuperAdmin()` as its
 * first line.
 */
export default async function OrgConsoleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgId: string; locale: string }>;
}) {
  const { orgId, locale } = await params;
  await requireSuperAdmin(`/admin/orgs/${orgId}/console`);

  const org = await getConsoleOrg(orgId);
  if (!org) notFound();

  const base = `/${locale}/admin/orgs/${orgId}/console`;

  return (
    <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
      <aside>
        <ConsoleNav base={base} />
      </aside>
      <div className="min-w-0 space-y-6">
        <div>
          <div className="text-muted-foreground text-sm">Konsola{org.status ? " · " + org.status : ""}</div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{org.name}</h1>
            <Badge variant="outline">/{org.slug}</Badge>
            <Link
              href={`/${locale}/admin/organizations/${orgId}`}
              className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
            >
              Organization page
            </Link>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}