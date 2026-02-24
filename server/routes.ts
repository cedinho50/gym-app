import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertExerciseSchema, insertWorkoutSplitSchema } from "@shared/schema";
import { z } from "zod";

async function seedDatabase() {
  const existingSplits = await storage.getSplits();
  if (existingSplits.length === 0) {
    const split1 = await storage.createSplit({ name: "Arme/Brust", order: 1 });
    const split2 = await storage.createSplit({ name: "Beine/Bauch", order: 2 });
    const split3 = await storage.createSplit({ name: "Rücken/Schultern", order: 3 });

    await storage.createExercise({ name: "Bizeps Curls", splitId: split1.id, weight: "8 kg", isCompleted: false, increaseNextTime: false });
    await storage.createExercise({ name: "Bankdrücken", splitId: split1.id, weight: "40 kg", isCompleted: false, increaseNextTime: true });
    await storage.createExercise({ name: "Trizepsdrücken", splitId: split1.id, weight: "20 kg", isCompleted: false, increaseNextTime: false });

    await storage.createExercise({ name: "Beinpresse", splitId: split2.id, weight: "75 kg", isCompleted: false, increaseNextTime: false });
    await storage.createExercise({ name: "Leg Curl", splitId: split2.id, weight: "50 kg", isCompleted: false, increaseNextTime: false });
    await storage.createExercise({ name: "Crunches", splitId: split2.id, weight: "", isCompleted: false, increaseNextTime: false });

    await storage.createExercise({ name: "Latzug", splitId: split3.id, weight: "45 kg", isCompleted: false, increaseNextTime: false });
    await storage.createExercise({ name: "Schulterdrücken", splitId: split3.id, weight: "30 kg", isCompleted: false, increaseNextTime: false });
    await storage.createExercise({ name: "Rudern", splitId: split3.id, weight: "50 kg", isCompleted: false, increaseNextTime: false });
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await seedDatabase();

  // Splits
  app.get("/api/splits", async (req, res) => {
    res.json(await storage.getSplits());
  });
  app.post("/api/splits", async (req, res) => {
    const data = insertWorkoutSplitSchema.parse(req.body);
    res.status(201).json(await storage.createSplit(data));
  });
  app.patch("/api/splits/:id", async (req, res) => {
    const item = await storage.updateSplit(Number(req.params.id), insertWorkoutSplitSchema.partial().parse(req.body));
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  app.delete("/api/splits/:id", async (req, res) => {
    await storage.deleteSplit(Number(req.params.id));
    res.status(204).end();
  });

  // Exercises
  app.get("/api/exercises", async (req, res) => {
    const splitId = req.query.splitId ? Number(req.query.splitId) : undefined;
    res.json(await storage.getExercises(splitId));
  });
  app.post("/api/exercises", async (req, res) => {
    const data = insertExerciseSchema.parse(req.body);
    res.status(201).json(await storage.createExercise(data));
  });
  app.patch("/api/exercises/:id", async (req, res) => {
    const item = await storage.updateExercise(Number(req.params.id), insertExerciseSchema.partial().parse(req.body));
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  app.delete("/api/exercises/:id", async (req, res) => {
    await storage.deleteExercise(Number(req.params.id));
    res.status(204).end();
  });

  // Reorder exercises within a split
  app.post("/api/exercises/reorder", async (req, res) => {
    const { splitId, orderedIds } = z.object({ splitId: z.number(), orderedIds: z.array(z.number()) }).parse(req.body);
    await storage.reorderExercises(splitId, orderedIds);
    res.json({ success: true });
  });

  // Reset completed state for a split
  app.post("/api/exercises/reset", async (req, res) => {
    const { splitId } = z.object({ splitId: z.number() }).parse(req.body);
    const splitExercises = await storage.getExercises(splitId);
    for (const ex of splitExercises) {
      await storage.updateExercise(ex.id, { isCompleted: false });
    }
    res.json({ success: true });
  });

  // History
  app.get("/api/history", async (req, res) => {
    res.json(await storage.getHistory());
  });

  // Finish Workout
  app.post("/api/workout/finish", async (req, res) => {
    const { splitId } = z.object({ splitId: z.number() }).parse(req.body);
    await storage.finishWorkout(splitId);
    res.json({ success: true });
  });

  return httpServer;
}
