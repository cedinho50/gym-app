import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Exercise, InsertExercise } from "@shared/schema";

export function useExercises(splitId?: number) {
  const url = splitId ? `/api/exercises?splitId=${splitId}` : "/api/exercises";
  return useQuery<Exercise[]>({
    queryKey: splitId ? ["/api/exercises", splitId] : ["/api/exercises"],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Fehler beim Laden");
      return res.json();
    },
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertExercise) => {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fehler beim Erstellen");
      return res.json() as Promise<Exercise>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
    },
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<InsertExercise> }) => {
      const res = await fetch(`/api/exercises/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fehler beim Aktualisieren");
      return res.json() as Promise<Exercise>;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/exercises"] });
      const previous = queryClient.getQueriesData({ queryKey: ["/api/exercises"] });
      queryClient.setQueriesData({ queryKey: ["/api/exercises"] }, (old: any) => {
        if (!old) return old;
        return old.map((ex: Exercise) => ex.id === id ? { ...ex, ...updates } : ex);
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
    },
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/exercises/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fehler beim Löschen");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/exercises"] }),
  });
}

export function useFinishWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (splitId: number) => {
      const res = await fetch("/api/workout/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ splitId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fehler beim Abschließen");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
    },
  });
}
