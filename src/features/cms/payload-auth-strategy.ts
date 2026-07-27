import type { AuthStrategy } from "payload";

import { auth } from "@/lib/adapters/auth/better-auth";
import { ORG_SUBDOMAIN_HEADER } from "@/lib/tenant-host";
import { withTenant } from "@/lib/db/tenant";
import { getOrgBySubdomain, getMembership } from "@/features/organizations/data";

export const betterAuthPayloadStrategy: AuthStrategy = {
  name: "better-auth",
  authenticate: async (args) => {
    const { headers } = args;
    const req = (args as Record<string, unknown>).req as Record<string, unknown> | undefined;
    const session = await auth.api.getSession({ headers });
    if (!session) return { user: null };

    let organizationId: string | undefined;

    // Resolve organization context from the subdomain header, which is set
    // by src/proxy.ts from the Host header (unconditional delete first, so
    // the value is trustworthy — see D56 in proxy.ts). This is the same
    // mechanism the rest of the app uses (langlion §2.27).
    const subdomain = headers.get(ORG_SUBDOMAIN_HEADER);
    if (subdomain) {
      const org = await getOrgBySubdomain(subdomain);
      if (org) {
        // Verify the authenticated user is an active member of this org.
        // Without this check, a user with a valid session (cookie scoped
        // to the root domain) could access any org's CMS by knowing its
        // subdomain — privilege escalation via subdomain guessing.
        // Pattern matches requireOrgAccess() in context.ts.
        const membership = await withTenant(org.id, async (tx) =>
          getMembership(tx, org.id, session.user.id),
        );
        if (!membership || membership.status !== "active") return { user: null };
        organizationId = org.id;
      }
    }

    // Make organizationId available to access control functions via req.
    // Payload merges the returned user into req.user, but access.read/update
    // check req.organizationId directly (see collection configs).
    if (req) req.organizationId = organizationId;

    // — upsert payload_admin_users record —
    // Payload internal mechanisms (preferences, document locks,
    // /users/me) require a real DB row in the auth collection, not
    // just a user object returned by the strategy. We upsert by email
    // (unique per users collection config) so that a record is created
    // on first login of a given person and re-used on subsequent visits.
    // The returned id is the payload_admin_users PK, not the Better Auth
    // user.id — that is the ID that Payload uses internally as a FK in
    // payload_preferences, payload_locked_documents, etc.
    const userRecord = await args.payload.db.upsert({
      collection: "users",
      where: { email: { equals: session.user.email } },
      data: { email: session.user.email },
    });

    return {
      user: {
        id: userRecord.id,
        email: session.user.email,
        collection: "users",
        organizationId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    };
  },
};
