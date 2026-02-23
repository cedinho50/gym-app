import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

async function seedDatabase() {
  const existing = await storage.getExercises();
  if (existing.length === 0) {
    await storage.createExercise({ name: "Bizeps Curls", category: "Arme", weight: "8 kg", isCompleted: false, increaseNextTime: false });
    await storage.createExercise({ name: "Trizepsdrücken", category: "Arme", weight: "28.25 kg", isCompleted: false, increaseNextTime: true });
    await storage.createExercise({ name: "Leg Curl", category: "Beine", weight: "67.5 kg", isCompleted: false, increaseNextTime: false });
    await storage.createExercise({ name: "Beinpresse", category: "Beine", weight: "75 kg", isCompleted: false, increaseNextTime: false });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed initial data
  await seedDatabase();

  app.get(api.exercises.list.path, async (req, res) => {
    const items = await storage.getExercises();
    res.json(items);
  });

  app.post(api.exercises.create.path, async (req, res) => {
    try {
      const input = api.exercises.create.input.parse(req.body);
      const item = await storage.createExercise(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.exercises.update.path, async (req, res) => {
    try {
      const input = api.exercises.update.input.parse(req.body);
      const item = await storage.updateExercise(Number(req.params.id), input);
      if (!item) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.exercises.delete.path, async (req, res) => {
    await storage.deleteExercise(Number(req.params.id));
    res.status(204).end();
  });

  app.post(api.exercises.resetCompleted.path, async (req, res) => {
    await storage.resetCompleted();
    res.json({ success: true });
  });

  return httpServer;
}
