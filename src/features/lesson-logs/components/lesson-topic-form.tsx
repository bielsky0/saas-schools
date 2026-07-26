"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";

import { Button, FormField, FormMessage, Input, toast } from "@/components/ui";
import type { FormState } from "@/lib/validation";
import { saveLessonTopicAction } from "../actions";

const initial: FormState = {};

/**
 * Lesson topic form — one topic per session, overwritable (Faza 28, §2.42).
 */
export function LessonTopicForm({
  sessionId,
  defaultTitle,
  defaultBody,
}: {
  sessionId: string;
  defaultTitle?: string;
  defaultBody?: string | null;
}) {
  const t = useTranslations("lessonLog");
  const [state, action, pending] = useActionState(saveLessonTopicAction, initial);
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [body, setBody] = useState(defaultBody ?? "");

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
    }
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="sessionId" value={sessionId} />

      <FormField label={t("topicTitle")} htmlFor="lesson-topic-title">
        <Input
          id="lesson-topic-title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("topicTitlePlaceholder")}
          required
          className="max-w-lg"
        />
      </FormField>

      <FormField label={t("topicBody")} htmlFor="lesson-topic-body">
        <textarea
          id="lesson-topic-body"
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("topicBodyPlaceholder")}
          className="border-input bg-background max-w-lg rounded-md border p-2 text-sm"
          rows={4}
        />
      </FormField>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t("saveTopic")}
        </Button>
        {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      </div>
    </form>
  );
}
