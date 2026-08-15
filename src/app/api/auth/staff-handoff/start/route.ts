import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { getServerSession } from "@/lib/auth";
import { withTenant } from "@/lib/db/tenant";
import { orgsEnabled } from "@/lib/tenancy";
import { tenantUrl } from "@/lib/tenant-url";
import {
  HANDOFF_TTL_MS,
  hashHandoffToken,
  listUserOrgs,
} from "@/features/organizations/cross-tenant";
import { insertHandoff } from "@/features/organizations/data";

/**
 * Staff session handoff — click-time mint (plan Faza 5.5, decyzja D74).
 *
 * The academy directory's links all point HERE, on the apex, instead of straight
 * at the tenant host. Each academy is its own authentication (D70, §2.19
 * exception #5): the apex has the staff session cookie and the tenant host does
 * not, so the bridge has to be minted where the session is and redeemed where it
 * is not.
 *
 * THIS ENDPOINT ONLY MINTS. It reads the apex session, checks the caller is an
 * active member of the requested academy, writes one short-lived single-use row,
 * and hands the browser to that academy's verify endpoint
 * (`/api/auth/staff-handoff/verify`), which is unchanged and remains the ONLY
 * place a token is consumed. Minting on click rather than during the directory
 * render keeps the page pure (no render-time side effects) and bounds the table
 * to roughly one live token per actual click — a prefetched or abandoned link
 * leaves at most one row that expires in `HANDOFF_TTL_MS`.
 *
 * It lives under `/api/auth/*` because that is the one path the proxy forwards
 * without a session (`isPublicApiPath` in `src/proxy.ts`) — a link to it must
 * work before the tenant host has ever seen a cookie. Its own session gate is
 * this route, not the proxy.
 *
 * Next.js resolves this static route ahead of the `/api/auth/[...all]` catch-all
 * that serves Better Auth, so `/api/auth/staff-handoff/verify` still falls
 * through to the engine while `/start` is handled here.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const subdomain = request.nextUrl.searchParams.get("subdomain");

  const session = await getServerSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Same guard the apex directory applies (§1.4): a deployment without
  // organizations should not mint handoff tokens at all.
  if (!orgsEnabled) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!subdomain) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // The directory only lists academies the caller belongs to; a link naming any
  // other subdomain is stale, tampered, or mistyped. Rather than mint a token
  // the verify endpoint would refuse, answer with the directory — the caller is
  // authenticated on the apex, so `/login` would be the wrong landing.
  const orgs = await listUserOrgs(session.user.id);
  const org = orgs.find((o) => o.subdomain === subdomain);
  if (!org) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const rawToken = `${randomUUID()}${randomUUID()}`.replace(/-/g, "");
  await withTenant(org.id, async (tx) => {
    await insertHandoff(tx, {
      organizationId: org.id,
      userId: session.user.id,
      tokenHash: hashHandoffToken(rawToken),
      expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
    });
  });

  const verifyUrl = `${await tenantUrl(org.subdomain, "/api/auth/staff-handoff/verify")}?token=${rawToken}`;
  return NextResponse.redirect(new URL(verifyUrl), 302);
}
