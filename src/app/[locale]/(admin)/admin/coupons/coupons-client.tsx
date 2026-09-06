"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@/components/ui";
import type { AdminCouponRow } from "@/features/admin/coupons";
import { createCouponAction, deleteCouponAction } from "@/features/admin/coupons-actions";
import type { FormState } from "@/lib/validation";

const initial: FormState = {};

/**
 * Coupons list (apex-dashboard-plan Faza 5, §5.2).
 *
 * Rows link to a per-coupon detail page (/admin/coupons/[couponId]) showing
 * redemptions. Creation uses a `useFormState`-driven dialog modal (a fixed,
 * small number of fields — unlike the dynamic matrix cells on Limits).
 */
export function CouponsClient({ coupons }: { coupons: AdminCouponRow[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [, startTransition] = useTransition();

  const scopeLabel = (scope: string) =>
    scope === "global" ? "Global" : scope === "group" ? "Group" : "Organization";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Coupons</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Discount codes redeemable by an organization against its next checkout.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Add coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground pt-6 text-sm">
            No coupons yet. Create the first one with “Add coupon”.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Redemptions</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => {
                  const expired = coupon.expired;
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <Link
                          href={`/admin/coupons/${coupon.id}`}
                          className="font-mono font-medium hover:underline"
                        >
                          {coupon.code}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{coupon.type}</TableCell>
                      <TableCell className="text-sm">
                        {coupon.type === "percent" ? `${coupon.value}%` : `${coupon.value} ${coupon.currency?.toUpperCase() ?? ""}`}
                      </TableCell>
                      <TableCell className="text-sm">
                        {scopeLabel(coupon.scope)}
                        {coupon.scope !== "global" ? (
                          <span className="text-muted-foreground text-xs"> · {coupon.scopeId}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {coupon.expiresAt ? (
                          <Badge variant={expired ? "destructive" : "outline"}>
                            {coupon.expiresAt.toLocaleDateString()}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{coupon.redemptionCount}</TableCell>
                      <TableCell>
                        <ConfirmDialog
                          trigger={
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Delete ${coupon.code}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          }
                          title={`Delete "${coupon.code}"?`}
                          description="The coupon and all of its redemptions are removed. Active discounts stop applying."
                          confirmLabel="Delete coupon"
                          onConfirm={() => {
                            startTransition(async () => {
                              const fd = new FormData();
                              fd.set("couponId", coupon.id);
                              const out = await deleteCouponAction(initial, fd);
                              if (out.success) {
                                toast.success(out.success);
                                router.refresh();
                              } else {
                                toast.error(out.error ?? "Something went wrong.");
                              }
                            });
                          }}
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

      <CreateCouponDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

/** Create-coupon dialog using a useFormState-bound server action. */
function CreateCouponDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action] = useActionState(createCouponAction, initial);
  const [pending] = useTransition();

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  const close = () => {
    if (!pending) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add coupon</DialogTitle>
          <DialogDescription>
            A code is case-insensitive (stored uppercase). It applies to the next
            checkout of an organization that redeems it.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="grid gap-4">
          <FormField label="Code" htmlFor="c-code" hint="e.g. WELCOME20">
            <Input id="c-code" name="code" placeholder="WELCOME20" autoFocus />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Type" htmlFor="c-type">
              <Select name="type" defaultValue="percent">
                <SelectTrigger id="c-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Value" htmlFor="c-value">
              <Input id="c-value" name="value" type="number" min={1} placeholder="20" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Currency" htmlFor="c-currency" hint="Amount coupons only">
              <Input id="c-currency" name="currency" placeholder="pln" />
            </FormField>
            <FormField label="Max activations" htmlFor="c-max">
              <Input id="c-max" name="maxActivations" type="number" min={1} placeholder="Unlimited" />
            </FormField>
          </div>
          <FormField label="Expires" htmlFor="c-exp">
            <Input id="c-exp" name="expiresAt" type="date" />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Scope" htmlFor="c-scope">
              <Select name="scope" defaultValue="global">
                <SelectTrigger id="c-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Scope id" htmlFor="c-scopeid" hint="group/org id for non-global">
              <Input id="c-scopeid" name="scopeId" placeholder="…" />
            </FormField>
          </div>

          {state.error ? <FormMessage>{state.error}</FormMessage> : null}
          {state.fieldErrors ? (
            <FormMessage>{Object.values(state.fieldErrors).flat().join(" ")}</FormMessage>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
