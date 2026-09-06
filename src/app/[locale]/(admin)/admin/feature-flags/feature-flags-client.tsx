"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, ChevronsUpDown, CircleSlash, Plus, Trash2 } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  FormMessage,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast,
} from "@/components/ui";
import type { OrgSelectOption } from "@/features/admin/data";
import type { FeatureFlagMatrixRow } from "@/features/admin/flags";
import {
  createFeatureFlagAction,
  deleteFeatureFlagAction,
  setFlagValueAction,
  setGlobalFlagAction,
} from "@/features/admin/flags-actions";
import { FLAG_METRICS, type FlagValueState, type FlagMetric } from "@/features/admin/schema";

/**
 * Feature-flag matrix UI (apex-dashboard-plan Faza 3).
 *
 * Rows = flags, columns = Global | one per client group | the selected client.
 * Every override cell is TRI-STATE — on / off / inherit — because "no row" means
 * "inherit", never "off", in the inheritance engine (§0.10). Clicking cycles.
 *
 * Why the cells call the actions imperatively (startTransition) instead of
 * `<form>`+useActionState like the group CRUD: the number of cells is dynamic
 * (~flags × ~groups) and hooks cannot be called in a loop. The actions share the
 * same requireSuperAdmin → withSystemBypass → recordAudit invariants regardless
 * of how they are invoked.
 */
