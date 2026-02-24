import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { useHistory } from "@/hooks/use-history";
import { useSplits } from "@/hooks/use-splits";
import type { WorkoutHistory, Exercise } from "@shared/schema";

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
          {exercises.map((ex) => (
            <div key={ex.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">{ex.name}</span>
                {ex.increaseNextTime && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                    <TrendingUp className="w-2.5 h-2.5" />
                    Steigern
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-400">{ex.weight || "–"}</span>
            </div>
          ))}
        </motion.div>
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
