"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import {
  Alert,
  AlertDescription,
  Button,
  FormField,
  Input,
} from "@/components/ui";
import { createInterestSignupAction } from "../actions";
import type { CreateInterestSignupState } from "../actions";

const initial: CreateInterestSignupState = {};

export function InterestSignupForm({
  groupTypeSlug,
  athletes,
}: {
  groupTypeSlug: string;
  athletes: { id: string; name: string }[];
}) {
  const t = useTranslations("enrollment");
  const hasExisting = athletes.length > 0;
  const [state, formAction, pending] = useActionState(
    createInterestSignupAction,
    initial,
  );
  const [participantKind, setParticipantKind] = useState<"existing" | "new">(
    hasExisting ? "existing" : "new",
  );

  if (state.success) {
    return (
      <Alert className="mt-6">
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <Alert>
        <AlertDescription>{t("interest.notice")}</AlertDescription>
      </Alert>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="groupTypeSlug" value={groupTypeSlug} />

        <fieldset className="space-y-2">
          <legend className="font-medium">{t("participant.heading")}</legend>
          {hasExisting ? (
            <>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="existing"
                  checked={participantKind === "existing"}
                  onChange={() => setParticipantKind("existing")}
                  className="accent-primary"
                />
                {t("participant.existing")}
              </label>
              {participantKind === "existing" ? (
                <select
                  name="athleteId"
                  defaultValue={athletes[0]?.id}
                  className="border-input w-full rounded border px-3 py-2"
                >
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="new"
                  checked={participantKind === "new"}
                  onChange={() => setParticipantKind("new")}
                  className="accent-primary"
                />
                {t("participant.addNew")}
              </label>
            </>
          ) : null}
          {participantKind === "new" || !hasExisting ? (
            <div className="space-y-2">
              <FormField label={t("participant.name")} htmlFor="ll-is-participant">
                <Input id="ll-is-participant" name="participantName" required />
              </FormField>
              <FormField label={t("participant.age")} htmlFor="ll-is-age">
                <Input id="ll-is-age" name="participantAge" inputMode="numeric" />
              </FormField>
            </div>
          ) : null}
        </fieldset>

        {state.error ? (
          <p className="text-destructive text-sm">{state.error}</p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? t("interest.submitting") : t("interest.submit")}
        </Button>
      </form>
    </div>
  );
}
