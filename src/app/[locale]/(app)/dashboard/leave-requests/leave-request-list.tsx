"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { LeaveRequestRow } from "@/features/trainers/leave-data";
import { DetailModal } from "./leave-request-modal";

const STATUS_COLORS: Record<string, "default" | "success" | "destructive" | "outline"> = {
  submitted: "default",
  approved: "success",
  rejected: "destructive",
  cancelled: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Oczekujący",
  approved: "Zatwierdzony",
  rejected: "Odrzucony",
  cancelled: "Anulowany",
};

export function LeaveRequestList({
  requests,
  isAdmin,
  trainers,
}: {
  requests: LeaveRequestRow[];
  isAdmin: boolean;
  trainers: { userId: string; name: string | null; email: string }[];
}) {
  const t = useTranslations("dashboard.leaveRequests");
  const [statusTab, setStatusTab] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestRow | null>(null);

  const filtered =
    statusTab === "all" ? requests : requests.filter((r) => r.status === statusTab);

  const formatDate = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const trainerName = (trainerId: string) => {
    const tr = trainers.find((t) => t.userId === trainerId);
    return tr?.name ?? tr?.email ?? trainerId;
  };

  return (
    <>
      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList>
          <TabsTrigger value="all">{t("all")}</TabsTrigger>
          <TabsTrigger value="submitted">{t("pending")}</TabsTrigger>
          <TabsTrigger value="approved">{t("approved")}</TabsTrigger>
          <TabsTrigger value="rejected">{t("rejected")}</TabsTrigger>
          <TabsTrigger value="cancelled">{t("cancelled")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center text-sm">
              {t("noRequests")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                {isAdmin && <th className="pb-3 pr-4 font-medium">{t("trainer")}</th>}
                <th className="pb-3 pr-4 font-medium">{t("dates")}</th>
                <th className="pb-3 pr-4 font-medium">{t("sessions")}</th>
                <th className="pb-3 pr-4 font-medium">{t("status")}</th>
                <th className="pb-3 pr-4 font-medium">{t("submittedAt")}</th>
                <th className="pb-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr
                  key={req.id}
                  className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedRequest(req)}
                >
                  {isAdmin && (
                    <td className="py-3 pr-4">{trainerName(req.trainerId)}</td>
                  )}
                  <td className="py-3 pr-4">
                    {formatDate(req.startDate)} – {formatDate(req.endDate)}
                  </td>
                  <td className="py-3 pr-4">{req.sessionCount}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={STATUS_COLORS[req.status] ?? "outline"}>
                      {STATUS_LABELS[req.status] ?? req.status}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {formatDate(req.createdAt)}
                  </td>
                  <td className="py-3 text-right">
                    {req.status === "submitted" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(req);
                        }}
                      >
                        {t("view")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRequest && (
        <DetailModal
          request={selectedRequest}
          isAdmin={isAdmin}
          trainers={trainers}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </>
  );
}

export function LeaveRequestListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export { STATUS_LABELS };
