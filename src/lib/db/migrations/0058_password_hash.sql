--> HAND-WRITTEN (langlion plan Faza 29a, spec v19, EPIK 44).
-->
--> Adds password_hash, password_set_at, password_updated_at columns to the
--> client table — all nullable. NULL means the client has not set a password
--> and logs in exclusively through OTP (§2.43). The columns are additive:
--> no existing constraint or unique index is touched.
-->
--> password_hash stores the scrypt hash (from @better-auth/utils/password,
--> format "salt:key" hex-encoded). password_set_at records the first time a
--> password was set; password_updated_at tracks the last change (including
--> resets). When NULL, all three are NULL — a client either has a password
--> or does not; partial states are meaningless.
-->
--> password_hash has NO unique constraint. Unlike staff user.email (which is
--> globally unique and drives login), client.email is scoped per organization,
--> and password_hash is a secondary credential — it is a hash, not an
--> identifier, so a collision across different plaintexts is not a security
--> concern.
ALTER TABLE "client"
  ADD COLUMN "password_hash" text,
  ADD COLUMN "password_set_at" timestamp,
  ADD COLUMN "password_updated_at" timestamp;
