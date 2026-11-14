import type { AnalysisWindow } from "@/shared/api/client";
import { DAY_MS, toIsoUtc } from "@/shared/lib/time/time";

export type WindowId = "2027" | "90d" | "30d";

export const WINDOWS: Array<{ id: WindowId; label: string }> = [
  { id: "2027", label: "Year 2027" },
  { id: "90d", label: "90 days" },
  { id: "30d", label: "30 days" },
];

const START_2027 = Date.UTC(2027, 0, 1);

/** Hourly analysis windows starting 2027-01-01T00:00Z (the reference year). */
export function resolveWindow(id: WindowId): AnalysisWindow & { startMs: number; endMs: number } {
  const endMs =
    id === "2027" ? Date.UTC(2028, 0, 1) : START_2027 + (id === "90d" ? 90 : 30) * DAY_MS;
  return {
    startUtc: toIsoUtc(START_2027),
    endUtc: toIsoUtc(endMs),
    stepS: 3600,
    startMs: START_2027,
    endMs,
  };
}

export const isWindowId = (value: string | null): value is WindowId =>
  value === "2027" || value === "90d" || value === "30d";
