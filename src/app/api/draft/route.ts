import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

import { env } from "@/lib/env/server";
import { requireOrgPermission } from "@/features/organizations/context";
import { buildTenantOriginUrl } from "@/features/cms/preview-url";

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
 *
 * The redirect URL is built from the Host header (not `request.url`) to
 * preserve the tenant subdomain — `request.url` may be normalised to the
 * server's listening address and lose it.
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

  const host = request.headers.get("host") || "";
  const redirectTo = buildTenantOriginUrl(host, `/${slug}`);
  if (!redirectTo) {
    return NextResponse.json({ error: "Not a tenant request" }, { status: 400 });
  }
  return NextResponse.redirect(redirectTo);
}
