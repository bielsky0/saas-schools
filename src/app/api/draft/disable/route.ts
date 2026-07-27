import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

import { requireOrgPermission } from "@/features/organizations/context";

/**
 * Disable Next.js Draft Mode (Faza 30e).
 *
 * Guarded by the same `cms.manage` check as the enable endpoint — not because
 * disabling leaks data (it does not), but to prevent UX confusion where an
 * unrelated request unexpectedly exits an admin's Live Preview session.
 */
export async function GET(request: Request): Promise<NextResponse> {
  // Prevent anonymous/cross-user disabling of draft mode
  await requireOrgPermission("cms.manage");

  const draft = await draftMode();
  draft.disable();

  const redirectUrl = new URL("/", request.url);
  return NextResponse.redirect(redirectUrl);
}
