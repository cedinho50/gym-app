import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

async function seedDatabase() {
  const existingSplits = await storage.getSplits();
  if (existingSplits.length === 0) {
    const split1 = await storage.createSplit({ name: "Arme/Brust", order: 1 });
    const split2 = await storage.createSplit({ name: "Beine/Bauch", order: 2 });
    const split3 = await storage.createSplit({ name: "Rücken/Schultern", order: 3 });

    await storage.createExercise({ name: "Bizeps Curls", splitId: split1.id, weight: "8 kg", isCompleted: false, increaseNextTime: false });
    await storage.createExercise({ name: "Bankdrücken", splitId: split1.id, weight: "40 kg", isCompleted: false, increaseNextTime: true });
    
    await storage.createExercise({ name: "Leg Curl", splitId: split2.id, weight: "67.5 kg", isCompleted: false, increaseNextTime: false });
    await storage.createExercise({ name: "Beinpresse", splitId: split2.id, weight: "75 kg", isCompleted: false, increaseNextTime: false });

    await storage.createExercise({ name: "Latzug", splitId: split3.id, weight: "45 kg", isCompleted: false, increaseNextTime: false });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await seedDatabase();

  // Splits
  app.get(api.splits.list.path, async (req, res) => {
    res.json(await storage.getSplits());
  });
  app.post(api.splits.create.path, async (req, res) => {
    res.status(201).json(await storage.createSplit(api.splits.create.input.parse(req.body)));
  });
  app.patch(api.splits.update.path, async (req, res) => {
    const item = await storage.updateSplit(Number(req.params.id), api.splits.update.input.parse(req.body));
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  app.delete(api.splits.delete.path, async (req, res) => {
    await storage.deleteSplit(Number(req.params.id));
    res.status(204).end();
  });

  // Exercises
  app.get(api.exercises.list.path, async (req, res) => {
    const splitId = req.query.splitId ? Number(req.query.splitId) : undefined;
    res.json(await storage.getExercises(splitId));
  });
  app.post(api.exercises.create.path, async (req, res) => {
    res.status(201).json(await storage.createExercise(api.exercises.create.input.parse(req.body)));
  });
  app.patch(api.exercises.update.path, async (req, res) => {
    const item = await storage.updateExercise(Number(req.params.id), api.exercises.update.input.parse(req.body));
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  app.delete(api.exercises.delete.path, async (req, res) => {
    await storage.deleteExercise(Number(req.params.id));
    res.status(204).end();
  });

  // History
  app.get(api.history.list.path, async (req, res) => {
    res.json(await storage.getHistory());
  });

  // Reset Exercises
  app.post(api.exercises.resetCompleted.path, async (req, res) => {
    const allExercises = await storage.getExercises();
    for (const ex of allExercises) {
      await storage.updateExercise(ex.id, { isCompleted: false });
    }
    res.json({ success: true });
  });

  // Finish Workout
  app.post(api.workout.finish.path, async (req, res) => {
    const { splitId } = api.workout.finish.input.parse(req.body);
    await storage.finishWorkout(splitId);
    res.json({ success: true });
  });

  return httpServer;
}
