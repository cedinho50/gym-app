import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Plus, RotateCcw, Dumbbell } from "lucide-react";
import { useExercises, useCreateExercise, useResetWorkout } from "@/hooks/use-exercises";
import { ExerciseCard } from "@/components/exercise-card";
import { ExerciseForm } from "@/components/exercise-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: exercises, isLoading } = useExercises();
  const createMutation = useCreateExercise();
  const resetMutation = useResetWorkout();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Group exercises by category
  const groupedExercises = useMemo(() => {
    if (!exercises) return {};
    return exercises.reduce((acc, exercise) => {
      const cat = exercise.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(exercise);
      return acc;
    }, {} as Record<string, typeof exercises>);
  }, [exercises]);

  const categories = Object.keys(groupedExercises).sort();

  const handleReset = () => {
    resetMutation.mutate(undefined, {
      onSuccess: () => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.3 },
          colors: ['#2563EB', '#10B981', '#F59E0B']
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Dumbbell className="w-8 h-8 text-muted-foreground/30" />
        </motion.div>
      </div>
    );
  }

  const isEmpty = exercises?.length === 0;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Glass Header */}
      <header className="sticky top-0 z-50 glass-header px-6 py-4 flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)" }} className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Workout
          </h1>
          <p className="text-sm font-medium text-muted-foreground">Stay consistent</p>
        </div>
        
        {!isEmpty && (
          <Button 
            onClick={handleReset}
            disabled={resetMutation.isPending}
            variant="outline"
            className="rounded-xl border-border/50 shadow-sm hover:bg-secondary h-10 px-4 font-medium"
          >
            <RotateCcw className="w-4 h-4 mr-2 text-muted-foreground" />
            Reset Session
          </Button>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        {isEmpty ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center mt-32 p-8 rounded-[3rem] border border-dashed border-border bg-secondary/30"
          >
            <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
              <Dumbbell strokeWidth={1.5} className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)" }} className="text-2xl font-semibold mb-2">No exercises yet</h2>
            <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
              Create your minimal workout plan. Focus on the core movements and track your progressive overload.
            </p>
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="h-14 px-8 rounded-2xl bg-foreground hover:bg-foreground/90 text-background font-semibold shadow-xl shadow-black/5 text-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add First Exercise
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-12">
            <AnimatePresence mode="popLayout">
              {categories.map((category) => (
                <motion.section 
                  key={category}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h2 
                    style={{ fontFamily: "var(--font-display)" }} 
                    className="text-sm font-bold tracking-[0.2em] text-muted-foreground/70 uppercase mb-4 pl-2"
                  >
                    {category}
                  </h2>
                  <div className="space-y-1">
                    <AnimatePresence mode="popLayout">
                      {groupedExercises[category].map((exercise) => (
                        <ExerciseCard key={exercise.id} exercise={exercise} />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.section>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) */}
      {!isEmpty && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button className="fixed bottom-8 right-8 w-16 h-16 bg-foreground text-background rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 z-40">
              <Plus className="w-8 h-8" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-border/50 p-6">
            <DialogHeader className="mb-4">
              <DialogTitle style={{ fontFamily: "var(--font-display)" }} className="text-2xl font-semibold">
                New Exercise
              </DialogTitle>
            </DialogHeader>
            <ExerciseForm
              isPending={createMutation.isPending}
              onCancel={() => setIsCreateOpen(false)}
              onSubmit={(data) => {
                createMutation.mutate(data, {
                  onSuccess: () => setIsCreateOpen(false)
                });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
