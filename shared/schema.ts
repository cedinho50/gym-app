import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const workoutSplits = pgTable("workout_splits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  splitId: integer("split_id").references(() => workoutSplits.id),
  weight: text("weight").notNull().default(""),
  category: text("category"),
  isCompleted: boolean("is_completed").notNull().default(false),
  increaseNextTime: boolean("increase_next_time").notNull().default(false),
  sets: text("sets").notNull().default("[]"),
  order: integer("order").notNull().default(0),
});

export const workoutHistory = pgTable("workout_history", {
  id: serial("id").primaryKey(),
  splitId: integer("split_id").references(() => workoutSplits.id).notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
  workoutData: text("workout_data").notNull(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWorkoutSplitSchema = createInsertSchema(workoutSplits).omit({ id: true });
export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true });
export const insertWorkoutHistorySchema = createInsertSchema(workoutHistory).omit({ id: true, completedAt: true });
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });

export type WorkoutSplit = typeof workoutSplits.$inferSelect;
export type InsertWorkoutSplit = z.infer<typeof insertWorkoutSplitSchema>;
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type WorkoutHistory = typeof workoutHistory.$inferSelect;
export type InsertWorkoutHistory = z.infer<typeof insertWorkoutHistorySchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

export { TARGET_SETS, TARGET_REPS } from "./constants";