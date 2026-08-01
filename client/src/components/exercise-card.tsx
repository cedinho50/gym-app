import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, TrendingUp, Edit2, Trash2, MoreHorizontal, ArrowUpCircle } from "lucide-react";
import type { Exercise } from "@shared/schema";
import { TARGET_REPS, TARGET_SETS } from "@shared/constants";
import { useUpdateExercise, useDeleteExercise } from "@/hooks/use-exercises";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExerciseForm } from "./exercise-form";

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

// Aus den drei Eingabefeldern ein sauberes Zahlen-Array bauen und
// leere Felder am Ende abschneiden.
function commitFromInputs(inputs: string[]): number[] {
  const nums = inputs.map((v) => (v.trim() === "" ? null : Number(v)));
  let lastIdx = -1;
  nums.forEach((n, i) => { if (n !== null && !isNaN(n)) lastIdx = i; });
  if (lastIdx < 0) return [];
  return nums.slice(0, lastIdx + 1).map((n) => (n === null || isNaN(n) ? 0 : n));
}

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const updateMutation = useUpdateExercise();
  const deleteMutation = useDeleteExercise();
  const [isEditing, setIsEditing] = useState(false);

  // Lokale Eingabefelder fuer die drei Saetze, synchron mit dem Server-Stand.
  const [reps, setReps] = useState<string[]>(["", "", ""]);
  useEffect(() => {
    const nums = parseSets(exercise.sets);
    const base = ["", "", ""];
    nums.forEach((n, i) => { if (i < TARGET_SETS) base[i] = String(n); });
    setReps(base);
  }, [exercise.sets]);

  const [newWeight, setNewWeight] = useState(exercise.weight);
  useEffect(() => { setNewWeight(exercise.weight); }, [exercise.weight, exercise.increaseNextTime]);

  const setsNums = parseSets(exercise.sets);
  const reachedTarget = setsNums.length >= TARGET_SETS && setsNums[setsNums.length - 1] >= TARGET_REPS;

  const toggleComplete = () => {
    updateMutation.mutate({ id: exercise.id, updates: { isCompleted: !exercise.isCompleted } });
  };

  const toggleIncrease = () => {
    updateMutation.mutate({ id: exercise.id, updates: { increaseNextTime: !exercise.increaseNextTime } });
  };

  const handleRepChange = (index: number, value: string) => {
    const clean = value.replace(/[^0-9]/g, "").slice(0, 2);
    setReps((prev) => prev.map((v, i) => (i === index ? clean : v)));
  };

  const commitReps = () => {
    const nums = commitFromInputs(reps);
    updateMutation.mutate({ id: exercise.id, updates: { sets: JSON.stringify(nums) } });
  };

  // Neues Gewicht speichern: Markierung entfernen und Saetze zuruecksetzen.
  const confirmIncrease = () => {
    updateMutation.mutate({
      id: exercise.id,
      updates: { weight: newWeight, increaseNextTime: false, sets: "[]" },
    });
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        data-testid={`exercise-card-${exercise.id}`}
        className={`group relative p-5 mb-3 rounded-3xl border transition-all duration-200
          ${exercise.isCompleted
            ? "border-transparent bg-gray-50 shadow-none"
            : "border-gray-100 bg-white shadow-sm hover:shadow-md"
          }`}
      >
        {/* Kopfzeile: Haekchen, Name, Steigern-Schalter, Menue */}
        <div className="flex items-center gap-4">
          <button
            data-testid={`toggle-complete-${exercise.id}`}
            onClick={toggleComplete}
            className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300
              ${exercise.isCompleted
                ? "bg-gray-800 border-gray-800 text-white"
                : "border-gray-300 hover:border-gray-500 text-transparent"
              }`}
          >
            <Check strokeWidth={3} className="w-4 h-4" />
          </button>

          <div className={`flex-1 min-w-0 transition-opacity duration-200 ${exercise.isCompleted ? "opacity-40" : "opacity-100"}`}>
            <h3 className="text-base font-semibold truncate text-gray-900">{exercise.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {exercise.weight ? (
                <span className={`text-sm font-medium ${exercise.increaseNextTime ? "text-blue-600" : "text-gray-400"}`}>
                  {exercise.weight}
                </span>
              ) : (
                <span className="text-sm text-gray-300">Kein Gewicht</span>
              )}
              {exercise.increaseNextTime && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  <TrendingUp className="w-3 h-3" />
                  Steigern!
                </span>
              )}
            </div>
          </div>

          <button
            data-testid={`toggle-increase-${exercise.id}`}
            onClick={toggleIncrease}
            title="Gewicht nächstes Mal steigern"
            className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200
              ${exercise.increaseNextTime
                ? "bg-blue-50 text-blue-600 border border-blue-200 scale-110"
                : "text-gray-300 hover:text-gray-500 hover:bg-gray-50 border border-transparent"
              }`}
          >
            <TrendingUp strokeWidth={exercise.increaseNextTime ? 2.5 : 2} className="w-5 h-5" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid={`menu-${exercise.id}`}
                className="flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-2xl p-2 border-gray-100 shadow-lg">
              <DropdownMenuItem onClick={() => setIsEditing(true)} className="rounded-xl cursor-pointer py-2.5">
                <Edit2 className="w-4 h-4 mr-2 text-gray-400" />
                <span className="font-medium">Bearbeiten</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem
                onClick={() => deleteMutation.mutate(exercise.id)}
                className="rounded-xl cursor-pointer py-2.5 text-red-500 focus:text-red-500 focus:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <span className="font-medium">Löschen</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Saetze: drei Wiederholungs-Eingaben */}
        <div className={`mt-4 transition-opacity duration-200 ${exercise.isCompleted ? "opacity-40" : "opacity-100"}`}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-14 flex-shrink-0">Sätze</span>
            <div className="flex items-center gap-2 flex-1">
              {[0, 1, 2].map((i) => {
                const isLast = i === TARGET_SETS - 1;
                const val = Number(reps[i]);
                const done = reps[i] !== "" && !isNaN(val);
                const hit = isLast && done && val >= TARGET_REPS;
                return (
                  <div key={i} className="flex-1">
                    <Input
                      data-testid={`set-${exercise.id}-${i}`}
                      inputMode="numeric"
                      value={reps[i]}
                      onChange={(e) => handleRepChange(i, e.target.value)}
                      onBlur={commitReps}
                      placeholder={isLast ? "Ziel " + TARGET_REPS : "Wdh."}
                      className={`h-11 rounded-xl text-center text-base font-semibold border bg-gray-50 focus:bg-white
                        ${hit ? "border-blue-300 text-blue-600 bg-blue-50" : "border-gray-200 text-gray-800"}`}
                    />
                    <p className="text-[10px] text-center text-gray-300 mt-1">Satz {i + 1}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Steigern-Panel: neues Gewicht direkt eintragen */}
        {exercise.increaseNextTime && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpCircle className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-semibold text-blue-700">
                {reachedTarget ? `Ziel ${TARGET_REPS} erreicht. Neues Gewicht?` : "Nächstes Mal steigern. Neues Gewicht?"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                data-testid={`new-weight-${exercise.id}`}
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="z.B. 42.5 kg"
                className="h-10 rounded-xl border-blue-200 bg-white text-base flex-1"
              />
              <Button
                onClick={confirmIncrease}
                disabled={updateMutation.isPending}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold whitespace-nowrap"
              >
                Übernehmen
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl border-gray-100 p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold">{exercise.name} bearbeiten</DialogTitle>
          </DialogHeader>
          <ExerciseForm
            initialData={exercise}
            isPending={updateMutation.isPending}
            onCancel={() => setIsEditing(false)}
            onSubmit={(data) => {
              updateMutation.mutate({ id: exercise.id, updates: data }, {
                onSuccess: () => setIsEditing(false),
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
