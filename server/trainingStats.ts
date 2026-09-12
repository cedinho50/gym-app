// ------------------------------------------------------------------
// Faktische Vorberechnung aus der Trainings-Historie.
// Rein deterministisch (kein LLM): nur Daten, die in der DB stehen.
// ------------------------------------------------------------------

import type { WorkoutHistory, WorkoutSplit } from "@shared/schema";
import { TARGET_REPS, TARGET_SETS, STAGNATION_THRESHOLD } from "@shared/constants";

interface ExerciseSnapshot {
  name: string;
  weight?: string;
  sets?: string;
}

interface TimelineEntry {
  date: Date;
  split: string;
  weight: string;
  sets: number[];
}

interface ExerciseTimeline {
  name: string;
  entries: TimelineEntry[];
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

function parseSnapshot(workoutData: string): ExerciseSnapshot[] {
  try {
    const arr = JSON.parse(workoutData);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function parseWeightKg(weight: string): number | null {
  const m = weight.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

function buildTimelines(history: WorkoutHistory[], splitMap: Record<number, string>): ExerciseTimeline[] {
  const byName = new Map<string, ExerciseTimeline>();
  for (const h of history) {
    const date = new Date(h.completedAt);
    const split = splitMap[h.splitId] ?? `Training ${h.splitId}`;
    for (const ex of parseSnapshot(h.workoutData)) {
      const name = ex.name?.trim();
      if (!name) continue;
      if (!byName.has(name)) byName.set(name, { name, entries: [] });
      byName.get(name)!.entries.push({
        date,
        split,
        weight: ex.weight?.trim() || "",
        sets: parseSets(ex.sets),
      });
    }
  }
  return Array.from(byName.values());
}

function weightIncreaseDue(lastEntry: TimelineEntry | undefined): string {
  if (!lastEntry) return "keine Daten";
  const { sets } = lastEntry;
  if (sets.length === 0) return "keine Daten";
  if (sets.length < TARGET_SETS) return `nein (${sets.length}/${TARGET_SETS} Sätze erfasst)`;
  const allTarget = sets.slice(0, TARGET_SETS).every((r) => r >= TARGET_REPS);
  return allTarget ? "ja" : "nein";
}

function lastSetTrend(entries: TimelineEntry[]): string {
  const withReps = entries.filter((e) => e.sets.length > 0);
  if (withReps.length < 2) return "keine Daten";
  const window = withReps.slice(-4);
  const first = window[0].sets[window[0].sets.length - 1];
  const last = window[window.length - 1].sets[window[window.length - 1].sets.length - 1];
  if (last > first) return "steigend";
  if (last < first) return "fallend";
  return "gleichbleibend";
}

function hasProgress(prev: TimelineEntry, curr: TimelineEntry): boolean {
  const prevW = parseWeightKg(prev.weight);
  const currW = parseWeightKg(curr.weight);
  if (prevW !== null && currW !== null && currW > prevW) return true;

  const prevLast = prev.sets.length ? prev.sets[prev.sets.length - 1] : null;
  const currLast = curr.sets.length ? curr.sets[curr.sets.length - 1] : null;
  if (prevLast !== null && currLast !== null && currLast > prevLast) return true;

  return false;
}

function countStagnantPairs(entries: TimelineEntry[]): number {
  if (entries.length < 2) return 0;
  let count = 0;
  for (let i = entries.length - 1; i > 0; i--) {
    if (!hasProgress(entries[i - 1], entries[i])) count++;
    else break;
  }
  return count;
}

function countSessionsInDays(history: WorkoutHistory[], splitId: number, days: number, now: Date): number {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return history.filter(
    (h) => h.splitId === splitId && new Date(h.completedAt).getTime() >= cutoff,
  ).length;
}

// Baut den Markdown-Abschnitt fuer den Export und die Analyse-Ansicht.
export function buildFactualPrecheck(history: WorkoutHistory[], splits: WorkoutSplit[]): string {
  const now = new Date();
  const splitMap = Object.fromEntries(splits.map((s) => [s.id, s.name]));
  const timelines = buildTimelines(history, splitMap);

  if (history.length === 0) {
    return "Keine abgeschlossenen Trainings vorhanden.";
  }

  const out: string[] = [];

  out.push("### Pro Übung");
  out.push("");
  out.push("| Übung | Muskelgruppe | Steigerung fällig | Trend letzter Satz | Letztes Training |");
  out.push("|---|---|---|---|---|");
  for (const t of timelines.sort((a, b) => a.name.localeCompare(b.name, "de"))) {
    const last = t.entries[t.entries.length - 1];
    const split = last?.split ?? "-";
    out.push(
      `| ${t.name} | ${split} | ${weightIncreaseDue(last)} | ${lastSetTrend(t.entries)} | ${last ? fmtDate(last.date) : "-"} |`,
    );
  }
  out.push("");

  out.push("### Pro Muskelgruppe");
  out.push("");
  out.push("| Muskelgruppe | Trainings (7 Tage) | Trainings (14 Tage) | Trainings (28 Tage) | Tage seit letztem Training |");
  out.push("|---|---|---|---|---|");
  const sortedHistory = history.slice().sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );
  for (const s of splits) {
    const sessions = sortedHistory
      .filter((h) => h.splitId === s.id)
      .map((h) => new Date(h.completedAt));
    const lastSession = sessions[sessions.length - 1];
    out.push(
      `| ${s.name} | ${countSessionsInDays(history, s.id, 7, now)} | ${countSessionsInDays(history, s.id, 14, now)} | ${countSessionsInDays(history, s.id, 28, now)} | ${lastSession ? daysBetween(lastSession, now) : "-"} |`,
    );
  }
  out.push("");

  out.push(`### Stillstand (mehr als ${STAGNATION_THRESHOLD} Trainings ohne Fortschritt)`);
  out.push("");
  out.push(
    `Kriterium: ${STAGNATION_THRESHOLD + 1}+ aufeinanderfolgende Trainings ohne Anstieg bei Gewicht oder letztem Satz (Wdh.).`,
  );
  out.push("");
  const stagnant: string[] = [];
  for (const t of timelines) {
    const pairs = countStagnantPairs(t.entries);
    if (pairs > STAGNATION_THRESHOLD) {
      const last = t.entries[t.entries.length - 1];
      stagnant.push(
        `- **${t.name}** (${last?.split ?? "?"}): ${pairs + 1} Trainings ohne messbaren Fortschritt, zuletzt ${last ? fmtDate(last.date) : "-"}`,
      );
    }
  }
  if (stagnant.length === 0) {
    out.push("Keine Übungen über dem Stillstand-Schwellenwert.");
  } else {
    out.push(...stagnant);
  }
  out.push("");

  out.push(
    `Hinweis: Steigerung fällig = im letzten erfassten Training alle ${TARGET_SETS} Sätze mit je ${TARGET_REPS} Wdh. ` +
    `Trend = Vergleich letzter Satz über die letzten bis zu 4 Trainings mit erfassten Wdh. ` +
    `Fehlende Wdh.-Daten werden als «keine Daten» ausgewiesen.`,
  );

  return out.join("\n");
}
