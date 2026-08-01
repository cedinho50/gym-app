// ------------------------------------------------------------------
// Ollama-Anbindung fuer die Trainings-Analyse.
// Gleiches Muster wie im Projekt "Betriebslage": lokaler Ollama-Server
// auf dem Raspberry, Aufruf per HTTP POST auf /api/generate.
// Der Pi macht die rechenintensive Zusammenfassung, damit die kleine
// Hardware entlastet bleibt.
// ------------------------------------------------------------------

const OLLAMA_URL = process.env.OLLAMA_URL || "http://192.168.1.169:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";

// Wie lange darf der Pi maximal rechnen, bevor wir abbrechen.
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 90000);

export function ollamaInfo() {
  return { url: OLLAMA_URL, model: OLLAMA_MODEL };
}

// Schickt einen fertig aufbereiteten Text an Ollama und bekommt eine
// kurze, sprachliche Zusammenfassung zurueck. Wirft bei Fehler/Timeout.
export async function analyzeTraining(inputText: string): Promise<string> {
  const prompt = buildAnalysePrompt(inputText);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 320,
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("Ollama HTTP " + res.status);
    const data: any = await res.json();
    const answer = String(data.response || "").trim();
    if (!answer) throw new Error("Ollama hat keine Antwort geliefert");
    return answer;
  } finally {
    clearTimeout(timer);
  }
}

// Prueft schnell, ob der Ollama-Server ueberhaupt erreichbar ist.
export async function ollamaReachable(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function buildAnalysePrompt(inputText: string): string {
  return (
    "Du bist ein knapper, sachlicher Trainingsassistent. " +
    "Der Nutzer trainiert nach der Regel: 3 Saetze pro Uebung, Ziel 10 Wiederholungen. " +
    "Das Gewicht ist so gewaehlt, dass im letzten Satz zuerst nur etwa 6 Wiederholungen moeglich sind. " +
    "Sobald der letzte Satz 10 Wiederholungen erreicht, wird das Gewicht erhoeht. " +
    "Analysiere die folgenden Trainingsdaten. " +
    "Nenne kurz: Uebungen mit gutem Fortschritt, Uebungen mit Stillstand ueber mehrere Trainings, " +
    "und bei welchen Uebungen eine Gewichtserhoehung faellig oder fast faellig ist. " +
    "Antworte auf Deutsch, in hoechstens 8 kurzen Saetzen, ohne Aufzaehlungszeichen. " +
    "Trainingsdaten:\n\n" +
    inputText.slice(0, 6000) +
    "\n\nZusammenfassung:"
  );
}
