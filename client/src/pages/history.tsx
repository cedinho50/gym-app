import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronUp, TrendingUp, Sparkles, Download, Loader2, Clock, X, Check } from "lucide-react";
import { useHistory } from "@/hooks/use-history";
import { useSplits } from "@/hooks/use-splits";
import { useStartAnalyse, useLatestAnalysis, useExportReport, useReminder, useSetReminder, useDeleteReminder } from "@/hooks/use-analyse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkoutHistory, Exercise } from "@shared/schema";

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

function HistoryEntry({ entry, splitName }: { entry: WorkoutHistory; splitName: string }) {
  const [open, setOpen] = useState(false);
  const exercises: Exercise[] = useMemo(() => {
    try { return JSON.parse(entry.workoutData); } catch { return []; }
  }, [entry.workoutData]);

  const date = new Date(entry.completedAt);
  const dateStr = date.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const timeStr = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="border border-gray-100 rounded-3xl bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0">
          <CalendarDays className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{splitName}</p>
          <p className="text-sm text-gray-400">{dateStr} · {timeStr} Uhr</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">{exercises.length} Üb.</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-100 px-5 pb-4 pt-3 space-y-2"
        >
          {exercises.map((ex) => {
            const sets = parseSets(ex.sets);
            return (
              <div key={ex.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate">{ex.name}</span>
                  {ex.increaseNextTime && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      <TrendingUp className="w-2.5 h-2.5" />
                      Steigern
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {sets.length > 0 && (
                    <span className="text-xs text-gray-400 tabular-nums">{sets.join("/")}</span>
                  )}
                  <span className="text-sm text-gray-500">{ex.weight || "–"}</span>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function AnalysePanel() {
  const start = useStartAnalyse();
  const { data: latest } = useLatestAnalysis();
  const exportReport = useExportReport();

  const running = start.isPending || latest?.status === "pending";

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-blue-600" />
        <h2 className="text-base font-semibold text-gray-900">KI-Analyse</h2>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        Ollama auf dem Raspberry wertet deinen Verlauf aus. Der Export liefert einen ausführlichen Bericht zum Weitergeben.
      </p>

      <div className="flex gap-2">
        <Button
          onClick={() => start.mutate()}
          disabled={running}
          className="flex-1 h-11 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-semibold"
        >
          {running ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysiere...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Analysieren</>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => exportReport.mutate()}
          disabled={exportReport.isPending}
          className="h-11 px-4 rounded-2xl border-gray-200 text-gray-700 font-semibold"
        >
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </div>

      {running && (
        <div className="mt-4 flex items-start gap-2 text-sm text-gray-500 bg-gray-50 rounded-2xl p-3">
          <Loader2 className="w-4 h-4 mt-0.5 animate-spin flex-shrink-0" />
          <span>Die Analyse läuft im Hintergrund. Du kannst die App schliessen, du bekommst eine Push, sobald der Bericht bereit ist.</span>
        </div>
      )}

      {!running && latest?.status === "done" && latest.summary && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl bg-blue-50/60 border border-blue-100 p-4"
        >
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{latest.summary}</p>
          <p className="mt-3 text-[11px] text-gray-400">
            {latest.finishedAt ? new Date(latest.finishedAt).toLocaleString("de-DE") : ""}{latest.model ? ` · Modell: ${latest.model}` : ""}
          </p>
        </motion.div>
      )}

      {!running && latest?.status === "error" && (
        <p className="mt-4 text-sm text-red-500">{latest.summary || "KI-Analyse fehlgeschlagen"}</p>
      )}
      {start.isError && (
        <p className="mt-4 text-sm text-red-500">{start.error?.message}</p>
      )}
      {exportReport.isError && (
        <p className="mt-3 text-sm text-red-500">{exportReport.error?.message}</p>
      )}
    </div>
  );
}

function ReminderPanel() {
  const { data: reminder } = useReminder();
  const setReminder = useSetReminder();
  const deleteReminder = useDeleteReminder();
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const save = () => {
    if (!date) return;
    // Datum um 09:00 Uhr lokaler Zeit.
    const remindAt = new Date(`${date}T09:00:00`).toISOString();
    setReminder.mutate({ remindAt, note: note.trim() || undefined }, {
      onSuccess: () => { setDate(""); setNote(""); },
    });
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-4 h-4 text-blue-600" />
        <h2 className="text-base font-semibold text-gray-900">Nächste Überprüfung</h2>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        Wenn dir die KI sagt, wann du wieder prüfen sollst, trage das Datum ein. Du bekommst dann automatisch eine Erinnerung per Push.
      </p>

      {reminder ? (
        <div className="flex items-center gap-3 rounded-2xl bg-blue-50/60 border border-blue-100 p-3">
          <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-700">
              {new Date(reminder.remindAt).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            {reminder.note && <p className="text-xs text-blue-600 truncate">{reminder.note}</p>}
          </div>
          <button
            onClick={() => deleteReminder.mutate(reminder.id)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
            title="Erinnerung löschen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 rounded-xl border-gray-200 bg-gray-50 text-base"
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notiz (optional), z.B. Brust-Volumen prüfen"
            className="h-11 rounded-xl border-gray-200 bg-gray-50 text-base"
          />
          <Button
            onClick={save}
            disabled={!date || setReminder.isPending}
            className="w-full h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <Check className="w-4 h-4 mr-2" /> Erinnerung setzen
          </Button>
          {setReminder.isError && (
            <p className="text-sm text-red-500">{setReminder.error?.message}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function History() {
  const { data: history = [], isLoading } = useHistory();
  const { data: splits = [] } = useSplits();

  const splitMap = useMemo(() => {
    return Object.fromEntries(splits.map((s) => [s.id, s.name]));
  }, [splits]);

  const sorted = useMemo(() => [...history].reverse(), [history]);

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Historie</h1>
          <p className="text-sm text-gray-400">{history.length} Training{history.length !== 1 ? "s" : ""} absolviert</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-6 space-y-3">
        <AnalysePanel />
        <ReminderPanel />

        {isLoading ? (
          <div className="text-center py-20 text-gray-300 text-sm">Laden...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">Noch kein Training abgeschlossen.</p>
          </div>
        ) : (
          sorted.map((entry) => (
            <HistoryEntry
              key={entry.id}
              entry={entry}
              splitName={splitMap[entry.splitId] ?? `Training ${entry.splitId}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
