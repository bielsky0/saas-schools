import { getTranslations } from "next-intl/server";

import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { requireOrgAccess } from "@/features/organizations/context";
import { listTrainers } from "@/features/trainers/data";
import { withTenant } from "@/lib/db/tenant";
import { Link } from "@/lib/i18n/navigation";

export default async function TrainersPage() {
  const { org } = await requireOrgAccess();
  const [t, td] = await Promise.all([
    getTranslations("dashboard.trainers"),
    getTranslations("dashboard.org"),
  ]);

  const trainers = await withTenant(org.id, (tx) => listTrainers(tx, org.id));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("heading")}</h1>
        <p className="text-muted-foreground text-sm">{org.name}</p>
      </div>

      {trainers.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colName")}</TableHead>
              <TableHead>{t("colEmail")}</TableHead>
              <TableHead className="text-right">{t("colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainers.map((tr) => (
              <TableRow key={tr.membershipId}>
                <TableCell className="font-medium">{tr.name || tr.email}</TableCell>
                <TableCell className="text-muted-foreground">{tr.email}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/trainers/${tr.userId}/availability`}>
                      {td("schedule")}
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
