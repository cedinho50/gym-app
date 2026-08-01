// ------------------------------------------------------------------
// Baut aus der Trainings-Historie zwei Dinge:
//  1) einen kompakten Text als Eingabe fuer Ollama (klein halten!)
//  2) einen ausfuehrlichen Markdown-Bericht zum Export, so formuliert,
//     dass er direkt an eine KI (z.B. Claude) weitergegeben werden kann.
// Vorbild fuer den Export-Stil: das Projekt "Pi-Doktor".
// ------------------------------------------------------------------

import type { WorkoutHistory, WorkoutSplit } from "@shared/schema";
import { TARGET_REPS } from "@shared/schema";

interface ExerciseSnapshot {
  id?: number;
  name: string;
  weight?: string;
  increaseNextTime?: boolean;
  sets?: string; // JSON-Zahlen-Array, z.B. "[10,10,7]"
}

function parseSets(sets?: string): number[] {
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
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function setsLabel(sets: number[]): string {
  if (sets.length === 0) return "keine Wiederholungen erfasst";
  return sets.join("/");
}

// Sammelt pro Uebung die letzten Trainings (aelteste zuerst).
interface ExerciseTimeline {
  name: string;
  entries: Array<{ date: Date; split: string; weight: string; sets: number[] }>;
}

function buildTimelines(history: WorkoutHistory[], splitMap: Record<number, string>): ExerciseTimeline[] {
  const byName = new Map<string, ExerciseTimeline>();
  // history ist aufsteigend nach completedAt (siehe storage.getHistory)
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

// Kompakter Text fuer Ollama: pro Uebung die letzten bis zu 6 Trainings.
export function buildOllamaInput(history: WorkoutHistory[], splits: WorkoutSplit[]): string {
  const splitMap = Object.fromEntries(splits.map((s) => [s.id, s.name]));
  const timelines = buildTimelines(history, splitMap);
  if (timelines.length === 0) return "Keine Trainingsdaten vorhanden.";

  const lines: string[] = [];
  for (const t of timelines) {
    const recent = t.entries.slice(-6);
    const parts = recent.map((e) => {
      const w = e.weight || "?";
      return `${fmtDate(e.date)}: ${w}, Saetze ${setsLabel(e.sets)}`;
    });
    lines.push(`${t.name} -> ${parts.join(" | ")}`);
  }
  return lines.join("\n");
}

// Ausfuehrlicher Markdown-Bericht zum Export.
export function buildMarkdownReport(
  history: WorkoutHistory[],
  splits: WorkoutSplit[],
  ollamaSummary?: string,
): string {
  const splitMap = Object.fromEntries(splits.map((s) => [s.id, s.name]));
  const timelines = buildTimelines(history, splitMap);
  const now = new Date();

  const out: string[] = [];
  out.push(`# Trainings-Bericht Gym`);
  out.push("");
  out.push(`Erstellt am ${fmtDate(now)} um ${now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr.`);
  out.push("");
  out.push(
    "Dieser Bericht ist so formuliert, dass er direkt an eine KI (z.B. Claude) " +
    "weitergegeben werden kann, um Trainingsempfehlungen zu erhalten.",
  );
  out.push("");
  out.push("## Trainingsmethode");
  out.push("");
  out.push(
    `3 Saetze pro Uebung, Ziel ${TARGET_REPS} Wiederholungen. Das Gewicht ist so gewaehlt, ` +
    `dass im letzten Satz zuerst nur etwa 6 Wiederholungen moeglich sind. Sobald der letzte ` +
    `Satz ${TARGET_REPS} Wiederholungen erreicht, wird das Gewicht erhoeht (Doppelprogression). ` +
    `Die Saetze werden als "Satz1/Satz2/Satz3" angegeben.`,
  );
  out.push("");

  out.push("## Zusammenfassung");
  out.push("");
  out.push(`Absolvierte Trainings gesamt: ${history.length}`);
  out.push("");

  if (ollamaSummary && ollamaSummary.trim()) {
    out.push("## KI-Vorbewertung (lokal auf dem Raspberry, Ollama)");
    out.push("");
    out.push(ollamaSummary.trim());
    out.push("");
  }

  out.push("## Verlauf pro Uebung");
  out.push("");
  if (timelines.length === 0) {
    out.push("Keine Trainingsdaten vorhanden.");
  } else {
    for (const t of timelines) {
      out.push(`### ${t.name}`);
      out.push("");
      out.push("| Datum | Training | Gewicht | Saetze (Wdh.) | Letzter Satz |");
      out.push("|---|---|---|---|---|");
      for (const e of t.entries) {
        const last = e.sets.length ? String(e.sets[e.sets.length - 1]) : "-";
        const dueMark = e.sets.length && e.sets[e.sets.length - 1] >= TARGET_REPS ? ` (Ziel ${TARGET_REPS} erreicht)` : "";
        out.push(`| ${fmtDate(e.date)} | ${e.split} | ${e.weight || "-"} | ${setsLabel(e.sets)} | ${last}${dueMark} |`);
      }
      out.push("");
    }
  }

  out.push("## Bitte um Empfehlung");
  out.push("");
  out.push(
    "Bitte analysiere den Fortschritt: Wo stehe ich still, wo laeuft es gut, bei welchen " +
    "Uebungen sollte ich das Gewicht erhoehen, und wie sollte mein Plan fuer die naechsten " +
    "Wochen aussehen?",
  );
  out.push("");

  return out.join("\n");
}
