-- The old table stored every athlete in one id=1 JSON document. Athlete
-- state now lives in athlete_portal_state, keyed by Clerk user ID.
DROP TABLE IF EXISTS "training_portal_state";