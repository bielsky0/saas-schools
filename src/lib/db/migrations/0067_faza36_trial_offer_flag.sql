-- Faza 36: Trial offer flag for conversion tracking
-- Additive: one nullable boolean column on group_type, purely descriptive.
-- Does NOT affect any booking/capacity/pricing logic.

ALTER TABLE group_type
  ADD COLUMN is_trial_offer boolean NOT NULL DEFAULT false;
