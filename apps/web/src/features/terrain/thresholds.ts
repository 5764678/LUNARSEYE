/**
 * What the Terrain page actually applies for the three typed assumptions, and a plain
 * sentence whenever that differs from what was typed. Nothing is dropped or changed
 * silently: the page shows the note under the field.
 */
export const RADIUS_DEFAULT_M = 50;
export const RADIUS_MIN_M = 20;
export const RADIUS_MAX_M = 2000;
/** A slope limit must be below this; at or above it every cell would pass. */
export const SLOPE_LIMIT_MAX_DEG = 90;

export interface AppliedThresholds {
  radiusM: number;
  maxSlopeDeg: number | null;
  maxRoughnessM: number | null;
  radiusNote: string | null;
  slopeNote: string | null;
  roughnessNote: string | null;
}

function positive(text: string): number | null {
  const value = Number(text);
  return text.trim() !== "" && Number.isFinite(value) && value > 0 ? value : null;
}

export function interpretThresholds(
  radiusText: string,
  slopeText: string,
  roughnessText: string,
): AppliedThresholds {
  let radiusM = RADIUS_DEFAULT_M;
  let radiusNote: string | null = null;
  const radius = positive(radiusText);
  if (radius === null) {
    radiusNote = `${radiusText.trim() === "" ? "Empty" : "Not a positive number"}: using ${RADIUS_DEFAULT_M} m.`;
  } else if (radius < RADIUS_MIN_M) {
    radiusM = RADIUS_MIN_M;
    radiusNote = `Below the ${RADIUS_MIN_M} m minimum: using ${RADIUS_MIN_M} m.`;
  } else if (radius > RADIUS_MAX_M) {
    radiusM = RADIUS_MAX_M;
    radiusNote = `Above the ${RADIUS_MAX_M} m maximum: using ${RADIUS_MAX_M} m.`;
  } else {
    radiusM = radius;
  }

  let maxSlopeDeg: number | null = null;
  let slopeNote: string | null = null;
  if (slopeText.trim() !== "") {
    const slope = positive(slopeText);
    if (slope === null) slopeNote = "Not a positive number: no slope limit applied.";
    else if (slope >= SLOPE_LIMIT_MAX_DEG) slopeNote = `Must be below ${SLOPE_LIMIT_MAX_DEG}°: no slope limit applied.`;
    else maxSlopeDeg = slope;
  }

  let maxRoughnessM: number | null = null;
  let roughnessNote: string | null = null;
  if (roughnessText.trim() !== "") {
    const roughness = positive(roughnessText);
    if (roughness === null) roughnessNote = "Not a positive number: no roughness limit applied.";
    else maxRoughnessM = roughness;
  }

  return { radiusM, maxSlopeDeg, maxRoughnessM, radiusNote, slopeNote, roughnessNote };
}
