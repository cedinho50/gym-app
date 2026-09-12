// Zielwerte fuer die Steigerungs-Logik (Doppelprogression).
// Bewusst in einer eigenen, Drizzle-freien Datei, damit der Client diese
// Werte laden kann, ohne das ganze Datenmodell mitzubuendeln.
//
// 3 Saetze pro Uebung, und sobald der letzte Satz TARGET_REPS erreicht,
// ist eine Gewichtserhoehung faellig.
export const TARGET_SETS = 3;
export const TARGET_REPS = 10;

// Übung gilt als im Stillstand, wenn mehr als so viele aufeinanderfolgende
// Trainings weder Gewicht noch letzter Satz (Wdh.) gestiegen sind.
export const STAGNATION_THRESHOLD = 3;
