CREATE TABLE IF NOT EXISTS "app_users" (
  "clerk_user_id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL CHECK ("role" IN ('athlete', 'trainer')),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);