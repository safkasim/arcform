import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trainingPortalStateTable = pgTable("athlete_portal_state", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  profile: jsonb("profile").notNull(),
  plan: jsonb("plan").notNull(),
  trainerClients: jsonb("trainer_clients").notNull(),
  history: jsonb("history").notNull(),
  nutrition: jsonb("nutrition").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTrainingPortalStateSchema = createInsertSchema(trainingPortalStateTable);
export type InsertTrainingPortalState = z.infer<typeof insertTrainingPortalStateSchema>;
export type TrainingPortalState = typeof trainingPortalStateTable.$inferSelect;