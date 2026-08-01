// ------------------------------------------------------------------
// Baut aus der Trainings-Historie zwei Dinge:
//  1) einen kompakten Text als Eingabe fuer Ollama (klein halten!)
//  2) einen ausfuehrlichen Bericht zum Export, so formuliert, dass er
//     direkt an eine KI (z.B. Claude oder Gemini) weitergegeben werden
//     kann, inkl. Struktur, Frequenz, Ruhetagen und Volumen.
// Text in Schweizer Schreibweise (kein Eszett, stattdessen ss) mit Umlauten.
// ------------------------------------------------------------------

import type { WorkoutHistory, WorkoutSplit, Exercise } from "@shared/schema";
import { TARGET_REPS, TARGET_SETS } from "@shared/schema";

interface ExerciseSnapshot {
  id?: number;
  name: string;
  weight?: string;
  increaseNextTime?: boolean;
  sets?: string; // JSON-Zahlen-Array, z.B. "[10,10,7]"
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

function setsLabel(sets: number[]): string {
  if (sets.length === 0) return "keine Wdh. erfasst";
  return sets.join("/");
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

interface ExerciseTimeline {
  name: string;
  entries: Array<{ date: Date; split: string; weight: string; sets: number[] }>;
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

// Kompakter Text fuer Ollama: pro Uebung die letzten bis zu 6 Trainings.
export function buildOllamaInput(history: WorkoutHistory[], splits: WorkoutSplit[]): string {
  const splitMap = Object.fromEntries(splits.map((s) => [s.id, s.name]));
  const timelines = buildTimelines(history, splitMap);
  if (timelines.length === 0) return "Keine Trainingsdaten vorhanden.";

  const lines: string[] = [];
  for (const t of timelines) {
    const recent = t.entries.slice(-6);
    const parts = recent.map((e) => `${fmtDate(e.date)}: ${e.weight || "?"}, Saetze ${setsLabel(e.sets)}`);
    lines.push(`${t.name} -> ${parts.join(" | ")}`);
  }
  return lines.join("\n");
}

// Ausfuehrlicher Bericht zum Export (Umlaute, Schweizer Schreibweise).
export function buildMarkdownReport(
  history: WorkoutHistory[],
  splits: WorkoutSplit[],
  exercises: Exercise[] = [],
  ollamaSummary?: string,
): string {
  const splitMap = Object.fromEntries(splits.map((s) => [s.id, s.name]));
  const timelines = buildTimelines(history, splitMap);
  const now = new Date();

  const out: string[] = [];
  out.push(`# Trainings-Bericht Gym`);
  out.push("");
  out.push(`Erstellt am ${fmtDate(now)} um ${now.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })} Uhr.`);
  out.push("");
  out.push(
    "Dieser Bericht ist so formuliert, dass er direkt an eine KI (z.B. Claude oder Gemini) " +
    "weitergegeben werden kann, um Trainingsempfehlungen zu erhalten.",
  );
  out.push("");
  out.push("## Trainingsmethode");
  out.push("");
  out.push(
    `Ganzkörper-Split in ${splits.length} Einheiten. Pro Übung 3 Sätze, Ziel ${TARGET_REPS} Wiederholungen. ` +
    `Das Gewicht ist so gewählt, dass im letzten Satz zuerst nur etwa 6 Wiederholungen möglich sind. Sobald der letzte ` +
    `Satz ${TARGET_REPS} Wiederholungen erreicht, wird das Gewicht erhöht (Doppelprogression). ` +
    `Sätze werden als "Satz1/Satz2/Satz3" angegeben. Ziel: 3 Sätze, ${TARGET_REPS} Wdh.`,
  );
  out.push("");

  // ----- Trainingsstruktur (aktuell) -----
  out.push("## Trainingsstruktur (aktueller Plan)");
  out.push("");
  if (exercises.length === 0) {
    out.push("Keine aktuellen Übungen gefunden.");
    out.push("");
  } else {
    const bySplit = new Map<number, Exercise[]>();
    for (const ex of exercises) {
      const sid = ex.splitId ?? 0;
      if (!bySplit.has(sid)) bySplit.set(sid, []);
      bySplit.get(sid)!.push(ex);
    }
    out.push(`Anzahl Trainingseinheiten (Muskelgruppen): ${splits.length}`);
    out.push(`Anzahl Übungen gesamt: ${exercises.length}`);
    out.push("");
    out.push("| Trainingseinheit (Muskelgruppe) | Anzahl Übungen | Übungen |");
    out.push("|---|---|---|");
    for (const s of splits) {
      const list = (bySplit.get(s.id) ?? []).slice().sort((a, b) => a.order - b.order);
      const names = list.map((e) => `${e.name} (${e.weight || "-"})`).join(", ");
      out.push(`| ${s.name} | ${list.length} | ${names || "-"} |`);
    }
    out.push("");
  }

  // ----- Frequenz und Ruhetage -----
  out.push("## Trainingsfrequenz und Ruhetage");
  out.push("");
  if (history.length === 0) {
    out.push("Noch keine abgeschlossenen Trainings.");
    out.push("");
  } else {
    const sorted = history.slice().sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
    const first = new Date(sorted[0].completedAt);
    const last = new Date(sorted[sorted.length - 1].completedAt);
    const spanDays = Math.max(1, daysBetween(first, last));
    const perWeek = (history.length / (spanDays / 7));
    out.push(`Abgeschlossene Trainings gesamt: ${history.length}`);
    out.push(`Zeitraum: ${fmtDate(first)} bis ${fmtDate(last)} (${spanDays} Tage)`);
    out.push(`Durchschnitt: ${perWeek.toFixed(1)} Trainings pro Woche`);
    out.push(`Tage seit dem letzten Training: ${daysBetween(last, now)}`);
    out.push("");

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(daysBetween(new Date(sorted[i - 1].completedAt), new Date(sorted[i].completedAt)));
    }
    if (gaps.length) {
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      out.push(`Durchschnittliche Pause zwischen zwei Trainings: ${avgGap.toFixed(1)} Tage (Spanne ${Math.min(...gaps)} bis ${Math.max(...gaps)} Tage)`);
      out.push("");
    }

    out.push("Verteilung je Trainingseinheit:");
    out.push("");
    out.push("| Trainingseinheit | Anzahl Trainings | Letztes Training | Tage seither | Ø Pause (Tage) |");
    out.push("|---|---|---|---|---|");
    for (const s of splits) {
      const ses = sorted.filter((h) => h.splitId === s.id).map((h) => new Date(h.completedAt));
      if (ses.length === 0) {
        out.push(`| ${s.name} | 0 | - | - | - |`);
        continue;
      }
      const lastS = ses[ses.length - 1];
      const sGaps: number[] = [];
      for (let i = 1; i < ses.length; i++) sGaps.push(daysBetween(ses[i - 1], ses[i]));
      const avg = sGaps.length ? (sGaps.reduce((a, b) => a + b, 0) / sGaps.length).toFixed(1) : "-";
      out.push(`| ${s.name} | ${ses.length} | ${fmtDate(lastS)} | ${daysBetween(lastS, now)} | ${avg} |`);
    }
    out.push("");
  }

  // ----- Volumen -----
  out.push("## Volumen (letzte Trainings)");
  out.push("");
  out.push(
    "Volumen = Anzahl Sätze und Summe der Wiederholungen. Wiederholungen werden erst seit dem Update erfasst, " +
    "ältere Trainings zeigen daher evtl. keine Wdh.",
  );
  out.push("");
  {
    const sortedDesc = history.slice().sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).slice(0, 8);
    if (sortedDesc.length === 0) {
      out.push("Keine Daten.");
    } else {
      out.push("| Datum | Einheit | Übungen | Sätze gesamt | Wdh. gesamt |");
      out.push("|---|---|---|---|---|");
      for (const h of sortedDesc) {
        const snap = parseSnapshot(h.workoutData);
        let totalSets = 0;
        let totalReps = 0;
        for (const ex of snap) {
          const s = parseSets(ex.sets);
          totalSets += s.length;
          totalReps += s.reduce((a, b) => a + b, 0);
        }
        const date = new Date(h.completedAt);
        out.push(`| ${fmtDate(date)} | ${splitMap[h.splitId] ?? h.splitId} | ${snap.length} | ${totalSets || "-"} | ${totalReps || "-"} |`);
      }
    }
    out.push("");
  }

  // ----- KI-Vorbewertung -----
  if (ollamaSummary && ollamaSummary.trim()) {
    out.push("## KI-Vorbewertung (lokal auf dem Raspberry, Ollama)");
    out.push("");
    out.push(ollamaSummary.trim());
    out.push("");
  }

  // ----- Verlauf pro Uebung -----
  out.push("## Verlauf pro Übung");
  out.push("");
  if (timelines.length === 0) {
    out.push("Keine Trainingsdaten vorhanden.");
  } else {
    for (const t of timelines) {
      out.push(`### ${t.name}`);
      out.push("");
      out.push("| Datum | Einheit | Gewicht | Sätze (Wdh.) | Letzter Satz |");
      out.push("|---|---|---|---|---|");
      for (const e of t.entries) {
        const last = e.sets.length ? String(e.sets[e.sets.length - 1]) : "-";
        const dueMark = e.sets.length && e.sets[e.sets.length - 1] >= TARGET_REPS ? ` (Ziel ${TARGET_REPS})` : "";
        out.push(`| ${fmtDate(e.date)} | ${e.split} | ${e.weight || "-"} | ${setsLabel(e.sets)} | ${last}${dueMark} |`);
      }
      out.push("");
    }
  }

  // ----- Bitte um Empfehlung -----
  out.push("## Bitte um Empfehlung");
  out.push("");
  out.push(
    "Bitte analysiere den Fortschritt und gib konkrete Empfehlungen zu: " +
    "1) Gewichtssteigerungen (wo fällig, wo Stillstand), " +
    "2) Trainingsvolumen (Sätze pro Muskelgruppe pro Woche, zu viel oder zu wenig), " +
    "3) Ruhetage und Frequenz (passt die Erholung, sind mehr oder weniger Trainings sinnvoll), " +
    "4) Intensität (passt die 6-bis-10-Progression), " +
    "5) Übungsauswahl und Anzahl Übungen pro Einheit (fehlt etwas, ist etwas doppelt, Balance der Muskelgruppen), " +
    "6) einen konkreten Plan für die nächsten Wochen. " +
    "Nenne am Ende bitte auch, nach wie vielen Wochen ich den Fortschritt erneut prüfen sollte.",
  );
  out.push("");

  return out.join("\n");
}
