"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";

import { createExtraFeeAction } from "../actions";
import type { FormState } from "@/lib/validation";

export function ExtraFeeForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const t = useTranslations("extraFees");
  const [state, formAction, pending] = useActionState(
    createExtraFeeAction,
    {} as FormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state.success, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t("create")}</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="clientId" className="text-sm font-medium">
          Client ID
        </label>
        <input
          id="clientId"
          name="clientId"
          type="text"
          required
          className="rounded border px-3 py-2 text-sm"
          placeholder="UUID klienta"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          {t("description")}
        </label>
        <input
          id="description"
          name="description"
          type="text"
          required
          maxLength={500}
          className="rounded border px-3 py-2 text-sm"
          placeholder="Str\u00f3j treningowy, Wpisowe..."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="amount" className="text-sm font-medium">
          {t("amount")} (grosze)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          required
          min={1}
          step={1}
          className="rounded border px-3 py-2 text-sm"
          placeholder="10000 = 100.00 PLN"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="paymentMethod" className="text-sm font-medium">
          {t("paymentMethod")}
        </label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          required
          className="rounded border px-3 py-2 text-sm"
          defaultValue="cash"
        >
          <option value="cash">{t("paymentMethodCash")}</option>
          <option value="online">{t("paymentMethodOnline")}</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="athleteId" className="text-sm font-medium">
          Athlete ID (optional)
        </label>
        <input
          id="athleteId"
          name="athleteId"
          type="text"
          className="rounded border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sessionId" className="text-sm font-medium">
          Session ID (optional)
        </label>
        <input
          id="sessionId"
          name="sessionId"
          type="text"
          className="rounded border px-3 py-2 text-sm"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-600">{state.success}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "..." : t("create")}
      </button>
    </form>
  );
}
