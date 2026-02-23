import { pgTable, text, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("General"), // e.g. "Arme", "Beine"
  weight: text("weight").notNull().default(""), // e.g. "8 kg"
  isCompleted: boolean("is_completed").notNull().default(false),
  increaseNextTime: boolean("increase_next_time").notNull().default(false),
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({ 
  id: true 
});

export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type UpdateExerciseRequest = Partial<InsertExercise>;

// Response types
export type ExerciseResponse = Exercise;
export type ExercisesListResponse = Exercise[];
