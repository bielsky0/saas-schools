"use client";

import { useActionState, useEffect, useId, useState } from "react";

import {
  Button,
  ConfirmDialog,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@/components/ui";
import { impersonateUserAction } from "@/features/admin/actions";
import {
  changeRoleAction,
  inviteTeamUserAction,
  setMemberStatusAction,
} from "@/features/admin/org-console";
import { assignableRole } from "@/features/organizations/schema";
import type { FormState } from "@/lib/validation";

const initial: FormState = {};

const roleLabel = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);

/**
 * Console invite form (apex-dashboard-plan 4.2 teams). The action returns the
 * shareable invite link in its success message; it is rendered as copyable text
 * because there is no mailbox here (the org feature emails it — the admin tool
 * returns it).
 */
export function ConsoleInviteForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState(inviteTeamUserAction, initial);
  const formId = useId();

  useEffect(() => {
    if (state.success) toast.success("Invitation sent.");
  }, [state]);

  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-center" noValidate>
        <input type="hidden" name="organizationId" value={organizationId} />
        <div className="flex-1">
          <label className="text-muted-foreground mb-1.5 block text-xs font-medium uppercase tracking-wide" htmlFor={`${formId}-email`}>
            Email
          </label>
          <Input id={`${formId}-email`} name="email" type="email" required autoComplete="off" />
        </div>
        <div>
          <label className="text-muted-foreground mb-1.5 block text-xs font-medium uppercase tracking-wide" htmlFor={`${formId}-role`}>
            Role
          </label>
          <Select name="role" defaultValue="member">
            <SelectTrigger id={`${formId}-role`} className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assignableRole.options
                .filter((role) => role !== "owner")
                .map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabel(role)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Inviting…" : "Invite member"}
        </Button>
      </form>
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      {state.success ? (
        <p className="text-muted-foreground bg-muted/60 rounded-md px-3 py-2 text-xs break-all">
          {state.success.split("Share this link:")[0]}
          {"Share this link: "}
          <code className="text-foreground">
            {state.success.split("Share this link:")[1]}
          </code>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Per-member console actions: change role, suspend within this org, and the
 * emergency impersonate button (apex-dashboard-plan 4.4). Role/status changes go
 * through the org-console actions (tenant-scoped); impersonation is user-level.
 */
export function ConsoleMemberActions({
  organizationId,
  member,
}: {
  organizationId: string;
  member: { userId: string; email: string; role: string; status: string };
}) {
  const [roleState, changeRole, rolePending] = useActionState(changeRoleAction, initial);
  const [statusState, setStatus, statusPending] = useActionState(setMemberStatusAction, initial);
  const [impersonateState, impersonate, impersonatePending] = useActionState(
    impersonateUserAction,
    initial,
  );
  const [selectedRole, setSelectedRole] = useState(member.role);

  const roleFormId = useId();
  const impersonateFormId = useId();

  useEffect(() => {
    if (roleState.success) toast.success(roleState.success);
  }, [roleState]);
  useEffect(() => {
    if (statusState.success) toast.success(statusState.success);
  }, [statusState]);

  const errors = [roleState.error, statusState.error, impersonateState.error].filter(Boolean);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <form id={roleFormId} action={changeRole} className="flex items-center gap-1">
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="userId" value={member.userId} />
          <input type="hidden" name="role" value={selectedRole} />
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="h-8 w-32 text-xs" aria-label="Role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assignableRole.options.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleLabel(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline" size="sm" disabled={rolePending || selectedRole === member.role}>
            {rolePending ? "Saving…" : "Set role"}
          </Button>
        </form>

        {member.status === "active" ? (
          <form action={setStatus} className="flex items-center gap-1">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="userId" value={member.userId} />
            <input type="hidden" name="status" value="suspended" />
            <Button type="submit" variant="outline" size="sm" disabled={statusPending}>
              {statusPending ? "Suspending…" : "Suspend in org"}
            </Button>
          </form>
        ) : (
          <form action={setStatus} className="flex items-center gap-1">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="userId" value={member.userId} />
            <input type="hidden" name="status" value="active" />
            <Button type="submit" variant="outline" size="sm" disabled={statusPending}>
              {statusPending ? "Restoring…" : "Restore"}
            </Button>
          </form>
        )}

        <form id={impersonateFormId} action={impersonate}>
          <input type="hidden" name="userId" value={member.userId} />
        </form>
        <ConfirmDialog
          trigger={
            <Button type="button" variant="outline" size="sm" disabled={impersonatePending}>
              {impersonatePending ? "Starting…" : "Impersonate"}
            </Button>
          }
          title={`Impersonate ${member.email}?`}
          description="You will be signed in as this user for up to 30 minutes. A banner will show admin mode the whole time. Your reason is recorded in the audit log."
          body={
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Reason</span>
              <Input
                name="reason"
                form={impersonateFormId}
                required
                minLength={10}
                maxLength={500}
                placeholder="e.g. Ticket #482 — member reports checkout failing"
                aria-label="Reason for impersonating this account"
              />
            </label>
          }
          confirmLabel="Start impersonating"
          confirmForm={impersonateFormId}
          disabled={impersonatePending}
        />
      </div>

      {errors.map((error) => (
        <FormMessage key={error} className="text-xs">
          {error}
        </FormMessage>
      ))}
    </div>
  );
}