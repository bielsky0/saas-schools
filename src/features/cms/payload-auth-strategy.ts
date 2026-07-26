import type { AuthStrategy } from "payload";

import { auth } from "@/lib/adapters/auth/better-auth";
import { ORG_SUBDOMAIN_HEADER } from "@/lib/tenant-host";
import { withTenant } from "@/lib/db/tenant";
import { getOrgBySubdomain, getMembership } from "@/features/organizations/data";

type AuthenticateArgs = { headers: Headers; req?: Record<string, unknown> };

export const betterAuthPayloadStrategy: AuthStrategy = {
  name: "better-auth",
  authenticate: async (args) => {
    const { headers } = args;
    const req = (args as AuthenticateArgs).req ?? {};
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
    (req as Record<string, unknown>).organizationId = organizationId;

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        collection: "users",
        organizationId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    };
  },
};
