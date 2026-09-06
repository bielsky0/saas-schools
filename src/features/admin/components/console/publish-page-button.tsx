"use client";

import { useActionState, useEffect } from "react";

import { Button, FormMessage, toast } from "@/components/ui";
import { publishPageAction } from "@/features/admin/org-console";
import type { FormState } from "@/lib/validation";

const initial: FormState = {};

/**
 * Console publish button (apex-dashboard-plan 4.2 pages — Publish only;
 * rollback/timeline lands in Faza 6). Snapshot + publish in one action.
 */
export function PublishPageButton({
  organizationId,
  pageId,
  disabled,
}: {
  organizationId: string;
  pageId: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(publishPageAction, initial);

  useEffect(() => {
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="pageId" value={pageId} />
        <Button type="submit" variant="outline" size="sm" disabled={pending || disabled}>
          {pending ? "Publishing…" : "Publish"}
        </Button>
      </form>
      {state.error ? <FormMessage className="text-xs">{state.error}</FormMessage> : null}
    </div>
  );
}