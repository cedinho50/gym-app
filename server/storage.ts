import { db } from "./db";
import { exercises, type InsertExercise, type UpdateExerciseRequest, type Exercise } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getExercises(): Promise<Exercise[]>;
  getExercise(id: number): Promise<Exercise | undefined>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  updateExercise(id: number, updates: UpdateExerciseRequest): Promise<Exercise | undefined>;
  deleteExercise(id: number): Promise<void>;
  resetCompleted(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getExercises(): Promise<Exercise[]> {
    return await db.select().from(exercises);
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise;
  }

  async createExercise(insertExercise: InsertExercise): Promise<Exercise> {
    const [exercise] = await db.insert(exercises).values(insertExercise).returning();
    return exercise;
  }

  async updateExercise(id: number, updates: UpdateExerciseRequest): Promise<Exercise | undefined> {
    const [updated] = await db.update(exercises)
      .set(updates)
      .where(eq(exercises.id, id))
      .returning();
    return updated;
  }

  async deleteExercise(id: number): Promise<void> {
    await db.delete(exercises).where(eq(exercises.id, id));
  }

  async resetCompleted(): Promise<void> {
    await db.update(exercises).set({ isCompleted: false });
  }
}

export const storage = new DatabaseStorage();
