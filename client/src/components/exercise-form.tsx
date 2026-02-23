import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExerciseSchema, type InsertExercise } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface ExerciseFormProps {
  initialData?: Partial<InsertExercise>;
  onSubmit: (data: InsertExercise) => void;
  isPending: boolean;
  onCancel: () => void;
}

export function ExerciseForm({ initialData, onSubmit, isPending, onCancel }: ExerciseFormProps) {
  const form = useForm<InsertExercise>({
    resolver: zodResolver(insertExerciseSchema),
    defaultValues: {
      name: initialData?.name || "",
      category: initialData?.category || "General",
      weight: initialData?.weight || "",
      isCompleted: initialData?.isCompleted || false,
      increaseNextTime: initialData?.increaseNextTime || false,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
          Exercise Name
        </Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="e.g. Bench Press"
          className="h-12 rounded-xl border-border/50 bg-secondary/50 focus:bg-background transition-colors text-lg"
          autoFocus
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="weight" className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
            Weight
          </Label>
          <Input
            id="weight"
            {...form.register("weight")}
            placeholder="e.g. 60 kg"
            className="h-12 rounded-xl border-border/50 bg-secondary/50 focus:bg-background transition-colors text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
            Category
          </Label>
          <Input
            id="category"
            {...form.register("category")}
            placeholder="e.g. Chest"
            className="h-12 rounded-xl border-border/50 bg-secondary/50 focus:bg-background transition-colors text-lg"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3 p-4 rounded-xl border border-border/30 bg-secondary/20">
        <Checkbox
          id="increaseNextTime"
          checked={form.watch("increaseNextTime")}
          onCheckedChange={(checked) => form.setValue("increaseNextTime", checked as boolean)}
          className="w-5 h-5 rounded-md border-muted-foreground/30 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
        />
        <Label 
          htmlFor="increaseNextTime" 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          Flag to increase weight next time
        </Label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="h-12 px-6 rounded-xl hover:bg-secondary/80 text-muted-foreground hover:text-foreground font-medium"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-12 px-8 rounded-xl bg-foreground hover:bg-foreground/90 text-background font-semibold shadow-lg shadow-black/5"
        >
          {isPending ? "Saving..." : initialData ? "Save Changes" : "Add Exercise"}
        </Button>
      </div>
    </form>
  );
}
