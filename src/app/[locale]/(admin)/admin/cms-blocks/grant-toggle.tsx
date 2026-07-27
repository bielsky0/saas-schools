"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import type { FormState } from "@/lib/validation/state";

import {
  grantBlockAction,
  revokeBlockAction,
} from "@/features/cms/admin-block-actions";

type Props = {
  orgId: string;
  blockKey: string;
  granted: boolean;
};

export function GrantToggle({ orgId, blockKey, granted }: Props) {
  const action = granted ? revokeBlockAction : grantBlockAction;

  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="blockKey" value={blockKey} />
      <Button
        type="submit"
        size="sm"
        variant={granted ? "destructive" : "outline"}
        disabled={pending}
      >
        {pending ? "..." : granted ? "Revoke" : "Grant"}
      </Button>
    </form>
  );
}
