"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";

import {
  Button,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@/components/ui";
import { OVERRIDABLE_PERMISSIONS } from "@/features/rbac";
import { upsertPermissionOverrideAction } from "@/features/organizations/actions";
import type { ActionState } from "@/features/organizations/actions";

const initial: ActionState = {};

export function PermissionOverrideForm({ membershipId }: { membershipId: string }) {
  const [state, action, pending] = useActionState(upsertPermissionOverrideAction, initial);
  const t = useTranslations("organizations.permissions");

  useEffect(() => {
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="membershipId" value={membershipId} />

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium">{t("permission")}</label>
        <Select name="permissionKey" required>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("selectPermission")} />
          </SelectTrigger>
          <SelectContent>
            {OVERRIDABLE_PERMISSIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium">{t("overrideType")}</label>
        <Select name="overrideType" required>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("selectType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grant">{t("grant")}</SelectItem>
            <SelectItem value="revoke">{t("revoke")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium">{t("reason")}</label>
        <Textarea
          name="reason"
          placeholder={t("reasonPlaceholder")}
          required
          className="min-h-16"
        />
      </div>

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={pending} size="sm">
          {pending ? t("saving") : t("save")}
        </Button>
        {state.error ? <FormMessage className="text-xs">{state.error}</FormMessage> : null}
      </div>
    </form>
  );
}
