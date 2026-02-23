import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, MoreHorizontal, TrendingUp, Edit2, Trash2 } from "lucide-react";
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
    updateMutation.mutate({
      id: exercise.id,
      updates: { isCompleted: !exercise.isCompleted },
    });
  };

  const toggleIncrease = () => {
    updateMutation.mutate({
      id: exercise.id,
      updates: { increaseNextTime: !exercise.increaseNextTime },
    });
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`
          group relative p-5 mb-4 rounded-3xl bg-card border card-hover flex items-center gap-4
          ${exercise.isCompleted ? 'border-transparent bg-secondary/30 shadow-none' : 'border-border/60 shadow-sm'}
        `}
      >
        {/* Complete Toggle */}
        <button
          onClick={toggleComplete}
          className={`
            flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300
            ${exercise.isCompleted 
              ? 'bg-foreground border-foreground text-background scale-95' 
              : 'border-muted-foreground/30 hover:border-foreground/40 hover:bg-secondary text-transparent'}
          `}
        >
          <Check strokeWidth={3} className="w-4 h-4" />
        </button>

        {/* Info */}
        <div className={`flex-1 min-w-0 transition-opacity duration-300 ${exercise.isCompleted ? 'opacity-50' : 'opacity-100'}`}>
          <h3 style={{ fontFamily: "var(--font-display)" }} className="text-xl font-semibold truncate text-foreground">
            {exercise.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {exercise.weight || "No weight set"}
          </p>
        </div>

        {/* Increase Next Time Button */}
        <button
          onClick={toggleIncrease}
          title="Increase weight next time"
          className={`
            flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
            ${exercise.increaseNextTime 
              ? 'bg-blue-50 text-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.15)] scale-110 border border-blue-200' 
              : 'text-muted-foreground/40 hover:text-foreground/60 hover:bg-secondary/80 border border-transparent'}
          `}
        >
          <TrendingUp strokeWidth={exercise.increaseNextTime ? 2.5 : 2} className="w-5 h-5" />
        </button>

        {/* Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-secondary transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 border-border/50 shadow-xl shadow-black/5">
            <DropdownMenuItem 
              onClick={() => setIsEditing(true)}
              className="rounded-xl focus:bg-secondary cursor-pointer py-2.5"
            >
              <Edit2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="font-medium">Edit Exercise</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/40" />
            <DropdownMenuItem 
              onClick={() => deleteMutation.mutate(exercise.id)}
              className="rounded-xl focus:bg-destructive/10 focus:text-destructive cursor-pointer py-2.5 text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span className="font-medium">Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-border/50 p-6">
          <DialogHeader className="mb-4">
            <DialogTitle style={{ fontFamily: "var(--font-display)" }} className="text-2xl font-semibold">
              Edit {exercise.name}
            </DialogTitle>
          </DialogHeader>
          <ExerciseForm
            initialData={exercise}
            isPending={updateMutation.isPending}
            onCancel={() => setIsEditing(false)}
            onSubmit={(data) => {
              updateMutation.mutate({ id: exercise.id, updates: data }, {
                onSuccess: () => setIsEditing(false)
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
