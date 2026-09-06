"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Infinity as InfinityIcon, Pencil, RotateCcw } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  FormMessage,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@/components/ui";
import {
  deleteGroupLimitAction,
  upsertGroupLimitAction,
} from "@/features/admin/limits-actions";
import {
  LIMIT_DESCRIPTIONS,
  LIMIT_KEYS,
  LIMIT_LABELS,
} from "@/features/billing/limits";

/**
 * Limits matrix UI (apex-dashboard-plan Faza 5, §5.1).
 *
 * Rows = limit keys, columns = one per client group. A cell shows the group's
 * override: a number, "Unlimited" (explicit NULL — wins over every number in
 * the group tier), or "Inherit" (no row — falls through to the plan). Clicking
 * a cell opens a small editor to set a number / unlimited, or to reset to
 * inherit. Cells are dynamic, so the actions are called imperatively through
 * useTransition (same approach as the feature-flag matrix) — never a `<form>`
 * per cell with useActionState.
 */
export function LimitsClient({
  groups,
  groupLimits,
  orgOverrides,
}: {
  groups: { id: string; name: string }[];
  groupLimits: { groupId: string; limitKey: string; limitValue: number | null }[];
  orgOverrides: { organizationId: string; limitKey: string; limitValue: number | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<{ groupId: string; limitKey: string } | null>(null);

  const run = (fn: () => Promise<{ success?: string; error?: string } | undefined>) => {
    startTransition(async () => {
      const res = await fn();
      if (res?.success) {
        toast.success(res.success);
        router.refresh();
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  };

  const byCell = new Map(groupLimits.map((r) => [`${r.groupId}:${r.limitKey}`, r.limitValue]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Limits</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Group overrides sit between an organization&apos;s own override and the plan
          default. In the group tier the highest value wins, and unlimited beats every
          number.
        </p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground pt-6 text-sm">
            No client groups yet. Create the first one under Groups.
          </CardContent>
        </Card>
      ) : (
        <Card className={pending ? "pointer-events-none opacity-60" : undefined}>
          <CardContent className="overflow-x-auto pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-52">Limit</TableHead>
                  {groups.map((g) => (
                    <TableHead key={g.id} className="min-w-32">
                      {g.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {LIMIT_KEYS.map((key) => {
                  const override = (cell: string) => byCell.get(cell) as number | null | undefined;
                  return (
                    <TableRow key={key}>
                      <TableCell>
                        <div className="font-medium">{LIMIT_LABELS[key]}</div>
                        <div className="text-muted-foreground font-mono text-xs">{key}</div>
                        <div className="text-muted-foreground mt-0.5 max-w-60 text-xs">
                          {LIMIT_DESCRIPTIONS[key]}
                        </div>
                      </TableCell>
                      {groups.map((g) => {
                        const value = override(`${g.id}:${key}`);
                        return (
                          <TableCell key={g.id}>
                            <CellValue
                              value={value}
                              onClick={() => setEditing({ groupId: g.id, limitKey: key })}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organization overrides</CardTitle>
        </CardHeader>
        <CardContent>
          {orgOverrides.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No organization-level overrides. Set them per organization from Plans →
              edit → organization overrides.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgOverrides.map((o) => (
                  <TableRow key={`${o.organizationId}:${o.limitKey}`}>
                    <TableCell className="font-mono text-xs">{o.organizationId}</TableCell>
                    <TableCell className="font-mono text-xs">{o.limitKey}</TableCell>
                    <TableCell>
                      {o.limitValue === null ? (
                        <Badge variant="success">unlimited</Badge>
                      ) : (
                        o.limitValue
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing ? (
        <LimitCellEditor
          group={groups.find((g) => g.id === editing.groupId)}
          limitKey={editing.limitKey}
          current={byCell.get(`${editing.groupId}:${editing.limitKey}`)}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(limitValue) => {
            setEditing(null);
            run(() =>
              upsertGroupLimitAction({
                groupId: editing.groupId,
                limitKey: editing.limitKey,
                limitValue,
              }),
            );
          }}
          onReset={() => {
            setEditing(null);
            run(() =>
              deleteGroupLimitAction({ groupId: editing.groupId, limitKey: editing.limitKey }),
            );
          }}
        />
      ) : null}
    </div>
  );
}

/** A group-limit cell: number / Unlimited / Inherit, clickable to edit. */
function CellValue({
  value,
  onClick,
}: {
  value: number | null | undefined;
  onClick: () => void;
}) {
  const label =
    value === undefined ? "Inherit" : value === null ? "Unlimited" : String(value);

  return (
    <button
      type="button"
      onClick={onClick}
      title="Edit group override"
      className="group inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm hover:border-border hover:bg-secondary/40"
    >
      {value === null ? (
        <InfinityIcon className="size-3.5 text-success" />
      ) : null}
      <span
        className={
          value === undefined
            ? "text-muted-foreground"
            : value === null
              ? "font-medium text-success"
              : "font-medium"
        }
      >
        {label}
      </span>
      <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

/** Set a group override to a number / unlimited (empty), or reset to inherit. */
function LimitCellEditor({
  group,
  limitKey,
  current,
  pending,
  onClose,
  onSave,
  onReset,
}: {
  group: { id: string; name: string } | undefined;
  limitKey: string;
  current: number | null | undefined;
  pending: boolean;
  onClose: () => void;
  onSave: (limitValue: number | null) => void;
  onReset: () => void;
}) {
  const [raw, setRaw] = useState(current === undefined || current === null ? "" : String(current));

  const parsed = raw.trim() === "" ? null : Number(raw);
  const invalid =
    parsed !== null && (!Number.isInteger(parsed) || parsed < 0);

  return (
    <Dialog open onOpenChange={() => !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {LIMIT_LABELS[limitKey as keyof typeof LIMIT_LABELS] ?? limitKey} — {group?.name}
          </DialogTitle>
          <DialogDescription>
            Empty value = unlimited. “Reset” removes the override so the organization
            inherits the plan default again.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <FormField
            label={`Value (${limitKey})`}
            htmlFor="limit-value"
            hint="Leave empty for unlimited."
          >
            <Input
              id="limit-value"
              type="number"
              min={0}
              step={1}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Empty = unlimited"
              autoFocus
            />
          </FormField>

          {current !== undefined ? (
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Currently overridden</div>
                <div className="text-muted-foreground text-xs">
                  {current === null ? "unlimited" : current}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={onReset}
              >
                <RotateCcw className="size-4" />
                Reset to inherit
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Currently inherited</div>
                <div className="text-muted-foreground text-xs">No override — plan default applies.</div>
              </div>
            </div>
          )}

          {invalid ? <FormMessage>Must be a non-negative whole number, or empty.</FormMessage> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || invalid}
            onClick={() => onSave(parsed)}
          >
            {pending ? "Saving…" : "Save override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}