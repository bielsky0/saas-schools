"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  approveLeaveRequestAction,
  cancelLeaveRequestAction,
  rejectLeaveRequestAction,
} from "@/features/trainers/leave-actions";
import type { LeaveRequestRow } from "@/features/trainers/leave-data";
import type { FormState } from "@/lib/validation";

import { STATUS_LABELS } from "./leave-request-list";

const STATUS_COLORS: Record<string, "default" | "success" | "destructive" | "outline"> = {
  submitted: "default",
  approved: "success",
  rejected: "destructive",
  cancelled: "outline",
};

export function DetailModal({
  request,
  isAdmin,
  trainers,
  onClose,
}: {
  request: LeaveRequestRow;
  isAdmin: boolean;
  trainers: { userId: string; name: string | null; email: string }[];
  onClose: () => void;
}) {
  const t = useTranslations("dashboard.leaveRequests");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [substituteId, setSubstituteId] = useState("");

  const [approveState, approveAction, approvePending] = useActionState<FormState, FormData>(approveLeaveRequestAction, {});
  const [rejectState, rejectAction, rejectPending] = useActionState<FormState, FormData>(rejectLeaveRequestAction, {});
  const [cancelState, cancelAction, cancelPending] = useActionState<FormState, FormData>(cancelLeaveRequestAction, {});

  const formatDate = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const trainerName = (trainerId: string | null) => {
    if (!trainerId) return "-";
    const tr = trainers.find((t) => t.userId === trainerId);
    return tr?.name ?? tr?.email ?? trainerId;
  };

  const availableSubstitutes = trainers.filter((t) => t.userId !== request.trainerId);

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("requestDetails")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">{t("trainer")}</Label>
                <p className="text-sm font-medium">{trainerName(request.trainerId)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">{t("status")}</Label>
                <div className="mt-1">
                  <Badge variant={STATUS_COLORS[request.status] ?? "outline"}>
                    {STATUS_LABELS[request.status] ?? request.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">{t("startDate")}</Label>
                <p className="text-sm font-medium">{formatDate(request.startDate)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">{t("endDate")}</Label>
                <p className="text-sm font-medium">{formatDate(request.endDate)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">{t("sessions")}</Label>
                <p className="text-sm font-medium">{request.sessionCount}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">{t("submittedAt")}</Label>
                <p className="text-sm font-medium">{formatDate(request.createdAt)}</p>
              </div>
            </div>

            {request.reason && (
              <div>
                <Label className="text-muted-foreground text-xs">{t("reason")}</Label>
                <p className="text-sm">{request.reason}</p>
              </div>
            )}

            {request.substituteTrainerId && (
              <div>
                <Label className="text-muted-foreground text-xs">{t("substitute")}</Label>
                <p className="text-sm font-medium">{trainerName(request.substituteTrainerId)}</p>
              </div>
            )}

            {request.rejectionReason && (
              <div>
                <Label className="text-muted-foreground text-xs">{t("rejectionReason")}</Label>
                <p className="text-sm text-destructive">{request.rejectionReason}</p>
              </div>
            )}

            {request.reviewedAt && (
              <div>
                <Label className="text-muted-foreground text-xs">{t("reviewedAt")}</Label>
                <p className="text-sm text-muted-foreground">{formatDate(request.reviewedAt)}</p>
              </div>
            )}

            {/* Admin actions for pending requests */}
            {isAdmin && request.status === "submitted" && (
              <div className="border-t pt-4">
                <div className="mb-4">
                  <Label>{t("substituteOptional")}</Label>
                  <Select value={substituteId} onValueChange={setSubstituteId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectSubstitute")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubstitutes.map((tr) => (
                        <SelectItem key={tr.userId} value={tr.userId}>
                          {tr.name ?? tr.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <form
                    action={approveAction}
                    onSubmit={() => {
                      setTimeout(() => onClose(), 100);
                    }}
                  >
                    <input type="hidden" name="requestId" value={request.id} />
                    {substituteId && (
                      <input type="hidden" name="substituteTrainerId" value={substituteId} />
                    )}
                    <Button type="submit" variant="default" className="bg-green-600 hover:bg-green-700" disabled={approvePending}>
                      {approvePending ? t("approving") : t("approve")}
                    </Button>
                  </form>

                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    {t("reject")}
                  </Button>
                </div>

                {approveState?.error && (
                  <p className="mt-2 text-sm text-destructive">{approveState.error}</p>
                )}
              </div>
            )}

            {/* Trainer cancel own request */}
            {!isAdmin && (request.status === "submitted" || request.status === "approved") && (
              <div className="border-t pt-4">
                <form action={cancelAction}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <Button type="submit" variant="outline" className="text-destructive" disabled={cancelPending}>
                    {cancelPending ? t("cancelling") : t("cancelRequest")}
                  </Button>
                  {cancelState?.error && (
                    <p className="mt-2 text-sm text-destructive">{cancelState.error}</p>
                  )}
                </form>
              </div>
            )}

            {/* Admin cancel approved request */}
            {isAdmin && request.status === "approved" && (
              <div className="border-t pt-4">
                <form action={cancelAction}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <Button type="submit" variant="outline" className="text-destructive" disabled={cancelPending}>
                    {cancelPending ? t("cancelling") : t("cancelRequest")}
                  </Button>
                  {cancelState?.error && (
                    <p className="mt-2 text-sm text-destructive">{cancelState.error}</p>
                  )}
                </form>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject confirmation dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rejectConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("rejectConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form
            action={rejectAction}
            onSubmit={() => {
              setTimeout(() => onClose(), 100);
            }}
          >
            <input type="hidden" name="requestId" value={request.id} />
            <div className="mb-4">
              <Label htmlFor="rejectReason">{t("rejectionReason")} *</Label>
              <Textarea
                id="rejectReason"
                name="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("rejectionReasonPlaceholder")}
                required
              />
            </div>

            {rejectState?.error && (
              <p className="mb-2 text-sm text-destructive">{rejectState.error}</p>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel type="button">{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction type="submit" disabled={!rejectReason.trim() || rejectPending}>
                {rejectPending ? t("rejecting") : t("reject")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
