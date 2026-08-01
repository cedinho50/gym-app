import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Analysis {
  id: number;
  status: "pending" | "done" | "error";
  summary: string;
  model: string;
  createdAt: string;
  finishedAt: string | null;
}

export interface Reminder {
  id: number;
  remindAt: string;
  note: string;
  sentAt: string | null;
  createdAt: string;
}

// Startet eine KI-Analyse im Hintergrund.
export function useStartAnalyse() {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error>({
    mutationFn: async () => {
      const res = await fetch("/api/analyse", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Analyse konnte nicht gestartet werden");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyse/latest"] });
    },
  });
}

// Holt die letzte Analyse und pollt, solange sie laeuft.
export function useLatestAnalysis() {
  return useQuery<Analysis | null>({
    queryKey: ["/api/analyse/latest"],
    queryFn: async () => {
      const res = await fetch("/api/analyse/latest", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data as Analysis | null | undefined;
      return data && data.status === "pending" ? 3000 : false;
    },
  });
}

async function fetchReport(): Promise<string> {
  const res = await fetch("/api/export", { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Export fehlgeschlagen");
  return data.markdown ?? "";
}

// Laedt den Bericht als Text-Datei herunter (auf dem Handy als Text zu oeffnen).
export function useExportReport() {
  return useMutation<void, Error>({
    mutationFn: async () => {
      const text = await fetchReport();
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `gym-bericht-${stamp}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}

// Kopiert den Bericht direkt in die Zwischenablage (praktisch am Handy).
export function useCopyReport() {
  return useMutation<void, Error>({
    mutationFn: async () => {
      const text = await fetchReport();
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback fuer aeltere Browser
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    },
  });
}

// --- Erinnerungen ---
export function useReminder() {
  return useQuery<Reminder | null>({
    queryKey: ["/api/reminder"],
    queryFn: async () => {
      const res = await fetch("/api/reminder", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });
}

export function useSetReminder() {
  const queryClient = useQueryClient();
  return useMutation<Reminder, Error, { remindAt: string; note?: string }>({
    mutationFn: async (body) => {
      const res = await fetch("/api/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Erinnerung konnte nicht gesetzt werden");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/reminder"] }),
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/reminder/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erinnerung konnte nicht geloescht werden");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/reminder"] }),
  });
}
