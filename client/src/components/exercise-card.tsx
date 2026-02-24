import { useState } from "react";
import { motion } from "framer-motion";
import { Check, TrendingUp, Edit2, Trash2, MoreHorizontal } from "lucide-react";
import type { Exercise } from "@shared/schema";
import { useUpdateExercise, useDeleteExercise } from "@/hooks/use-exercises";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ExerciseForm } from "./exercise-form";

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const updateMutation = useUpdateExercise();
  const deleteMutation = useDeleteExercise();
  const [isEditing, setIsEditing] = useState(false);

  const toggleComplete = () => {
    updateMutation.mutate({ id: exercise.id, updates: { isCompleted: !exercise.isCompleted } });
  };

  const toggleIncrease = () => {
    updateMutation.mutate({ id: exercise.id, updates: { increaseNextTime: !exercise.increaseNextTime } });
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        data-testid={`exercise-card-${exercise.id}`}
        className={`group relative p-5 mb-3 rounded-3xl border flex items-center gap-4 transition-all duration-200
          ${exercise.isCompleted
            ? "border-transparent bg-gray-50 shadow-none"
            : "border-gray-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5"
          }`}
      >
        {/* Complete Toggle */}
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

        {/* Info */}
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

        {/* Increase Next Time Toggle */}
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

        {/* Options Menu */}
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
            <DropdownMenuItem
              onClick={() => setIsEditing(true)}
              className="rounded-xl cursor-pointer py-2.5"
            >
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
