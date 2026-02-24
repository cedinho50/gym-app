import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Check, X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSplits, useCreateSplit, useUpdateSplit, useDeleteSplit } from "@/hooks/use-splits";
import { useExercises, useCreateExercise, useUpdateExercise, useDeleteExercise, useReorderExercises } from "@/hooks/use-exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExerciseForm } from "@/components/exercise-form";
import type { WorkoutSplit, Exercise } from "@shared/schema";

function SortableExerciseRow({
  exercise,
  onEdit,
  onDelete,
}: {
  exercise: Exercise;
  onEdit: (ex: Exercise) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-2.5 border-b border-gray-50 last:border-0 bg-white ${isDragging ? "shadow-lg rounded-xl" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 touch-none cursor-grab active:cursor-grabbing p-1"
        aria-label="Ziehen zum Sortieren"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{exercise.name}</p>
        <p className="text-xs text-gray-400">{exercise.weight || "Kein Gewicht"}</p>
      </div>

      <button
        onClick={() => onEdit(exercise)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onDelete(exercise.id)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function SplitSection({ split }: { split: WorkoutSplit }) {
  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(split.name);
  const [addOpen, setAddOpen] = useState(false);
  const [editExercise, setEditExercise] = useState<Exercise | null>(null);

  const updateSplit = useUpdateSplit();
  const deleteSplit = useDeleteSplit();
  const { data: exercises = [] } = useExercises(split.id);
  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise();
  const deleteExercise = useDeleteExercise();
  const reorderExercises = useReorderExercises();

  const [localOrder, setLocalOrder] = useState<number[] | null>(null);
  const orderedExercises = localOrder
    ? localOrder.map((id) => exercises.find((e) => e.id === id)!).filter(Boolean)
    : exercises;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedExercises.findIndex((e) => e.id === active.id);
    const newIndex = orderedExercises.findIndex((e) => e.id === over.id);
    const newOrder = arrayMove(orderedExercises, oldIndex, newIndex).map((e) => e.id);

    setLocalOrder(newOrder);
    reorderExercises.mutate({ splitId: split.id, orderedIds: newOrder }, {
      onSuccess: () => setLocalOrder(null),
    });
  };

  const handleSaveName = () => {
    if (nameValue.trim() && nameValue !== split.name) {
      updateSplit.mutate({ id: split.id, updates: { name: nameValue.trim() } });
    }
    setEditingName(false);
  };

  return (
    <div className="border border-gray-100 rounded-3xl bg-white overflow-hidden">
      {/* Split Header */}
      <div className="px-5 py-4 flex items-center gap-3">
        {editingName ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="h-9 rounded-xl border-gray-200 bg-gray-50 text-sm font-semibold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") setEditingName(false);
              }}
            />
            <button onClick={handleSaveName} className="text-emerald-500 hover:text-emerald-600 transition-colors">
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setEditingName(false); setNameValue(split.name); }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <button onClick={() => setOpen(!open)} className="flex-1 text-left font-semibold text-gray-900">
              {split.name}
            </button>
            <button
              onClick={() => setEditingName(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => deleteSplit.mutate(split.id)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            >
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </>
        )}
      </div>

      {/* Exercises list with drag-and-drop */}
      {open && (
        <div className="border-t border-gray-100 px-5 py-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={orderedExercises.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <AnimatePresence>
                {orderedExercises.map((ex) => (
                  <SortableExerciseRow
                    key={ex.id}
                    exercise={ex}
                    onEdit={setEditExercise}
                    onDelete={(id) => deleteExercise.mutate(id)}
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
          </DndContext>

          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 py-2.5 transition-colors w-full mt-1"
          >
            <Plus className="w-4 h-4" />
            Übung hinzufügen
          </button>
        </div>
      )}

      {/* Add exercise dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl border-gray-100 p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold">Übung zu {split.name}</DialogTitle>
          </DialogHeader>
          <ExerciseForm
            defaultSplitId={split.id}
            isPending={createExercise.isPending}
            onCancel={() => setAddOpen(false)}
            onSubmit={(data) => {
              createExercise.mutate({ ...data, splitId: split.id }, {
                onSuccess: () => setAddOpen(false),
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit exercise dialog */}
      <Dialog open={!!editExercise} onOpenChange={(v) => !v && setEditExercise(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl border-gray-100 p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold">{editExercise?.name} bearbeiten</DialogTitle>
          </DialogHeader>
          {editExercise && (
            <ExerciseForm
              initialData={editExercise}
              isPending={updateExercise.isPending}
              onCancel={() => setEditExercise(null)}
              onSubmit={(data) => {
                updateExercise.mutate({ id: editExercise.id, updates: data }, {
                  onSuccess: () => setEditExercise(null),
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Settings() {
  const { data: splits = [], isLoading } = useSplits();
  const createSplit = useCreateSplit();
  const [addingSplit, setAddingSplit] = useState(false);
  const [newSplitName, setNewSplitName] = useState("");

  const handleCreateSplit = () => {
    if (!newSplitName.trim()) return;
    createSplit.mutate({ name: newSplitName.trim(), order: splits.length + 1 }, {
      onSuccess: () => { setNewSplitName(""); setAddingSplit(false); },
    });
  };

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
          <p className="text-sm text-gray-400">Trainings und Übungen verwalten</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-6 space-y-3">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Trainings</p>
          <button
            onClick={() => setAddingSplit(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neu
          </button>
        </div>

        {addingSplit && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 border border-gray-200 rounded-2xl bg-gray-50"
          >
            <Input
              value={newSplitName}
              onChange={(e) => setNewSplitName(e.target.value)}
              placeholder="z.B. Arme/Brust"
              className="flex-1 h-9 rounded-xl border-gray-200 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateSplit();
                if (e.key === "Escape") setAddingSplit(false);
              }}
            />
            <button onClick={handleCreateSplit} className="text-emerald-500 hover:text-emerald-600 transition-colors">
              <Check className="w-5 h-5" />
            </button>
            <button onClick={() => setAddingSplit(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {isLoading ? (
          <div className="text-center py-10 text-gray-300 text-sm">Laden...</div>
        ) : (
          splits.map((split) => <SplitSection key={split.id} split={split} />)
        )}
      </div>

      {/* Footer credit */}
      <div className="flex justify-center pt-8 pb-4">
        <p className="text-[11px] text-gray-300 tracking-wide">Erstellt by: Cedric Berli</p>
      </div>
    </div>
  );
}
