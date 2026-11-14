export const pct = (fraction: number, digits = 1) => `${(fraction * 100).toFixed(digits)} %`;

export const deg = (value: number, digits = 2) =>
  `${value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}°`;

/** `5.7 d`, `13.2 h`; a censored run is a lower bound and is shown as "≥". */
export function duration(seconds: number, censored = false): string {
  const prefix = censored ? "≥ " : "";
  if (seconds === 0) return "none";
  if (seconds >= 2 * 86_400) return `${prefix}${(seconds / 86_400).toFixed(1)} d`;
  return `${prefix}${(seconds / 3_600).toFixed(1)} h`;
}
