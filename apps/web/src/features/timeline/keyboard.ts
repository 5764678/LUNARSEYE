import { clamp, DAY_MS } from "@/shared/lib/time/time";

/**
 * Keyboard control of the timeline cursor (WAI-ARIA slider pattern): arrows move one
 * computed sample, Shift+arrows and Page Up/Down one day, Home/End the window edges.
 * Returns the new epoch, or null for a key the slider does not handle.
 */
export function nextEpoch(
  key: string,
  epochMs: number,
  startMs: number,
  endMs: number,
  stepMs: number,
  shift = false,
): number | null {
  const small = shift ? DAY_MS : stepMs;
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return clamp(epochMs + small, startMs, endMs);
    case "ArrowLeft":
    case "ArrowDown":
      return clamp(epochMs - small, startMs, endMs);
    case "PageUp":
      return clamp(epochMs + DAY_MS, startMs, endMs);
    case "PageDown":
      return clamp(epochMs - DAY_MS, startMs, endMs);
    case "Home":
      return startMs;
    case "End":
      return endMs;
    default:
      return null;
  }
}
