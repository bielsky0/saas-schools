"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";

import { FormMessage, toast } from "@/components/ui";
import type { FormState } from "@/lib/validation";
import { markHomeworkCompletionAction } from "../actions";

const initial: FormState = {};

/**
 * Toggle button for marking homework completion per athlete
 * (Faza 28, §2.42). Toggles between "done" and "not_done".
 */
export function HomeworkCompletionToggle({
  homeworkId,
  athleteId,
  sessionId,
  current,
}: {
  homeworkId: string;
  athleteId: string;
  sessionId: string;
  current: "done" | "not_done";
}) {
  const t = useTranslations("lessonLog");
  const [state, action, pending] = useActionState(markHomeworkCompletionAction, initial);

  useEffect(() => {
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={action} className="inline-flex items-center gap-1">
      <input type="hidden" name="homeworkId" value={homeworkId} />
      <input type="hidden" name="athleteId" value={athleteId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input
        type="hidden"
        name="status"
        value={current === "done" ? "not_done" : "done"}
      />
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors ${
          current === "done"
            ? "border-green-300 bg-green-50 text-green-700"
            : "border-gray-200 bg-white text-gray-500 hover:border-green-200"
        }`}
      >
        <span className={current === "done" ? "text-green-600" : "text-gray-400"}>
          {current === "done" ? "✓" : "○"}
        </span>
        {current === "done" ? t("done") : t("notDone")}
      </button>
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
    </form>
  );
}