export function FeatureFlagsClient({
  matrix,
  groups,
  orgOptions,
  selectedOrgId,
}: {
  matrix: FeatureFlagMatrixRow[];
  groups: { id: string; name: string }[];
  orgOptions: OrgSelectOption[];
  selectedOrgId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const selectedOrg = orgOptions.find((o) => o.id === selectedOrgId) ?? null;

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

  const cycle = (value: boolean | null): FlagValueState =>
    value === null ? "on" : value ? "off" : "inherit";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Feature Flags</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            One row per flag. Organizations inherit Global → group → their own override.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrgCombobox
            orgOptions={orgOptions}
            selectedOrg={selectedOrg}
            onSelect={(orgId) => {
              const url = orgId ? `/admin/feature-flags?org=${orgId}` : "/admin/feature-flags";
              router.replace(url, { scroll: false });
            }}
          />
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Add flag
          </Button>
        </div>
      </div>

      {matrix.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground pt-6 text-sm">
            No feature flags yet. Create the first one with “Add flag”.
          </CardContent>
        </Card>
      ) : (
        <Card className={pending ? "pointer-events-none opacity-60" : undefined}>
          <CardContent className="overflow-x-auto pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-52">Flag</TableHead>
                  <TableHead className="text-center">Global</TableHead>
                  {groups.map((g) => (
                    <TableHead key={g.id} className="text-center">
                      {g.name}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Klient</TableHead>
                  <TableHead className="min-w-36">Warunek</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrix.map((row) => {
                  const cell = cycle(row.orgOverride);
                  return (
                    <TableRow key={row.flag.key}>
                      <TableCell>
                        <div className="font-medium">{row.flag.label}</div>
                        <div className="text-muted-foreground font-mono text-xs">{row.flag.key}</div>
                        {row.flag.description ? (
                          <div className="text-muted-foreground mt-0.5 max-w-60 text-xs">
                            {row.flag.description}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          aria-label={`${row.flag.label}: global`}
                          checked={row.enabledGlobal}
                          onCheckedChange={(on) => {
                            if (on === row.enabledGlobal) return;
                            run(() =>
                              setGlobalFlagAction({ featureKey: row.flag.key, enabled: on }),
                            );
                          }}
                        />
                      </TableCell>
                      {row.groupOverrides.map((g) => (
                        <TableCell key={g.groupId} className="text-center">
                          <CellToggle
                            featureKey={row.flag.key}
                            scope="group"
                            scopeId={g.groupId}
                            value={g.enabled}
                            pending={pending}
                            onCycle={(next) => run(() => setFlagValueAction(next))}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        {selectedOrg ? (
                          <div className="flex flex-col items-center gap-1">
                            <CellToggle
                              featureKey={row.flag.key}
                              scope="organization"
                              scopeId={selectedOrg.id}
                              value={row.orgOverride}
                              pending={pending}
                              onCycle={(next) => run(() => setFlagValueAction(next))}
                            />
                            {cell === "inherit" ? (
                              <span className="text-muted-foreground text-[10px]">
                                inherits {row.enabledGlobal ? "on" : "off"}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ConditionCell row={row} orgSelected={selectedOrg !== null} />
                      </TableCell>
                      <TableCell>
                        <ConfirmDialog
                          trigger={
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Delete ${row.flag.label}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          }
                          title={`Delete "${row.flag.label}"?`}
                          description="The flag and its override values are removed. Every runtime check for this key falls back to disabled."
                          confirmLabel="Delete flag"
                          disabled={pending}
                          onConfirm={() =>
                            run(() => deleteFeatureFlagAction({ featureKey: row.flag.key }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CreateFlagDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

/** A single tri-state override cell: null=inherit → on → off → inherit. */
function CellToggle({
  featureKey,
  scope,
  scopeId,
  value,
  pending,
  onCycle,
}: {
  featureKey: string;
  scope: "group" | "organization";
  scopeId: string;
  value: boolean | null;
  pending: boolean;
  onCycle: (next: { featureKey: string; scope: "group" | "organization"; scopeId: string; value: FlagValueState }) => void;
}) {
  // The cell shows the CURRENT state; clicking advances to the next one.
  const label = value === true ? "On" : value === false ? "Off" : "Auto";
  const next = value === true ? "off" : value === false ? "inherit" : "on";
  const color =
    value === true
      ? "text-success border-success/30 bg-success/10"
      : value === false
        ? "text-destructive border-destructive/30 bg-destructive/10"
        : "text-muted-foreground border-border bg-secondary/40";

  return (
    <button
      type="button"
      disabled={pending}
      title={`${label} — click for ${next}`}
      onClick={() =>
        onCycle({
          featureKey,
          scope,
          scopeId,
          value: next,
        })
      }
      className={cnCell(color)}
    >
      {value === true ? (
        <Circle className="size-2.5 fill-current" />
      ) : value === false ? (
        <CircleSlash className="size-2.5" />
      ) : (
        <Circle className="size-2.5 opacity-50" />
      )}
      {label}
    </button>
  );
}

function cnCell(color: string): string {
  return `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${color}`;
}

/** The condition column: `{metric} ≥ {gte}`, plus a met/not indicator. */
function ConditionCell({
  row,
  orgSelected,
}: {
  row: FeatureFlagMatrixRow;
  orgSelected: boolean;
}) {
  const c = row.flag.condition;
  if (!c) return <span className="text-muted-foreground text-sm">—</span>;

  return (
    <div className="flex flex-col items-start gap-1">
      <code className="text-xs">
        {c.metric} ≥ {c.gte}
      </code>
      {orgSelected ? (
        <Badge variant={row.conditionMatched ? "success" : "warning"}>
          {row.conditionMatched ? "met" : "not met"}
        </Badge>
      ) : (
        <Badge variant="outline">auto</Badge>
      )}
    </div>
  );
}

/**
 * Searchable organization selector — cmdk-based combobox. Sets the `org` query
 * param in the URL (the page reads it server-side to render the Klient column).
 */
function OrgCombobox({
  orgOptions,
  selectedOrg,
  onSelect,
}: {
  orgOptions: OrgSelectOption[];
  selectedOrg: OrgSelectOption | null;
  onSelect: (orgId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="max-w-72 justify-between">
          {selectedOrg ? (
            <>
              <span className="truncate">{selectedOrg.name}</span>
              <span className="text-muted-foreground text-xs">/{selectedOrg.slug}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Select organization…</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search organizations…" />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup>
              {orgOptions.map((org) => (
                <CommandItem
                  key={org.id}
                  value={`${org.name} ${org.slug}`}
                  onSelect={() => {
                    onSelect(org.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cnCheck(selectedOrg?.id === org.id)}
                  />
                  <span className="truncate">{org.name}</span>
                  <span className="text-muted-foreground text-xs">/{org.slug}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function cnCheck(checked: boolean): string {
  return `size-4 shrink-0 ${checked ? "opacity-100" : "opacity-0"}`;
}

/** Dialog to create a flag in the dictionary. */
function CreateFlagDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [enabledGlobal, setEnabledGlobal] = useState(false);
  const [hasCondition, setHasCondition] = useState(false);
  const [metric, setMetric] = useState<FlagMetric>("members");
  const [gte, setGte] = useState("1000");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add feature flag</DialogTitle>
          <DialogDescription>
            A key is the stable identifier read by the runtime; changing it later
            breaks every override pointing at it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <FormField label="Key" htmlFor="ff-key" hint="e.g. export_csv, ai_assistant">
            <Input
              id="ff-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="feature_key"
              autoFocus
            />
          </FormField>
          <FormField label="Label" htmlFor="ff-label">
            <Input
              id="ff-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Human-readable name"
            />
          </FormField>
          <FormField label="Description" htmlFor="ff-desc">
            <Textarea
              id="ff-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional — what this flag toggles."
            />
          </FormField>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="ff-global">Enabled by default (Global)</Label>
            <Switch
              id="ff-global"
              checked={enabledGlobal}
              onCheckedChange={setEnabledGlobal}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-md border p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Conditional</div>
                <div className="text-muted-foreground text-xs">
                  Automatically gate on a resource metric.
                </div>
              </div>
              <Switch
                aria-label="Enable condition"
                checked={hasCondition}
                onCheckedChange={setHasCondition}
              />
            </div>
            {hasCondition ? (
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Metric" htmlFor="ff-metric">
                  <Select value={metric} onValueChange={(v) => setMetric(v as FlagMetric)}>
                    <SelectTrigger id="ff-metric">
                      <SelectValue placeholder="Metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {FLAG_METRICS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="≥" htmlFor="ff-gte">
                  <Input
                    id="ff-gte"
                    type="number"
                    min={0}
                    value={gte}
                    onChange={(e) => setGte(e.target.value)}
                  />
                </FormField>
              </div>
            ) : null}
          </div>

          {error ? <FormMessage>{error}</FormMessage> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              pending ||
              !key.trim() ||
              !label.trim() ||
              (hasCondition && (Number.isNaN(Number(gte)) || Number(gte) < 0))
            }
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await createFeatureFlagAction({
                  key: key.trim(),
                  label: label.trim(),
                  description: description.trim() || undefined,
                  enabledGlobal,
                  condition: hasCondition
                    ? { metric, gte: Number(gte) }
                    : null,
                });
                if (res.success) {
                  toast.success(res.success);
                  onOpenChange(false);
                  setKey("");
                  setLabel("");
                  setDescription("");
                  setEnabledGlobal(false);
                  setHasCondition(false);
                  setGte("1000");
                } else if (res.fieldErrors) {
                  setError(Object.values(res.fieldErrors).flat().join(" "));
                } else {
                  setError(res.error ?? "Something went wrong.");
                }
              });
            }}
          >
            {pending ? "Creating…" : "Create flag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}