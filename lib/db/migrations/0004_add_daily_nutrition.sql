ALTER TABLE "athlete_portal_state"
  ADD COLUMN IF NOT EXISTS "nutrition" jsonb NOT NULL DEFAULT '{}'::jsonb;