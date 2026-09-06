import { Button, Input, Label } from "@/components/ui";
import { ORG_STATUSES, type OrgListQuery } from "../schema";

/**
 * Organization list filters (apex-dashboard-plan 2.1 — status, plan, registration
 * dates).
 *
 * A plain GET form with zero client JavaScript — the same URL-as-state principle
 * as `UserFilters` (refresh-safe, shareable, back-button-correct, JS-off friendly).
 * The status control is a NATIVE `<select>` for the same reason it is there.
 */
export function OrgFilters({ query }: { query: OrgListQuery }) {
  return (
    <form method="GET" action="/admin/organizations" className="flex flex-wrap items-end gap-3">
      <div className="min-w-56 flex-1">
        <Label htmlFor="admin-q">Search</Label>
        <Input
          id="admin-q"
          name="q"
          type="search"
          defaultValue={query.q}
          placeholder="Name or slug"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="admin-status">Status</Label>
        <select
          id="admin-status"
          name="status"
          defaultValue={query.status}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring mt-1.5 h-9 rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {ORG_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All statuses" : status}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="admin-plan">Plan</Label>
        <Input
          id="admin-plan"
          name="plan"
          type="search"
          defaultValue={query.plan}
          placeholder="e.g. pro"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="admin-from">Registered from</Label>
        <Input
          id="admin-from"
          name="from"
          type="date"
          defaultValue={query.from}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="admin-to">to</Label>
        <Input id="admin-to" name="to" type="date" defaultValue={query.to} className="mt-1.5" />
      </div>

      <Button type="submit" variant="secondary">
        Filter
      </Button>
    </form>
  );
}