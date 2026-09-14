CREATE TABLE IF NOT EXISTS "athlete_portal_state" (
  "clerk_user_id" text PRIMARY KEY NOT NULL,
  "profile" jsonb NOT NULL,
  "plan" jsonb NOT NULL,
  "trainer_clients" jsonb NOT NULL,
  "history" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);