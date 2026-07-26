"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";

import { resolveActor } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import type { Locale } from "@/lib/i18n";
import type { FormState } from "@/lib/validation";
import {
  createHomeworkEntry,
  ForeignSessionError,
  markHomeworkCompletion,
  saveLessonTopic,
  SessionNotFoundError,
} from "./manage";
import {
  createHomeworkSchema,
  homeworkCompletionSchema,
  lessonTopicSchema,
  updateHomeworkSchema,
} from "./schema";
import { updateHomework } from "./data";

/**
 * Lesson log server actions (Faza 28, §2.42, EPIK 43).
 *
 * Same conventions as `features/grades/actions.ts`: `requireOrgPermission`
 * first, `resolveActor` before the transaction opens, audit + email in the
 * same `tx` as the write.
 */

export async function saveLessonTopicAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("lesson_log.manage");
  const [t, locale] = await Promise.all([
    getTranslations("lessonLog"),
    getLocale(),
  ]);

  const parsed = lessonTopicSchema.safeParse({
    sessionId: str(formData.get("sessionId")),
    title: str(formData.get("title")),
    body: str(formData.get("body")) || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, (tx) =>
      saveLessonTopic(tx, {
        organizationId: ctx.org.id,
        organizationName: ctx.org.name,
        sessionId: parsed.data.sessionId,
        title: parsed.data.title,
        body: parsed.data.body,
        createdByUserId: ctx.session.user.id,
        callerRole: ctx.role,
        actor,
        locale: locale as Locale,
      }),
    );
  } catch (error) {
    if (error instanceof SessionNotFoundError) return { error: t("errors.sessionNotFound") };
    if (error instanceof ForeignSessionError) return { error: t("errors.foreignSession") };
    throw error;
  }

  revalidatePath(`/dashboard/sessions/${parsed.data.sessionId}`);
  return { success: t("topicSaved") };
}

export async function createHomeworkAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("lesson_log.manage");
  const [t, locale] = await Promise.all([
    getTranslations("lessonLog"),
    getLocale(),
  ]);

  const parsed = createHomeworkSchema.safeParse({
    sessionId: str(formData.get("sessionId")),
    description: str(formData.get("description")),
    dueDate: str(formData.get("dueDate")) || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, (tx) =>
      createHomeworkEntry(tx, {
        organizationId: ctx.org.id,
        organizationName: ctx.org.name,
        sessionId: parsed.data.sessionId,
        description: parsed.data.description,
        dueDate: parsed.data.dueDate,
        createdByUserId: ctx.session.user.id,
        callerRole: ctx.role,
        actor,
        locale: locale as Locale,
      }),
    );
  } catch (error) {
    if (error instanceof SessionNotFoundError) return { error: t("errors.sessionNotFound") };
    if (error instanceof ForeignSessionError) return { error: t("errors.foreignSession") };
    throw error;
  }

  revalidatePath(`/dashboard/sessions/${parsed.data.sessionId}`);
  return { success: t("homeworkCreated") };
}

export async function updateHomeworkAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("lesson_log.manage");
  const [t] = await Promise.all([getTranslations("lessonLog")]);

  const parsed = updateHomeworkSchema.safeParse({
    homeworkId: str(formData.get("homeworkId")),
    description: str(formData.get("description")),
    dueDate: str(formData.get("dueDate")) || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const sessionId = str(formData.get("sessionId"));

  // updateHomework does not enforce ownership (no session check needed for editing by id)
  await withTenant(ctx.org.id, (tx) =>
    updateHomework(tx, {
      id: parsed.data.homeworkId,
      organizationId: ctx.org.id,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate,
    }),
  );

  revalidatePath(`/dashboard/sessions/${sessionId}`);
  return { success: t("homeworkUpdated") };
}

export async function markHomeworkCompletionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("lesson_log.manage");
  const [t] = await Promise.all([getTranslations("lessonLog")]);

  const parsed = homeworkCompletionSchema.safeParse({
    homeworkId: str(formData.get("homeworkId")),
    athleteId: str(formData.get("athleteId")),
    status: str(formData.get("status")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, (tx) =>
      markHomeworkCompletion(tx, {
        organizationId: ctx.org.id,
        homeworkId: parsed.data.homeworkId,
        athleteId: parsed.data.athleteId,
        status: parsed.data.status,
        markedByUserId: ctx.session.user.id,
        callerRole: ctx.role,
        actor,
      }),
    );
  } catch (error) {
    if (error instanceof ForeignSessionError) return { error: t("errors.foreignSession") };
    throw error;
  }

  const sessionId = str(formData.get("sessionId"));
  revalidatePath(`/dashboard/sessions/${sessionId}`);
  return { success: t("completionUpdated") };
}

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
