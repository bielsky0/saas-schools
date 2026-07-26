"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";

import { Button, FormField, FormMessage, Input, toast } from "@/components/ui";
import type { FormState } from "@/lib/validation";
import { createHomeworkAction } from "../actions";

const initial: FormState = {};

/**
 * Homework creation form — creates a new homework entry for the session
 * (Faza 28, §2.42). Multiple entries per session are allowed.
 */
export function HomeworkForm({
  sessionId,
}: {
  sessionId: string;
}) {
  const t = useTranslations("lessonLog");
  const [state, action, pending] = useActionState(createHomeworkAction, initial);
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
    }
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="sessionId" value={sessionId} />

      <FormField label={t("homeworkDescription")} htmlFor="homework-description">
        <textarea
          id="homework-description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("homeworkDescriptionPlaceholder")}
          required
          className="border-input bg-background max-w-lg rounded-md border p-2 text-sm"
          rows={3}
        />
      </FormField>

      <FormField label={t("homeworkDueDate")} htmlFor="homework-due-date">
        <Input
          id="homework-due-date"
          name="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="max-w-[200px]"
        />
      </FormField>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t("createHomework")}
        </Button>
        {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      </div>
    </form>
  );
}
