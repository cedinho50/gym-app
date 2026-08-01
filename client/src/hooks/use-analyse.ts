import { useMutation } from "@tanstack/react-query";

interface AnalyseResult {
  summary: string;
  model?: string;
  url?: string;
}

// Startet die KI-Analyse (Ollama auf dem Raspberry).
export function useAnalyse() {
  return useMutation<AnalyseResult, Error>({
    mutationFn: async () => {
      const res = await fetch("/api/analyse", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "KI-Analyse fehlgeschlagen");
      return data as AnalyseResult;
    },
  });
}

// Holt den Markdown-Bericht und laedt ihn als Datei herunter.
export function useExportReport() {
  return useMutation<void, Error>({
    mutationFn: async () => {
      const res = await fetch("/api/export", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Export fehlgeschlagen");
      const markdown: string = data.markdown ?? "";
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `gym-bericht-${stamp}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
