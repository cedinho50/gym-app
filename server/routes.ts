import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertExerciseSchema, insertWorkoutSplitSchema, TARGET_REPS, TARGET_SETS } from "@shared/schema";
import { z } from "zod";
import { analyzeTraining, ollamaInfo } from "./ollama";
import { buildOllamaInput, buildMarkdownReport } from "./report";
import { pushToAll, getVapidPublicKey } from "./pushNotifications";

// Fuehrt eine KI-Analyse im Hintergrund aus und schickt danach eine Push.
async function runAnalysisInBackground(analysisId: number) {
  try {
    const [history, splits] = await Promise.all([storage.getHistory(), storage.getSplits()]);
    if (history.length === 0) {
      await storage.finishAnalysis(analysisId, "done", "Noch keine abgeschlossenen Trainings vorhanden. Absolviere zuerst ein Training.", ollamaInfo().model);
      return;
    }
    const input = buildOllamaInput(history, splits);
    const summary = await analyzeTraining(input);
    await storage.finishAnalysis(analysisId, "done", summary, ollamaInfo().model);
    pushToAll({
      title: "🧠 KI-Analyse fertig",
      body: "Dein Trainingsbericht steht bereit. Tippe zum Ansehen.",
      url: "/",
      tag: "analyse-fertig",
    }).catch((err) => console.error("[analyse] Push-Fehler:", err?.message));
  } catch (err: any) {
    console.error("[analyse] Fehler:", err?.message);
    await storage.finishAnalysis(
      analysisId,
      "error",
      "KI-Analyse nicht moeglich. Laeuft Ollama auf dem Raspberry? (" + (err?.message || "unbekannter Fehler") + ")",
      ollamaInfo().model,
    );
    pushToAll({
      title: "KI-Analyse fehlgeschlagen",
      body: "Die Analyse konnte nicht erstellt werden. Bitte spaeter erneut versuchen.",
      url: "/",
      tag: "analyse-fehler",
    }).catch(() => {});
  }
}

// Prueft jede Minute auf faellige Erinnerungen und verschickt sie als Push.
function startReminderScheduler() {
  const tick = async () => {
    try {
      const due = await storage.getDueReminders();
      for (const r of due) {
        await pushToAll({
          title: "⏰ Zeit fuer die Fortschritts-Pruefung",
          body: r.note && r.note.trim() ? r.note : "Exportiere deinen Bericht und lass ihn analysieren.",
          url: "/",
          tag: `reminder-${r.id}`,
        });
        await storage.markReminderSent(r.id);
      }
    } catch (err: any) {
      console.error("[reminder] Scheduler-Fehler:", err?.message);
    }
  };
  setInterval(tick, 60 * 1000);
  tick().catch(() => {});
}

function parseSets(sets?: string | null): number[] {
  if (!sets) return [];
  try {
    const arr = JSON.parse(sets);
    if (Array.isArray(arr)) return arr.map((n) => Number(n)).filter((n) => !isNaN(n));
    return [];
  } catch {
    return [];
  }
}

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
  startReminderScheduler();

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
    const id = Number(req.params.id);
    const updates = insertExerciseSchema.partial().parse(req.body);
    let item = await storage.updateExercise(id, updates);
    if (!item) return res.status(404).json({ message: "Not found" });

    // Steigern-Erkennung: wenn die Saetze aktualisiert wurden und der letzte
    // Satz das Ziel erreicht, markieren wir automatisch "Steigern" und schicken
    // eine Push-Benachrichtigung (falls konfiguriert).
    let progressed = false;
    if (updates.sets !== undefined) {
      const sets = parseSets(item.sets);
      const reachedTarget = sets.length >= TARGET_SETS && sets[sets.length - 1] >= TARGET_REPS;
      if (reachedTarget && !item.increaseNextTime) {
        item = (await storage.updateExercise(id, { increaseNextTime: true })) ?? item;
        progressed = true;
        pushToAll({
          title: "💪 Steigern faellig!",
          body: `${item.name}: letzter Satz ${TARGET_REPS} erreicht. Neues Gewicht eintragen.`,
          url: "/",
          tag: `steigern-${item.id}`,
        }).catch((err) => console.error("[push] Fehler:", err?.message));
      }
    }

    res.json({ ...item, progressed });
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

  // ---------------------------------------------------------------
  // KI-Analyse: laeuft im Hintergrund. Start liefert sofort zurueck,
  // das Ergebnis wird gespeichert und per Push gemeldet.
  // ---------------------------------------------------------------
  app.post("/api/analyse", async (_req, res) => {
    const analysis = await storage.createAnalysis();
    // Nicht awaiten: laeuft im Hintergrund weiter.
    runAnalysisInBackground(analysis.id);
    res.status(202).json({ id: analysis.id, status: "pending" });
  });

  app.get("/api/analyse/latest", async (_req, res) => {
    const latest = await storage.getLatestAnalysis();
    if (!latest) return res.json(null);
    res.json(latest);
  });

  // ---------------------------------------------------------------
  // Export: ausfuehrlicher Markdown-Bericht zum Weitergeben an eine KI.
  // ---------------------------------------------------------------
  app.get("/api/export", async (_req, res) => {
    try {
      const [history, splits, exercises] = await Promise.all([
        storage.getHistory(),
        storage.getSplits(),
        storage.getExercises(),
      ]);
      const latest = await storage.getLatestAnalysis();
      const ollamaSummary = latest && latest.status === "done" ? latest.summary : undefined;
      const markdown = buildMarkdownReport(history, splits, exercises, ollamaSummary);
      res.json({ markdown });
    } catch (err: any) {
      console.error("[export] Fehler:", err?.message);
      res.status(500).json({ message: "Export fehlgeschlagen" });
    }
  });

  // ---------------------------------------------------------------
  // Erinnerungen fuer die naechste Fortschritts-Pruefung.
  // ---------------------------------------------------------------
  app.get("/api/reminder", async (_req, res) => {
    const next = await storage.getUpcomingReminder();
    res.json(next ?? null);
  });
  app.post("/api/reminder", async (req, res) => {
    const body = z.object({ remindAt: z.string(), note: z.string().optional() }).parse(req.body);
    const remindAt = new Date(body.remindAt);
    if (isNaN(remindAt.getTime())) return res.status(400).json({ message: "Ungueltiges Datum" });
    const reminder = await storage.createReminder({ remindAt, note: body.note ?? "" });
    res.status(201).json(reminder);
  });
  app.delete("/api/reminder/:id", async (req, res) => {
    await storage.deleteReminder(Number(req.params.id));
    res.status(204).end();
  });

  // ---------------------------------------------------------------
  // Push-Benachrichtigungen
  // ---------------------------------------------------------------
  app.get("/api/push/vapid-public-key", (_req, res) => {
    res.json({ key: getVapidPublicKey() });
  });
  app.post("/api/push/subscribe", async (req, res) => {
    const data = z.object({
      endpoint: z.string(),
      keys: z.object({ p256dh: z.string(), auth: z.string() }),
    }).parse(req.body);
    await storage.addPushSubscription({ endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth });
    res.json({ success: true });
  });
  app.post("/api/push/unsubscribe", async (req, res) => {
    const data = z.object({ endpoint: z.string() }).parse(req.body);
    await storage.deletePushSubscription(data.endpoint);
    res.json({ success: true });
  });

  return httpServer;
}
