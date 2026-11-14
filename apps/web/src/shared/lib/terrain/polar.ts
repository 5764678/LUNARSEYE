/**
 * South polar stereographic display math for the terrain scene (sphere R = 1 737 400 m,
 * MOON_ME). Mirrors lunareyes_science.terrain.polar_stereographic: map x toward 90°E, map y
 * toward 0°E, true scale at the pole.
 *
 * Local scene frame (three.js Y-up) centred on the south pole on the reference sphere:
 *     local = (x_me, −(z_me + R), y_me)
 * a proper rotation of MOON_ME in which "up" at the pole is +Y. Unit: kilometres.
 */
import type { Vec3 } from "@/shared/lib/geo/selenographic";

export const REFERENCE_RADIUS_M = 1_737_400;

/** MOON_ME position (m) of a map-plane point at `heightM` above the sphere. */
export function mapToMoonMe(mapXM: number, mapYM: number, heightM: number): Vec3 {
  const rho = Math.hypot(mapXM, mapYM);
  const colatitude = 2 * Math.atan(rho / (2 * REFERENCE_RADIUS_M));
  const lon = rho === 0 ? 0 : Math.atan2(mapXM, mapYM);
  const r = REFERENCE_RADIUS_M + heightM;
  const horizontal = r * Math.sin(colatitude);
  return [horizontal * Math.cos(lon), horizontal * Math.sin(lon), -r * Math.cos(colatitude)];
}

/** Map-plane coordinates (m) of a planetocentric point in the southern hemisphere. */
export function latLonToMap(latDeg: number, lonDeg: number): [number, number] {
  const colatitude = ((90 + latDeg) * Math.PI) / 180;
  const rho = 2 * REFERENCE_RADIUS_M * Math.tan(colatitude / 2);
  const lon = (lonDeg * Math.PI) / 180;
  return [rho * Math.sin(lon), rho * Math.cos(lon)];
}

/** MOON_ME metres → local scene kilometres (positions). */
export function moonMeToLocalKm([x, y, z]: Vec3): Vec3 {
  return [x / 1000, -(z + REFERENCE_RADIUS_M) / 1000, y / 1000];
}

/** MOON_ME direction → local scene direction (same rotation, no translation). */
export function directionToLocal([x, y, z]: Vec3): Vec3 {
  return [x, -z, y];
}

/** Bilinear height (m) at a map point from the scene grid; null outside it or on nodata. */
export function sceneHeightAt(
  heights: ReadonlyArray<number | null>,
  gridSize: number,
  halfExtentM: number,
  mapXM: number,
  mapYM: number,
): number | null {
  const spacing = (2 * halfExtentM) / (gridSize - 1);
  const col = (mapXM + halfExtentM) / spacing;
  const row = (halfExtentM - mapYM) / spacing;
  if (col < 0 || row < 0 || col > gridSize - 1 || row > gridSize - 1) return null;
  const c0 = Math.min(gridSize - 2, Math.floor(col));
  const r0 = Math.min(gridSize - 2, Math.floor(row));
  const fc = col - c0;
  const fr = row - r0;
  const at = (r: number, c: number) => heights[r * gridSize + c];
  const a = at(r0, c0);
  const b = at(r0, c0 + 1);
  const c = at(r0 + 1, c0);
  const d = at(r0 + 1, c0 + 1);
  if (a == null || b == null || c == null || d == null) return null;
  return a * (1 - fc) * (1 - fr) + b * fc * (1 - fr) + c * (1 - fc) * fr + d * fc * fr;
}
