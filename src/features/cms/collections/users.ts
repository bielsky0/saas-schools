import type { CollectionConfig } from "payload";

import { betterAuthPayloadStrategy } from "../payload-auth-strategy";

/**
 * Formal auth collection — no real users ever live here.
 *
 * Better Auth (via payload-auth-strategy) is the real identity layer; this
 * collection exists solely because Payload validates at startup that the
 * slug referenced in `admin.user` is registered in `collections`.
 *
 * Named `payload_admin_users` in SQL to avoid confusion with Better Auth's
 * `"user"` table — same defensive pattern as `class_session` (§1.3).
 * NOT routed through afterSchemaInit (no tenant columns): it is not domain
 * data.
 */
export const usersCollection: CollectionConfig = {
  slug: "users",
  dbName: "payload_admin_users",
  auth: {
    disableLocalStrategy: true,
    strategies: [betterAuthPayloadStrategy],
  },
  admin: {
    useAsTitle: "email",
    hidden: true,
  },
  fields: [
    {
      name: "email",
      type: "email",
      required: true,
      unique: true,
    },
  ],
};
