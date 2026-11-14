/** Row-wise sample shapes used by the carried display math (`shared/lib/{globe,terrain}`). */

export interface BodyGeometrySample {
  epoch_utc: string;
  azimuth_deg: number;
  elevation_deg: number;
  range_m: number;
  angular_radius_deg: number;
  direction_moon_me: number[];
}

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Parses an ISO 8601 UTC timestamp with a `Z` suffix (API convention) to epoch ms. */
export function parseUtc(value: string): number {
  if (!ISO_UTC.test(value)) throw new RangeError(`not an ISO 8601 UTC timestamp: ${value}`);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new RangeError(`invalid timestamp: ${value}`);
  return ms;
}
