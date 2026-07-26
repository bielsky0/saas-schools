"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";

import { Alert, AlertDescription } from "@/components/ui";
import { Button, FormMessage, Input, toast } from "@/components/ui";
import type { FormState } from "@/lib/validation";
import { importCsvAction } from "@/features/import/actions";

const initial: FormState = {};

export function ImportForm() {
  const [state, action, pending] = useActionState(importCsvAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const t = useTranslations("import");

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="file">
          {t("fileLabel")}
        </label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          disabled={pending}
        />
        <p className="text-muted-foreground text-xs">{t("fileHint")}</p>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? t("importing") : t("import")}
        </Button>
        {!state.success && state.error ? (
          <FormMessage className="text-xs">{state.error}</FormMessage>
        ) : null}
      </div>

      {state.fieldErrors?.report && state.fieldErrors.report.length > 0 ? (
        <Alert variant="warning">
          <AlertDescription>
            <ul className="list-inside list-disc text-sm">
              {state.fieldErrors.report.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
