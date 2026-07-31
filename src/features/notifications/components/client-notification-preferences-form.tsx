"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormMessage,
  Switch,
  toast,
} from "@/components/ui";
import type { FormState } from "@/lib/validation";
import { updateClientNotificationPreferencesAction } from "../client-preferences-actions";
import { CLIENT_NOTIFICATION_CATEGORIES } from "../client-preference-types";

const initial: FormState = {};

/**
 * Client notification preferences (Faza 6, EPIK 44). One Switch per event type,
 * grouped into the four thematic categories from the phase-06 spec. Absence of a
 * switch in the submit is the opt-out — the server reads it as "off". Mirrors
 * the staff `NotificationPreferencesForm`, but rows come from
 * `CLIENT_NOTIFICATION_CATEGORIES` (the client catalog) instead of the full
 * staff `NOTIFICATION_TYPES` list.
 */
export function ClientNotificationPreferencesForm({
  disabledByType,
}: {
  /** Event types the parent has turned OFF, from the stored preferences. */
  disabledByType: Record<string, boolean>;
}) {
  const t = useTranslations("notifications");
  const [state, action, pending] = useActionState(updateClientNotificationPreferencesAction, initial);

  useEffect(() => {
    if (state.success) toast.success(t("clientPreferences.saved"));
  }, [state, t]);

  return (
    <form action={action} className="space-y-6" noValidate>
      {CLIENT_NOTIFICATION_CATEGORIES.map((category) => (
        <Card key={category.key}>
          <CardHeader>
            <CardTitle className="text-base">
              {t(`clientPreferences.categories.${category.key}` as Parameters<typeof t>[0])}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {category.eventTypes.map((eventType) => (
                <PreferenceRow
                  key={eventType}
                  categoryKey={category.key}
                  eventType={eventType}
                  label={t(
                    `clientPreferences.types.${eventType}` as Parameters<typeof t>[0],
                  )}
                  defaultChecked={!disabledByType[eventType]}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {state.error ? <FormMessage>{t("clientPreferences.error")}</FormMessage> : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t("clientPreferences.saving") : t("clientPreferences.save")}
        </Button>
      </div>
    </form>
  );
}

function PreferenceRow({
  categoryKey,
  eventType,
  label,
  defaultChecked,
}: {
  categoryKey: string;
  eventType: string;
  label: string;
  defaultChecked: boolean;
}) {
  // The `name` is the shared `notify:{eventType}` the server action reads; the
  // `id` is scoped by category because `booking-confirmed` legitimately appears
  // in two sections (see client-preference-types.ts) and ids must be unique.
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={`notify-${categoryKey}-${eventType}`} className="text-sm">
        {label}
      </label>
      <Switch
        id={`notify-${categoryKey}-${eventType}`}
        name={`notify:${eventType}`}
        defaultChecked={defaultChecked}
      />
    </li>
  );
}
