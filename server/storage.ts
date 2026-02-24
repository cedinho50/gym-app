import { db } from "./db";
import {
  exercises, workoutSplits, workoutHistory,
  type InsertExercise, type InsertWorkoutSplit, type InsertWorkoutHistory,
  type Exercise, type WorkoutSplit, type WorkoutHistory
} from "@shared/schema";
import { eq, asc } from "drizzle-orm";

export interface IStorage {
  getSplits(): Promise<WorkoutSplit[]>;
  createSplit(split: InsertWorkoutSplit): Promise<WorkoutSplit>;
  updateSplit(id: number, updates: Partial<InsertWorkoutSplit>): Promise<WorkoutSplit | undefined>;
  deleteSplit(id: number): Promise<void>;

  getExercises(splitId?: number): Promise<Exercise[]>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  updateExercise(id: number, updates: Partial<InsertExercise>): Promise<Exercise | undefined>;
  deleteExercise(id: number): Promise<void>;
  reorderExercises(splitId: number, orderedIds: number[]): Promise<void>;

  getHistory(): Promise<WorkoutHistory[]>;
  createHistory(history: InsertWorkoutHistory): Promise<WorkoutHistory>;

  finishWorkout(splitId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getSplits(): Promise<WorkoutSplit[]> {
    return await db.select().from(workoutSplits).orderBy(asc(workoutSplits.order));
  }
  async createSplit(split: InsertWorkoutSplit): Promise<WorkoutSplit> {
    const [res] = await db.insert(workoutSplits).values(split).returning();
    return res;
  }
  async updateSplit(id: number, updates: Partial<InsertWorkoutSplit>): Promise<WorkoutSplit | undefined> {
    const [res] = await db.update(workoutSplits).set(updates).where(eq(workoutSplits.id, id)).returning();
    return res;
  }
  async deleteSplit(id: number): Promise<void> {
    await db.delete(exercises).where(eq(exercises.splitId, id));
    await db.delete(workoutSplits).where(eq(workoutSplits.id, id));
  }

  async getExercises(splitId?: number): Promise<Exercise[]> {
    if (splitId) {
      return await db.select().from(exercises)
        .where(eq(exercises.splitId, splitId))
        .orderBy(asc(exercises.order));
    }
    return await db.select().from(exercises).orderBy(asc(exercises.order));
  }
  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    // Assign next order value for the split
    const existing = exercise.splitId ? await this.getExercises(exercise.splitId) : [];
    const nextOrder = existing.length;
    const [res] = await db.insert(exercises).values({ ...exercise, order: nextOrder }).returning();
    return res;
  }
  async updateExercise(id: number, updates: Partial<InsertExercise>): Promise<Exercise | undefined> {
    const [res] = await db.update(exercises).set(updates).where(eq(exercises.id, id)).returning();
    return res;
  }
  async deleteExercise(id: number): Promise<void> {
    await db.delete(exercises).where(eq(exercises.id, id));
  }
  async reorderExercises(splitId: number, orderedIds: number[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(exercises)
        .set({ order: i })
        .where(eq(exercises.id, orderedIds[i]));
    }
  }

  async getHistory(): Promise<WorkoutHistory[]> {
    return await db.select().from(workoutHistory).orderBy(workoutHistory.completedAt);
  }
  async createHistory(history: InsertWorkoutHistory): Promise<WorkoutHistory> {
    const [res] = await db.insert(workoutHistory).values(history).returning();
    return res;
  }

  async finishWorkout(splitId: number): Promise<void> {
    const workoutExercises = await this.getExercises(splitId);
    await this.createHistory({ splitId, workoutData: JSON.stringify(workoutExercises) });
    for (const ex of workoutExercises) {
      await this.updateExercise(ex.id, { isCompleted: false });
    }
  }
}

export const storage = new DatabaseStorage();
