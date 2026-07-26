"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { recordAudit, resolveActor } from "@/features/admin/audit";
import { resolveClientSession } from "@/features/client-auth/session";
import { requireOrgPermission } from "@/features/organizations/context";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";
import {
  completeLeaderPhase,
  upsertQualificationCard,
  getQualificationCardById,
} from "./data";
import { createParentPhaseSchema, createLeaderPhaseSchema } from "./schema";

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/**
 * Parent action — fill the card's parent phase (Faza 26, US-41.2).
 *
 * Called from the enrollment flow AND from the standalone card-fill page.
 * The caller is a parent (client session), NOT staff — same pattern as
 * createBookingAction. Upserts so the parent can come back and update their
 * data before the camp starts (the card is a "living document").
 */
export async function completeParentPhaseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const org = await requireServedOrganization();
  const principal = await resolveClientSession(org.id);
  const t = await getTranslations("qualificationCards");

  if (!principal || !principal.isVerified) {
    return { error: t("errors.verifyFirst") };
  }

  const athleteId = str(formData.get("athleteId"));
  const groupTypeId = str(formData.get("groupTypeId"));
  if (!athleteId || !groupTypeId) {
    return { error: t("errors.missingIds") };
  }

  const parsed = createParentPhaseSchema().safeParse({
    chronicConditions: str(formData.get("chronicConditions")) || undefined,
    medications: str(formData.get("medications")) || undefined,
    allergies: str(formData.get("allergies")) || undefined,
    dietaryRestrictions: str(formData.get("dietaryRestrictions")) || undefined,
    vaccinationsInfo: str(formData.get("vaccinationsInfo")) || undefined,
    parentContactDuringCamp: str(formData.get("parentContactDuringCamp")) || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  try {
    await withTenant(org.id, async (tx) => {
      const row = await upsertQualificationCard(tx, {
        organizationId: org.id,
        athleteId,
        groupTypeId,
        ...parsed.data,
      });

      await recordAudit(tx, {
        action: "qualification_card.parent_completed",
        actor: { actorType: "Client", actorId: null, actorEmail: principal.email },
        organizationId: org.id,
        targetType: "qualification_card",
        targetId: row.id,
        targetLabel: `${athleteId}`,
        metadata: { clientId: principal.clientId, athleteId, groupTypeId },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique")) {
      return { error: t("errors.cardExists") };
    }
    throw error;
  }

  return { success: t("parentCompleted") };
}

/**
 * Staff action — complete the card's leader phase after camp (US-41.4).
 *
 * Requires qualification_card.complete_return permission. Done by staff
 * (the camp leader), not by the parent. Audited.
 */
export async function completeLeaderPhaseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("qualification_card.complete_return");
  const t = await getTranslations("qualificationCards");

  const cardId = str(formData.get("cardId"));
  if (!cardId) {
    return { error: t("errors.missingCardId") };
  }

  const parsed = createLeaderPhaseSchema().safeParse({
    healthDuringCamp: str(formData.get("healthDuringCamp")) || undefined,
    incidents: str(formData.get("incidents")) || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, async (tx) => {
      const card = await getQualificationCardById(tx, ctx.org.id, cardId);
      if (!card) {
        throw new CardNotFoundError();
      }

      await completeLeaderPhase(tx, {
        organizationId: ctx.org.id,
        id: cardId,
        ...parsed.data,
        completedByUserId: ctx.session.user.id,
      });

      await recordAudit(tx, {
        actor,
        organizationId: ctx.org.id,
        action: "qualification_card.leader_completed",
        targetType: "qualification_card",
        targetId: cardId,
        targetLabel: `${card.athleteId}`,
        metadata: { groupTypeId: card.groupTypeId },
      });
    });
  } catch (error) {
    if (error instanceof CardNotFoundError) return { error: t("errors.notFound") };
    throw error;
  }

  revalidatePath(`/dashboard/qualification-cards`);
  return { success: t("leaderCompleted") };
}

class CardNotFoundError extends Error {}
