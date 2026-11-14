/**
 * API access. Types come from the generated contract (`./generated`, built from the
 * API's OpenAPI document with `npm run contracts:generate`). Requests go to `/api/*`,
 * which Next rewrites to the FastAPI service.
 */
import { BRAND } from "@/shared/brand";

import type {
  BodySeries,
  ErrorEnvelope,
  Dataset,
  DatasetList,
  Evidence,
  Health,
  HorizonMaskOut,
  HorizonSummary,
  SiteComparison,
  SiteList,
  SiteOut,
  SiteTerrain,
  SiteTimeline,
  SunDirection,
  TerrainScene,
} from "./generated";

export type {
  BodySeries,
  Dataset,
  DatasetList,
  Evidence,
  Health,
  HorizonMaskOut,
  HorizonSummary,
  SiteComparison,
  SiteList,
  SiteOut,
  SiteTerrain,
  SiteTimeline,
  SunDirection,
  TerrainScene,
};

/** Row-wise Sun series consumed by the carried `shared/lib/globe/sun.ts`. */
export interface SunDirectionSeries {
  samples: Array<{
    epoch_utc: string;
    direction_moon_me: number[];
    subsolar_latitude_deg: number;
    subsolar_longitude_deg: number;
  }>;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { signal, headers: { Accept: "application/json" } });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new ApiRequestError(`The ${BRAND} API is not reachable.`, 0, "network_error", null);
  }
  if (!response.ok) {
    const requestId = response.headers.get("X-Request-ID");
    let envelope: ErrorEnvelope | null = null;
    try {
      envelope = (await response.json()) as ErrorEnvelope;
    } catch {
      /* not JSON: fall through to the generic message */
    }
    throw new ApiRequestError(
      envelope?.error?.message ?? `Request failed (${response.status}).`,
      response.status,
      envelope?.error?.code ?? "http_error",
      envelope?.error?.request_id ?? requestId,
    );
  }
  return (await response.json()) as T;
}

export interface AnalysisWindow {
  startUtc: string;
  endUtc: string;
  stepS: number;
}

const windowQuery = (w: AnalysisWindow) =>
  `start_utc=${encodeURIComponent(w.startUtc)}&end_utc=${encodeURIComponent(w.endUtc)}&step_s=${w.stepS}`;

export const api = {
  health: (signal?: AbortSignal) => get<Health>("/health", signal),
  sites: (signal?: AbortSignal) => get<SiteList>("/v1/sites", signal),
  datasets: (signal?: AbortSignal) => get<DatasetList>("/v1/datasets", signal),
  timeline: (siteId: string, w: AnalysisWindow, signal?: AbortSignal) =>
    get<SiteTimeline>(`/v1/sites/${siteId}/timeline?${windowQuery(w)}`, signal),
  sun: (w: AnalysisWindow, signal?: AbortSignal) =>
    get<SunDirection>(`/v1/ephemeris/sun?${windowQuery(w)}`, signal),
  terrain: (siteId: string, p: TerrainParams, signal?: AbortSignal) => {
    const query = new URLSearchParams({ footprint_radius_m: String(p.footprintRadiusM) });
    if (p.maxSlopeDeg !== null) query.set("max_slope_deg", String(p.maxSlopeDeg));
    if (p.maxRoughnessM !== null) query.set("max_roughness_m", String(p.maxRoughnessM));
    return get<SiteTerrain>(`/v1/sites/${siteId}/terrain?${query}`, signal);
  },
  scene: (gridSize: number, signal?: AbortSignal) =>
    get<TerrainScene>(`/v1/terrain/scene?grid_size=${gridSize}`, signal),
  compare: (siteIds: string[], w: AnalysisWindow, mission: MissionAnswers, signal?: AbortSignal) =>
    get<SiteComparison>(
      `/v1/compare?site_ids=${siteIds.join(",")}&${windowQuery(w)}${missionQuery(mission)}`,
      signal,
    ),
};

export type Priority = "none" | "low" | "medium" | "high";

/** Answers to the mission questions on Compare; a null limit means "no limit". */
export interface MissionAnswers {
  power: Priority;
  comms: Priority;
  landing: Priority;
  maxSlopeDeg: number | null;
  maxDarknessD: number | null;
  maxEarthOutageD: number | null;
  minSunlitD: number | null;
}

/** Query-string tail for the mission answers; the API's defaults are left out. */
export function missionQuery(m: MissionAnswers): string {
  const parts: string[] = [];
  for (const need of ["power", "comms", "landing"] as const) {
    if (m[need] !== "medium") parts.push(`${need}=${m[need]}`);
  }
  const limits: Array<[string, number | null]> = [
    ["max_slope_deg", m.maxSlopeDeg],
    ["max_darkness_d", m.maxDarknessD],
    ["max_earth_outage_d", m.maxEarthOutageD],
    ["min_sunlit_d", m.minSunlitD],
  ];
  for (const [name, value] of limits) if (value !== null) parts.push(`${name}=${value}`);
  return parts.map((part) => `&${part}`).join("");
}

export interface TerrainParams {
  footprintRadiusM: number;
  /** User thresholds (assumptions); null = no hazard flag requested. */
  maxSlopeDeg: number | null;
  maxRoughnessM: number | null;
}

/** One query-key factory: every input of a request is part of its key. */
export const keys = {
  health: ["health"] as const,
  sites: ["sites"] as const,
  datasets: ["datasets"] as const,
  timeline: (siteId: string, w: AnalysisWindow) =>
    ["timeline", siteId, w.startUtc, w.endUtc, w.stepS] as const,
  sun: (w: AnalysisWindow) => ["sun", w.startUtc, w.endUtc, w.stepS] as const,
  terrain: (siteId: string, p: TerrainParams) =>
    ["terrain", siteId, p.footprintRadiusM, p.maxSlopeDeg, p.maxRoughnessM] as const,
  scene: (gridSize: number) => ["scene", gridSize] as const,
  compare: (siteIds: string[], w: AnalysisWindow, mission: MissionAnswers) =>
    ["compare", [...siteIds].sort().join(","), w.startUtc, w.endUtc, w.stepS, missionQuery(mission)] as const,
};

export function describeError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.requestId ? `${error.message} (request ${error.requestId})` : error.message;
  }
  return error instanceof Error ? error.message : "Unknown error.";
}
