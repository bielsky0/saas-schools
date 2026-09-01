import { getTranslations } from "next-intl/server";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { Link } from "@/lib/i18n/navigation";
import { requireOrgPermission } from "@/features/organizations/context";
import { getEnrollmentTemplates } from "@/lib/enrollment-data";
import { listGroupTypes } from "@/features/groups/data";
import { listLocations } from "@/features/locations/data";
import { listPolicyDocuments } from "@/features/policies/data";
import { listTrainers } from "@/features/trainers/data";
import { CopyGroupLinkButton } from "@/features/groups/components/copy-group-link-button";
import { GroupTypeWizardHost } from "@/features/groups/components/group-type-wizard-host";
import { withTenant } from "@/lib/db/tenant";
import { ExternalLink, Trash2, Plus } from "lucide-react";

/**
 * Group types (langlion EPIK 2) — the academy's offers.
 *
 * Reads both tables in ONE transaction rather than two `withTenant` calls: each
 * would take its own pooled connection to render one page, and both need the
 * tenant GUC. Sequential inside one transaction is two round-trips on one
 * connection (the pattern established in members/page.tsx).
 */
export default async function GroupTypesPage() {
  const { org } = await requireOrgPermission("group_types.manage");
  const t = await getTranslations("groups");

  const { groupTypes, locations, policyDocuments, trainers, enrollmentTemplates } = await withTenant(org.id, async (tx) => ({
    groupTypes: await listGroupTypes(tx, org.id),
    locations: await listLocations(tx, org.id),
    policyDocuments: await listPolicyDocuments(tx, org.id),
    trainers: await listTrainers(tx, org.id),
    enrollmentTemplates: await getEnrollmentTemplates(tx, org.id),
  }));

  const statusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="default">{t("status.scheduled")}</Badge>;
      case "collecting_interest":
        return <Badge variant="outline">{t("status.collecting_interest")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      {groupTypes.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <div className="space-y-4">
          {/* Bulk Actions Toolbar */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
            <input type="checkbox" id="select-all" className="rounded border-input" />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              {t("bulk.selectAll")}
            </label>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" disabled>
                <Plus className="w-4 h-4 mr-1" />
                {t("bulk.activate")}
              </Button>
              <Button variant="outline" size="sm" disabled>
                {t("bulk.deactivate")}
              </Button>
              <Button variant="outline" size="sm" disabled className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4 mr-1" />
                {t("bulk.delete")}
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><input type="checkbox" id="select-all-header" className="rounded border-input" /></TableHead>
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.slug")}</TableHead>
                <TableHead>{t("table.engine")}</TableHead>
                <TableHead>{t("table.price")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead className="text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupTypes.map((row) => (
                <TableRow key={row.id}>
                  <TableCell><input type="checkbox" className="rounded border-input" /></TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {row.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {t(
                        `engine.${row.engine}` as
                          "engine.schedule_first" | "engine.availability_first" | "engine.slot_first",
                      )}
                    </Badge>
                  </TableCell>
                  {/*
                    Minor units shown as stored (§2.14). Formatting them as currency
                    needs `organization.currency` through Intl, which arrives with
                    the client-facing pages in F5 — showing a wrong symbol here
                    would be worse than showing the raw integer an admin typed.
                  */}
                  <TableCell className="tabular-nums">{row.price}</TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Button asChild variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700">
                        <a href={`/zapisy/${row.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/group-types/${row.id}`}>{t("manage")}</Link>
                      </Button>
                      <CopyGroupLinkButton slug={row.slug} />
                      <Button
                        variant="ghost"
                        size="icon"
                        formAction={`/dashboard/group-types/${row.id}/duplicate`}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("form.createTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupTypeWizardHost
            locations={locations}
            policyDocuments={policyDocuments}
            enrollmentTemplates={enrollmentTemplates}
            trainers={trainers.map((trainer) => ({
              id: trainer.userId,
              label: trainer.name ? `${trainer.name} (${trainer.email})` : trainer.email,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
