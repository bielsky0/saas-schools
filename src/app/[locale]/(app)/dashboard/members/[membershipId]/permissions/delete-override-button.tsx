"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useId } from "react";

import { Button, ConfirmDialog, toast } from "@/components/ui";
import { deletePermissionOverrideAction } from "@/features/organizations/actions";
import type { ActionState } from "@/features/organizations/actions";

const initial: ActionState = {};

export function DeleteOverrideButton({ overrideId }: { overrideId: string }) {
  const [state, action, pending] = useActionState(deletePermissionOverrideAction, initial);
  const formId = useId();
  const t = useTranslations("organizations.permissions");

  useEffect(() => {
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <>
      <form id={formId} action={action}>
        <input type="hidden" name="overrideId" value={overrideId} />
      </form>
      <ConfirmDialog
        trigger={
          <Button type="button" variant="ghost" size="sm" disabled={pending}>
            {pending ? t("deleting") : t("delete")}
          </Button>
        }
        title={t("confirmDeleteTitle")}
        description={t("confirmDeleteBody")}
        confirmLabel={t("confirmDeleteAction")}
        confirmForm={formId}
        disabled={pending}
      />
    </>
  );
}
