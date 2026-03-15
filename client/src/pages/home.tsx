import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, ChevronLeft, CheckCircle2, TrendingUp, Plus, PartyPopper } from "lucide-react";
import { useSplits } from "@/hooks/use-splits";
import { useExercises, useUpdateExercise, useFinishWorkout } from "@/hooks/use-exercises";
import { useCreateExercise } from "@/hooks/use-exercises";
import { ExerciseCard } from "@/components/exercise-card";
import { ExerciseForm } from "@/components/exercise-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { WorkoutSplit } from "@shared/schema";

function SplitSelectionScreen({ splits, onSelect }: { splits: WorkoutSplit[]; onSelect: (split: WorkoutSplit) => void }) {
  const today = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  const splitColors = [
    { bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-500", pill: "bg-blue-100 text-blue-700" },
    { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-500", pill: "bg-emerald-100 text-emerald-700" },
    { bg: "bg-violet-50", border: "border-violet-100", icon: "text-violet-500", pill: "bg-violet-100 text-violet-700" },
  ];

  return (
    <div className="min-h-screen bg-white px-5 pt-14 pb-32">
      <div className="max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm font-medium text-gray-400 mb-1 capitalize">{today}</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Hallo!</h1>
          <p className="text-gray-400 mb-10">Welches Training machst du heute?</p>
        </motion.div>

        <div className="space-y-3">
          {splits.map((split, i) => {
            const color = splitColors[i % splitColors.length];
            return (
              <motion.button
                key={split.id}
                data-testid={`split-card-${split.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => onSelect(split)}
                className={`w-full text-left p-5 rounded-3xl border ${color.bg} ${color.border} transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.99]`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-2xl bg-white/70 flex items-center justify-center ${color.icon}`}>
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-base">{split.name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">Training {split.order}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WorkoutScreen({ split, onBack }: { split: WorkoutSplit; onBack: () => void }) {
  const { data: exercises = [], isLoading } = useExercises(split.id);
  const createMutation = useCreateExercise();
  const finishMutation = useFinishWorkout();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [allDonePromptShown, setAllDonePromptShown] = useState(false);

  const completed = exercises.filter((e) => e.isCompleted).length;
  const total = exercises.length;
  const allDone = total > 0 && completed === total;
  const hasIncreaseFlags = exercises.some((e) => e.increaseNextTime);

  // Auto-show finish dialog when all exercises become completed
  useEffect(() => {
    if (allDone && !allDonePromptShown && !finished && !isLoading) {
      setShowFinishDialog(true);
      setAllDonePromptShown(true);
    }
  }, [allDone, allDonePromptShown, finished, isLoading]);

  const handleFinish = () => {
    finishMutation.mutate(split.id, {
      onSuccess: () => {
        setShowFinishDialog(false);
        setFinished(true);
      },
    });
  };

  if (finished) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Training abgeschlossen!</h2>
          <p className="text-gray-400 mb-8">{split.name} wurde gespeichert.</p>
          <Button
            onClick={onBack}
            className="h-12 px-8 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-semibold"
          >
            Zurück zur Übersicht
          </Button>
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Dumbbell className="w-7 h-7 text-gray-300" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-36">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            data-testid="button-back"
            onClick={onBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">{split.name}</h1>
            <p className="text-xs text-gray-400">{completed}/{total} Übungen</p>
          </div>
          {hasIncreaseFlags && (
            <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
              <TrendingUp className="w-3.5 h-3.5" />
              Steigern!
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="max-w-md mx-auto mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${allDone ? "bg-emerald-500" : "bg-gray-800"}`}
            animate={{ width: total > 0 ? `${(completed / total) * 100}%` : "0%" }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* All-done reminder banner (when returning to already-completed workout) */}
      <AnimatePresence>
        {allDone && allDonePromptShown && !showFinishDialog && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-md mx-auto px-5 pt-4"
          >
            <button
              onClick={() => setShowFinishDialog(true)}
              className="w-full flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 text-left hover:bg-emerald-100 transition-colors"
            >
              <PartyPopper className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700">Alle Übungen erledigt!</p>
                <p className="text-xs text-emerald-600">Tippe hier um das Training zu speichern.</p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto px-5 pt-4">
        {exercises.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Dumbbell className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-400 mb-6">Noch keine Übungen in diesem Training.</p>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="h-11 px-6 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Übung hinzufügen
            </Button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {exercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-5 py-4 z-40">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            data-testid="button-add-exercise"
            onClick={() => setIsAddOpen(true)}
            className="w-12 h-12 rounded-2xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
          <Button
            data-testid="button-finish-workout"
            onClick={() => setShowFinishDialog(true)}
            disabled={finishMutation.isPending}
            className={`flex-1 h-12 rounded-2xl font-semibold text-base transition-all ${
              allDone
                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-100"
                : "bg-gray-900 hover:bg-gray-800 text-white"
            }`}
          >
            {allDone ? "✓ Training beenden" : "Training beenden"}
          </Button>
        </div>
      </div>

      {/* Finish confirmation dialog */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent className="sm:max-w-[360px] rounded-3xl border-gray-100 p-6 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <PartyPopper className="w-8 h-8 text-emerald-500" />
          </div>
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold text-gray-900">
              {allDone ? "Alle Übungen erledigt! 🎉" : "Training beenden?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400 mb-6">
            {allDone
              ? `${split.name} wird in der Historie gespeichert und die Übungen zurückgesetzt.`
              : `Nur ${completed} von ${total} Übungen erledigt. Trotzdem speichern?`}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFinishDialog(false)}
              className="flex-1 h-11 rounded-2xl border-gray-200 text-gray-600"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleFinish}
              disabled={finishMutation.isPending}
              className="flex-1 h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
            >
              {finishMutation.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Exercise Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl border-gray-100 p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold">Übung hinzufügen</DialogTitle>
          </DialogHeader>
          <ExerciseForm
            defaultSplitId={split.id}
            isPending={createMutation.isPending}
            onCancel={() => setIsAddOpen(false)}
            onSubmit={(data) => {
              createMutation.mutate({ ...data, splitId: split.id }, {
                onSuccess: () => setIsAddOpen(false),
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Home() {
  const { data: splits = [], isLoading } = useSplits();
  const [selectedSplit, setSelectedSplit] = useState<WorkoutSplit | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Dumbbell className="w-7 h-7 text-gray-300" />
        </motion.div>
      </div>
    );
  }

  if (selectedSplit) {
    return <WorkoutScreen split={selectedSplit} onBack={() => setSelectedSplit(null)} />;
  }

  return <SplitSelectionScreen splits={splits} onSelect={setSelectedSplit} />;
}
