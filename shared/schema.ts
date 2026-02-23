import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const workoutSplits = pgTable("workout_splits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Arme/Brust"
  order: integer("order").notNull().default(0),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  splitId: integer("split_id").references(() => workoutSplits.id),
  weight: text("weight").notNull().default(""),
  isCompleted: boolean("is_completed").notNull().default(false),
  increaseNextTime: boolean("increase_next_time").notNull().default(false),
});

export const workoutHistory = pgTable("workout_history", {
  id: serial("id").primaryKey(),
  splitId: integer("split_id").references(() => workoutSplits.id).notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
  workoutData: text("workout_data").notNull(), // JSON string of exercises and their weights at the time
});

export const insertWorkoutSplitSchema = createInsertSchema(workoutSplits).omit({ id: true });
export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true });
export const insertWorkoutHistorySchema = createInsertSchema(workoutHistory).omit({ id: true, completedAt: true });

export type WorkoutSplit = typeof workoutSplits.$inferSelect;
export type InsertWorkoutSplit = z.infer<typeof insertWorkoutSplitSchema>;
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type WorkoutHistory = typeof workoutHistory.$inferSelect;
export type InsertWorkoutHistory = z.infer<typeof insertWorkoutHistorySchema>;
