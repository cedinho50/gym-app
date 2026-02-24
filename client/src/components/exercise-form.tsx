import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExerciseSchema, type InsertExercise, type WorkoutSplit } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ExerciseFormProps {
  initialData?: Partial<InsertExercise>;
  splits?: WorkoutSplit[];
  defaultSplitId?: number;
  onSubmit: (data: InsertExercise) => void;
  isPending: boolean;
  onCancel: () => void;
}

export function ExerciseForm({ initialData, splits, defaultSplitId, onSubmit, isPending, onCancel }: ExerciseFormProps) {
  const form = useForm<InsertExercise>({
    resolver: zodResolver(insertExerciseSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      splitId: initialData?.splitId ?? defaultSplitId ?? undefined,
      weight: initialData?.weight ?? "",
      isCompleted: initialData?.isCompleted ?? false,
      increaseNextTime: initialData?.increaseNextTime ?? false,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Übungsname
        </Label>
        <Input
          id="name"
          data-testid="input-exercise-name"
          {...form.register("name")}
          placeholder="z.B. Bankdrücken"
          className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white text-base"
          autoFocus
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="weight" className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Gewicht
        </Label>
        <Input
          id="weight"
          data-testid="input-exercise-weight"
          {...form.register("weight")}
          placeholder="z.B. 40 kg"
          className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white text-base"
        />
      </div>

      {splits && splits.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Training
          </Label>
          <Select
            value={form.watch("splitId")?.toString() ?? ""}
            onValueChange={(val) => form.setValue("splitId", Number(val))}
          >
            <SelectTrigger data-testid="select-split" className="h-11 rounded-xl border-gray-200 bg-gray-50">
              <SelectValue placeholder="Training wählen..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-gray-100">
              {splits.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()} className="rounded-xl">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="h-11 px-5 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100"
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          data-testid="button-submit-exercise"
          disabled={isPending}
          className="h-11 px-7 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold"
        >
          {isPending ? "Speichern..." : initialData?.name ? "Speichern" : "Hinzufügen"}
        </Button>
      </div>
    </form>
  );
}
