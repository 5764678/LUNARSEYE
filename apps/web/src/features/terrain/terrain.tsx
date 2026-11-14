"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";

import { TimeControls } from "@/features/time/controls";
import { describeError, type Evidence, type SiteTerrain } from "@/shared/api/client";
import {
  useSelectedSite,
  useSiteTerrain,
  useSun,
  useTerrainScene,
  useTimeline,
} from "@/shared/api/queries";
import { deg, pct } from "@/shared/lib/format";
import { formatLatitude, formatLongitude } from "@/shared/lib/geo/selenographic";
import { globeSunAt, type GlobeSunSeries } from "@/shared/lib/globe/sun";
import { directionToLocal } from "@/shared/lib/terrain/polar";
import { clamp } from "@/shared/lib/time/time";
import { useTime } from "@/shared/state/time";
import { useMissionUrl } from "@/shared/state/url";
import { EvidenceBadge } from "@/shared/ui/evidence";

const TerrainScene = dynamic(() => import("@/viewport/terrain-scene"), {
  ssr: false,
  loading: () => <div className="globe-loading">Loading the terrain scene…</div>,
});

const GRID_SIZE = 384;
const EXAGGERATIONS = [1, 2, 4];

function Row({
  label,
  value,
  note,
  evidence,
}: {
  label: string;
  value: string | null;
  note?: ReactNode;
  evidence: Evidence | null;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>
        {value ?? "not computed"}{" "}
        <EvidenceBadge title={label} evidence={value === null ? null : evidence} value={value ?? undefined} />
      </td>
      <td className="dim small">{note}</td>
    </tr>
  );
}

const num = (value: number | null | undefined, digits: number, unit: string) =>
  value == null ? null : `${value.toFixed(digits)} ${unit}`;

function parseThreshold(text: string): number | null {
  const value = Number(text);
  return text.trim() !== "" && Number.isFinite(value) && value > 0 ? value : null;
}

function Analysis({ data }: { data: SiteTerrain }) {
  const fp = data.footprint;
  const e = data.evidence;
  return (
    <>
      <table className="data">
        <tbody>
          <Row label="Height at site" value={num(data.height_m, 1, "m")} note="above the 1737.4 km sphere, bilinear" evidence={e} />
          <Row
            label="Slope at site"
            value={num(data.slope_at_site.slope_deg, 2, "°")}
            note={`baseline ${data.slope_at_site.baseline_m.toFixed(0)} m`}
            evidence={e}
          />
          <Row
            label="Footprint slope, mean"
            value={num(fp.slope_mean_deg, 2, "°")}
            note={`baseline ${fp.slope_baseline_m.toFixed(0)} m`}
            evidence={e}
          />
          <Row
            label="Footprint slope, 95th percentile"
            value={num(fp.slope_p95_deg, 2, "°")}
            note={`baseline ${fp.slope_baseline_m.toFixed(0)} m`}
            evidence={e}
          />
          <Row
            label="Footprint slope, max"
            value={num(fp.slope_max_deg, 2, "°")}
            note={`baseline ${fp.slope_baseline_m.toFixed(0)} m`}
            evidence={e}
          />
          <Row
            label="Roughness (RMS about best-fit plane)"
            value={num(fp.roughness_rms_m, 2, "m")}
            note={`baseline ${fp.roughness_baseline_m.toFixed(0)} m`}
            evidence={e}
          />
          <Row
            label="Footprint height range"
            value={`${fp.height_min_m.toFixed(1)} … ${fp.height_max_m.toFixed(1)} m`}
            note={`${fp.cell_count} cells, ${fp.missing_cell_count} missing`}
            evidence={e}
          />
        </tbody>
      </table>
      <p className="dim small">
        DEM window: {data.dem.title}, {data.dem.resolution_m} m,{" "}
        {data.dem.window_col_row_width_height[2]}×{data.dem.window_col_row_width_height[3]} px,{" "}
        {data.dem.served_from_cache
          ? "served from the local window cache"
          : `${(data.dem.bytes_requested / 1e6).toFixed(1)} MB requested over HTTP ranges`}
        . ETag {data.dem.etag ?? "none"}.
      </p>
    </>
  );
}

