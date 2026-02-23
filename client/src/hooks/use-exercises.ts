import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type ExerciseInput, type ExerciseUpdateInput } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useExercises() {
  return useQuery({
    queryKey: [api.exercises.list.path],
    queryFn: async () => {
      const res = await fetch(api.exercises.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch exercises");
      const data = await res.json();
      return parseWithLogging(api.exercises.list.responses[200], data, "exercises.list");
    },
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ExerciseInput) => {
      const validated = api.exercises.create.input.parse(data);
      const res = await fetch(api.exercises.create.path, {
        method: api.exercises.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create exercise");
      }
      
      const responseData = await res.json();
      return parseWithLogging(api.exercises.create.responses[201], responseData, "exercises.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.exercises.list.path] });
    },
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: ExerciseUpdateInput }) => {
      const validated = api.exercises.update.input.parse(updates);
      const url = buildUrl(api.exercises.update.path, { id });
      
      const res = await fetch(url, {
        method: api.exercises.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to update exercise");
      
      const data = await res.json();
      return parseWithLogging(api.exercises.update.responses[200], data, "exercises.update");
    },
    onMutate: async ({ id, updates }) => {
      // Optimistic update for better UX, especially for toggles
      await queryClient.cancelQueries({ queryKey: [api.exercises.list.path] });
      const previous = queryClient.getQueryData([api.exercises.list.path]);
      
      queryClient.setQueryData([api.exercises.list.path], (old: any) => {
        if (!old) return old;
        return old.map((ex: any) => 
          ex.id === id ? { ...ex, ...updates } : ex
        );
      });
      
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([api.exercises.list.path], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [api.exercises.list.path] });
    },
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.exercises.delete.path, { id });
      const res = await fetch(url, {
        method: api.exercises.delete.method,
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to delete exercise");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.exercises.list.path] });
    },
  });
}

export function useResetWorkout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.exercises.resetCompleted.path, {
        method: api.exercises.resetCompleted.method,
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to reset workout");
      const data = await res.json();
      return parseWithLogging(api.exercises.resetCompleted.responses[200], data, "exercises.reset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.exercises.list.path] });
    },
  });
}
