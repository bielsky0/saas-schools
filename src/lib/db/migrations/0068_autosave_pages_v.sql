-- Faza 38: Autosave column for _pages_v versions table.
-- Payload CMS requires `autosave` boolean when versions.drafts.autosave is enabled.
-- No separate autosave timestamp — Payload reuses created_at / updated_at.

ALTER TABLE "_pages_v"
  ADD COLUMN "autosave" boolean;

CREATE INDEX "_pages_v_autosave_idx" ON "_pages_v" ("autosave");