export function Terrain() {
  const { window, setParams } = useMissionUrl();
  const { sites, siteId, site } = useSelectedSite();
  const [radiusText, setRadiusText] = useState("50");
  const [slopeText, setSlopeText] = useState("");
  const [roughnessText, setRoughnessText] = useState("");
  const [exaggeration, setExaggeration] = useState(1);

  const radius = clamp(parseThreshold(radiusText) ?? 50, 20, 2000);
  const maxSlope = parseThreshold(slopeText);
  const maxRoughness = parseThreshold(roughnessText);
  const terrain = useSiteTerrain(siteId, {
    footprintRadiusM: radius,
    maxSlopeDeg: maxSlope !== null && maxSlope < 90 ? maxSlope : null,
    maxRoughnessM: maxRoughness,
  });
  const scene = useTerrainScene(GRID_SIZE);
  const sun = useSun(window);
  const timeline = useTimeline(siteId, window);
  const epochMs = useTime((s) => s.epochMs) ?? window.startMs;

  const grid = useMemo(
    () =>
      scene.data
        ? { gridSize: scene.data.grid_size, halfExtentM: scene.data.half_extent_m, heights: scene.data.heights_m }
        : null,
    [scene.data],
  );
  const sunSeries = useMemo((): GlobeSunSeries | null => {
    if (!sun.data) return null;
    return {
      directions: {
        epochsMs: sun.data.epochs_utc.map((t) => Date.parse(t)),
        directions: sun.data.direction_moon_me as unknown as Array<readonly [number, number, number]>,
        elevationDeg: [],
        azimuthDeg: [],
      },
      subsolarLatDeg: sun.data.subsolar_latitude_deg,
      subsolarLonDeg: sun.data.subsolar_longitude_deg,
    };
  }, [sun.data]);
  const sunLocal = useMemo(() => {
    const now = sunSeries ? globeSunAt(sunSeries, epochMs) : null;
    return now ? directionToLocal(now.direction) : null;
  }, [sunSeries, epochMs]);

  const t = timeline.data;
  const index = t ? clamp(Math.round((epochMs - window.startMs) / (t.step_s * 1000)), 0, t.sample_count - 1) : 0;
  const hazard = terrain.data?.hazard ?? null;

  return (
    <div className="terrain-page">
      <div className="terrain-view">
        {scene.isError ? <p className="error pad">{describeError(scene.error)}</p> : null}
        {grid ? (
          <TerrainScene
            grid={grid}
            sites={sites.data?.sites ?? []}
            selectedId={siteId}
            onSelect={(id) => setParams({ site: id })}
            sunLocal={sunLocal}
            exaggeration={exaggeration}
          />
        ) : !scene.isError ? (
          <div className="globe-loading">Building the south-pole terrain…</div>
        ) : null}
        <div className="hud">
          <div>
            <b>South-pole terrain</b> ±125 km, LOLA 240 m{" "}
            <EvidenceBadge title="South-pole terrain mesh" evidence={scene.data?.evidence} />
          </div>
          <div>
            <b>Light</b> SPICE Sun direction{" "}
            <EvidenceBadge title="Sun direction lighting the terrain" evidence={sun.data?.evidence} />
          </div>
          <div className="dim">
            Shading and shadows are drawn by the 3D engine: <b>an illustration</b>, not a
            measurement.{exaggeration > 1 ? ` Relief is exaggerated ${exaggeration}×, which also changes the drawn shadows.` : ""}
          </div>
          {site && t ? (
            <div>
              <b className="sun-text">◎ {site.name}</b> computed: Sun elevation{" "}
              {deg(t.sun.elevation_deg[index]!)}{" "}
              <EvidenceBadge title="Sun azimuth and elevation" evidence={t.sun.geometry_evidence} />, visible
              Sun disc{" "}
              {t.sun.terrain_visible_fraction
                ? `${t.sun.terrain_truncated?.[index] ? "≤ " : ""}${pct(t.sun.terrain_visible_fraction[index]!)}`
                : "not computed"}{" "}
              <EvidenceBadge
                title="Visible Sun disc (terrain horizon)"
                evidence={t.sun.terrain_visible_fraction ? t.sun.evidence : null}
              />
            </div>
          ) : null}
        </div>
        <div className="scene-tools segmented" role="group" aria-label="Vertical exaggeration">
          {EXAGGERATIONS.map((value) => (
            <button
              key={value}
              type="button"
              className={value === exaggeration ? "on" : ""}
              onClick={() => setExaggeration(value)}
            >
              relief {value}×
            </button>
          ))}
        </div>
      </div>

      <div className="page">
        <TimeControls />
        <div className="cols">
          <div className="card">
            <div className="panel-head">
              <h2>Terrain at {site?.name ?? "the site"}</h2>
              {site ? (
                <span className="mono dim">
                  {formatLatitude(site.latitude_deg)} · {formatLongitude(site.longitude_deg)}
                </span>
              ) : null}
            </div>
            {terrain.isError ? (
              <p className="error">N/C · {describeError(terrain.error)}</p>
            ) : terrain.data ? (
              <Analysis data={terrain.data} />
            ) : (
              <p className="dim">
                Reading a window of the PGDA 20 m DEM over HTTP byte ranges. The first read
                for a site takes about 10–15 s; after that it is cached.
              </p>
            )}
            {terrain.isFetching && terrain.data ? <p className="dim small">Updating…</p> : null}
          </div>

          <div className="card">
            <h2>Your assumptions</h2>
            <p className="dim small">
              LUNAREYES ships no default “safe” slope or roughness. Flags appear only against
              thresholds you enter, and are labelled as assumptions.
            </p>
            <div className="form">
              <label>
                Footprint radius (m)
                <input inputMode="decimal" value={radiusText} onChange={(e) => setRadiusText(e.target.value)} />
                <span className="dim small">20 … 2000; sets the roughness baseline (2 × radius)</span>
              </label>
              <label>
                Max slope (°)
                <input inputMode="decimal" placeholder="none" value={slopeText} onChange={(e) => setSlopeText(e.target.value)} />
              </label>
              <label>
                Max roughness (m)
                <input inputMode="decimal" placeholder="none" value={roughnessText} onChange={(e) => setRoughnessText(e.target.value)} />
              </label>
            </div>
            {hazard ? (
              <table className="data">
                <tbody>
                  {hazard.max_slope_deg != null ? (
                    <>
                      <tr>
                        <th scope="row">95th-percentile slope vs {hazard.max_slope_deg}°</th>
                        <td className={hazard.slope_p95_exceeds ? "flag bad" : "flag good"}>
                          {hazard.slope_p95_exceeds === null
                            ? "not computed"
                            : hazard.slope_p95_exceeds
                              ? "exceeds"
                              : "within"}{" "}
                          <EvidenceBadge title="Slope flag" evidence={hazard.evidence} />
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Footprint cells steeper than {hazard.max_slope_deg}°</th>
                        <td>
                          {hazard.slope_fraction_above == null ? "not computed" : pct(hazard.slope_fraction_above)}{" "}
                          <EvidenceBadge title="Cells above the slope threshold" evidence={hazard.evidence} />
                        </td>
                      </tr>
                    </>
                  ) : null}
                  {hazard.max_roughness_m != null ? (
                    <tr>
                      <th scope="row">Roughness vs {hazard.max_roughness_m} m</th>
                      <td className={hazard.roughness_exceeds ? "flag bad" : "flag good"}>
                        {hazard.roughness_exceeds === null
                          ? "not computed"
                          : hazard.roughness_exceeds
                            ? "exceeds"
                            : "within"}{" "}
                        <EvidenceBadge title="Roughness flag" evidence={hazard.evidence} />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            ) : (
              <p className="dim small">No thresholds entered: no hazard flag is computed.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
