import { Badge } from "@/components/ui";

/**
 * Org lifecycle status badge (apex-dashboard-plan 2.1). Presentational only —
 * the status itself is maintained by the subscription webhook and soft-delete
 * (migration 0090).
 */
export function OrgStatusBadge({ status }: { status: string }) {
  const variant =
    status === "active"
      ? "success"
      : status === "trial"
        ? "warning"
        : status === "suspended"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}