"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { resolveClientSession } from "@/features/client-auth/session";
import { requireServedOrganization } from "@/features/organizations/served-org";
import type { FormState } from "@/lib/validation";
import { CLIENT_PREFERENCE_EVENT_TYPES } from "./client-preference-types";
import { setClientPreference } from "./data";

/**
 * Save a parent's notification preferences (Faza 6, EPIK 44). One form, one Save
 * button: for each event type an absent checkbox reads as "off" — the opt-out.
 *
 * Auth is the CLIENT session, not the staff one: `resolveClientSession` scopes
 * the write to `(organizationId, clientId)`, so a parent can only touch their
 * own preferences in the academy they are actually served by. The rows live in
 * `notification_preference` keyed by `(recipient_type, recipient_id, event_type)`
 * — see `setClientPreference` for the upsert shape.
 *
 * Deliberately has NO zod schema, for the same structural reason as the staff
 * action: the loop iterates `CLIENT_PREFERENCE_EVENT_TYPES` — a server-side
 * constant — and asks the FormData about each one, so an attacker-supplied field
 * name is never looked up and a supplied value only ever compares against "on".
 */
export async function updateClientNotificationPreferencesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const org = await requireServedOrganization();
  const [t, tv] = await Promise.all([
    getTranslations("notifications"),
    getTranslations("enrollment"),
  ]);

  const principal = await resolveClientSession(org.id);
  if (!principal || !principal.isVerified) {
    return { error: tv("errors.verifyFirst") };
  }

  for (const eventType of CLIENT_PREFERENCE_EVENT_TYPES) {
    const enabled = formData.get(`notify:${eventType}`) === "on";
    await setClientPreference(org.id, principal.clientId, eventType, enabled, enabled);
  }

  revalidatePath("/moje-zajecia/ustawienia/powiadomienia");
  return { success: t("preferences.saved") };
}
