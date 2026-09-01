import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { duplicateGroupTypeAction } from "@/features/groups/actions";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ groupTypeId: string }> }
) {
  const { groupTypeId } = await params;
  const { org } = await requireOrgPermission("group_types.manage");
  const t = await getTranslations("groups");

  const formData = new FormData();
  formData.append("groupTypeId", groupTypeId);

  const result = await duplicateGroupTypeAction({} as any, formData);

  if (result.redirect) {
    revalidatePath(`/dashboard/group-types`);
    return Response.redirect(new URL(result.redirect, _request.url), 303);
  }

  revalidatePath(`/dashboard/group-types`);
  if (result.success) {
    return new Response(JSON.stringify({ success: result.success }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: result.error }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}