import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

import { env } from "@/lib/env/server";
import { requireOrgPermission } from "@/features/organizations/context";

/**
 * Enable Next.js Draft Mode for CMS Live Preview (Faza 30e).
 *
 * Called from Payload Admin via the `admin.preview` URL. Validates the draft
 * secret and the caller's `cms.manage` permission before issuing the signed
 * httpOnly draft-mode cookie — after that the renderer in [...cmsSlug]/page.tsx
 * can render unpublished pages.
 *
 * RBAC is checked HERE at cookie-issuance time, NOT in the renderer. See
 * [...cmsSlug]/page.tsx for the rationale.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug") || "";

  if (secret !== env.PAYLOAD_DRAFT_SECRET) {
    return NextResponse.json({ error: "Invalid draft secret" }, { status: 401 });
  }

  // Verifies staff session + cms.manage permission for the org addressed by Host.
  // Throws 401/403 via requireSession/forbidden if unauthorized.
  await requireOrgPermission("cms.manage");

  const draft = await draftMode();
  draft.enable();

  const redirectUrl = new URL(`/${slug}`, request.url);
  return NextResponse.redirect(redirectUrl);
}
