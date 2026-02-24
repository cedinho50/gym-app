import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkoutSplit, InsertWorkoutSplit } from "@shared/schema";

export function useSplits() {
  return useQuery<WorkoutSplit[]>({
    queryKey: ["/api/splits"],
  });
}

export function useCreateSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertWorkoutSplit) => {
      const res = await fetch("/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fehler beim Erstellen");
      return res.json() as Promise<WorkoutSplit>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/splits"] }),
  });
}

export function useUpdateSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<InsertWorkoutSplit> }) => {
      const res = await fetch(`/api/splits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fehler beim Aktualisieren");
      return res.json() as Promise<WorkoutSplit>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/splits"] }),
  });
}

export function useDeleteSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/splits/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fehler beim Löschen");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/splits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
    },
  });
}
