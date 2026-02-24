import { useQuery } from "@tanstack/react-query";
import type { WorkoutHistory } from "@shared/schema";

export function useHistory() {
  return useQuery<WorkoutHistory[]>({
    queryKey: ["/api/history"],
  });
}
