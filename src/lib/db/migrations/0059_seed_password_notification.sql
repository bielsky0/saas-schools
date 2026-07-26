--> HAND-WRITTEN (langlion plan Faza 29a, EPIK 44, spec v19).
-->
--> Seed notification_event_type row for client_password_changed.
--> This is a SECURITY notification — is_overridable=false, meaning the
--> recipient cannot disable it through notification preferences. Email-only
--> for now (default_channels = email), following the e-mail-first pattern
--> from Rozstrzygniecie #3/#24: the in-app channel lands when Faza 14
--> (Notification Center) closes.
-->
--> Fires only on resetClientPassword (forgot-password OTP flow, F29b),
--> NOT on the initial setClientPassword from the booking confirmation
--> screen — the client just performed the action and sees the visual
--> confirmation on the same screen.
INSERT INTO "notification_event_type" ("code", "default_channels", "is_overridable") VALUES
  ('client_password_changed', '{"email"}', false)
ON CONFLICT ("code") DO NOTHING;
