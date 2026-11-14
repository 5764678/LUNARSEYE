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
import { BRAND } from "@/shared/brand";
import { deg, pct } from "@/shared/lib/format";
import { formatLatitude, formatLongitude } from "@/shared/lib/geo/selenographic";
import { globeSunAt, type GlobeSunSeries } from "@/shared/lib/globe/sun";
import { directionToLocal } from "@/shared/lib/terrain/polar";
import { clamp } from "@/shared/lib/time/time";
import { useTime } from "@/shared/state/time";
import { useMissionUrl } from "@/shared/state/url";
import { EvidenceBadge, EvidenceValue } from "@/shared/ui/evidence";
import { HudNote } from "@/shared/ui/hud-note";
import { Icon } from "@/shared/ui/icons";

import { interpretThresholds, RADIUS_DEFAULT_M, RADIUS_MAX_M, RADIUS_MIN_M } from "./thresholds";

const TerrainScene = dynamic(() => import("@/viewport/terrain-scene"), {
  ssr: false,
  loading: () => <div className="globe-loading">Loading the terrain scene…</div>,
});

const GRID_SIZE = 384;
const EXAGGERATIONS = [1, 2, 4];

const RADIUS_HINT = `${RADIUS_MIN_M} … ${RADIUS_MAX_M}; sets the roughness baseline (2 × radius)`;

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
      <td className="num">
        {value === null ? (
          <span className="dim">not computed</span>
        ) : (
          <EvidenceValue title={label} evidence={evidence} value={value} />
        )}
      </td>
      <td className="dim small">{note}</td>
    </tr>
  );
}

const num = (value: number | null | undefined, digits: number, unit: string) =>
  value == null ? null : `${value.toFixed(digits)} ${unit}`;

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn small" onClick={onClick}>
      Retry
    </button>
  );
}

function Analysis({ data }: { data: SiteTerrain }) {
  const fp = data.footprint;
  const e = data.evidence;
  return (
    <>
      <table className="data">
        <caption className="sr-only">Terrain at the site</caption>
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

/** A labelled number field. The helper text is replaced by the message once the field has been
 *  left (validate on blur), and `aria-describedby` ties either one to the input. */
function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  message,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  hint?: string;
  message: string | null;
}) {
  const [touched, setTouched] = useState(false);
  const showMessage = touched && message !== null;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        aria-invalid={showMessage}
        aria-describedby={`${id}-msg`}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setTouched(true)}
      />
      <span id={`${id}-msg`} className={showMessage ? "field-msg error" : "field-msg"}>
        {showMessage ? message : hint}
      </span>
    </div>
  );
}

export function Terrain() {
  const { window, setParams } = useMissionUrl();
  const { sites, siteId, site } = useSelectedSite();
  const [radiusText, setRadiusText] = useState(String(RADIUS_DEFAULT_M));
  const [slopeText, setSlopeText] = useState("");
  const [roughnessText, setRoughnessText] = useState("");
  const [exaggeration, setExaggeration] = useState(1);

  // What is applied can differ from what was typed (clamped, ignored): the field says so.
  const applied = interpretThresholds(radiusText, slopeText, roughnessText);
  const terrain = useSiteTerrain(siteId, {
    footprintRadiusM: applied.radiusM,
    maxSlopeDeg: applied.maxSlopeDeg,
    maxRoughnessM: applied.maxRoughnessM,
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

  const flagText = (exceeds: boolean | null) => (exceeds === null ? "not computed" : exceeds ? "exceeds" : "within");
  const flagClass = (exceeds: boolean | null) => (exceeds === null ? "num dim" : exceeds ? "num flag bad" : "num flag good");

  return (
    <div className="terrain-page">
      <h1 className="sr-only">Terrain{site ? ` · ${site.name}` : ""}</h1>
      <div className="terrain-view">
        <div className="viz-fill">
          {scene.isError ? (
            <p className="error pad">
              {describeError(scene.error)} <RetryButton onClick={() => void scene.refetch()} />
            </p>
          ) : null}
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
        </div>
        {/* The HUD and the relief toggle share one wrapping row, so on a narrow screen the
            toggle drops below the HUD instead of sitting on top of it. */}
        <div className="scene-overlay">
          <div className="hud">
            <div>
              <b>South-pole terrain</b> ±125 km, LOLA 240 m{" "}
              <EvidenceBadge title="South-pole terrain mesh" evidence={scene.data?.evidence} />
            </div>
            <div>
              <b>Light</b>{" "}
              {sun.isError ? (
                <>
                  <span className="error">
                    Sun direction unavailable: {describeError(sun.error)}. The terrain is drawn under flat
                    ambient light, not the Sun.
                  </span>{" "}
                  <RetryButton onClick={() => void sun.refetch()} />
                </>
              ) : sunLocal ? (
                "SPICE Sun direction"
              ) : (
                "computing the SPICE Sun direction…"
              )}{" "}
              <EvidenceBadge title="Sun direction lighting the terrain" evidence={sun.data?.evidence} />
            </div>
            {site && t ? (
              <div>
                <b>
                  <Icon name="site" /> {site.name}
                </b>{" "}
                computed: Sun elevation{" "}
                <EvidenceValue
                  title="Sun azimuth and elevation"
                  evidence={t.sun.geometry_evidence}
                  value={deg(t.sun.elevation_deg[index]!)}
                />
                , visible Sun disc{" "}
                {t.sun.terrain_visible_fraction ? (
                  <EvidenceValue
                    title="Visible Sun disc (terrain horizon)"
                    evidence={t.sun.evidence}
                    value={`${t.sun.terrain_truncated?.[index] ? "≤ " : ""}${pct(t.sun.terrain_visible_fraction[index]!)}`}
                  />
                ) : (
                  <span className="dim">not computed</span>
                )}
              </div>
            ) : site && timeline.isError ? (
              <div className="error">
                {site.name}: Sun elevation and visible Sun disc not computed ({describeError(timeline.error)}){" "}
                <RetryButton onClick={() => void timeline.refetch()} />
              </div>
            ) : site ? (
              <div className="dim">Computing the Sun at {site.name}…</div>
            ) : null}
            {exaggeration > 1 ? (
              <div className="caution-text">
                Relief is exaggerated {exaggeration}×, which also changes the drawn shadows.
              </div>
            ) : null}
            <HudNote summary="Illustration, not a measurement">
              <p>Shading and shadows are drawn by the 3D engine: an illustration, not a measurement.</p>
            </HudNote>
          </div>
          <div className="scene-tools segmented" role="group" aria-label="Vertical exaggeration">
            {EXAGGERATIONS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={value === exaggeration}
                onClick={() => setExaggeration(value)}
              >
                relief {value}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page">
        <TimeControls />
        <div className="cols">
          <div className="card">
            <div className="panel-head">
              <h2>
                Terrain at {site?.name ?? "the site"}{" "}
                {terrain.data ? <EvidenceBadge title="Terrain analysis" evidence={terrain.data.evidence} /> : null}
              </h2>
              {site ? (
                <span className="mono dim">
                  {formatLatitude(site.latitude_deg)} · {formatLongitude(site.longitude_deg)}
                </span>
              ) : null}
            </div>
            {terrain.isError ? (
              <p className="error">
                N/C · {describeError(terrain.error)} <RetryButton onClick={() => void terrain.refetch()} />
              </p>
            ) : terrain.data ? (
              <Analysis data={terrain.data} />
            ) : (
              <p className="dim">
                Reading a window of the PGDA 20 m DEM over HTTP byte ranges. The first read for a site takes about
                10–15 s; after that it is cached.
              </p>
            )}
            {terrain.isFetching && terrain.data ? <p className="dim small">Updating…</p> : null}
          </div>

          <div className="card">
            <h2>
              Your assumptions {hazard ? <EvidenceBadge title="Your thresholds" evidence={hazard.evidence} /> : null}
            </h2>
            <p className="dim small">
              {BRAND} ships no default “safe” slope or roughness. Flags appear only against thresholds you enter,
              and are labelled as assumptions.
            </p>
            <div className="form">
              <Field
                id="footprint-radius"
                label="Footprint radius (m)"
                value={radiusText}
                onChange={setRadiusText}
                hint={RADIUS_HINT}
                message={applied.radiusNote}
              />
              <Field
                id="max-slope"
                label="Max slope (°)"
                placeholder="none"
                value={slopeText}
                onChange={setSlopeText}
                message={applied.slopeNote}
              />
              <Field
                id="max-roughness"
                label="Max roughness (m)"
                placeholder="none"
                value={roughnessText}
                onChange={setRoughnessText}
                message={applied.roughnessNote}
              />
            </div>
            {hazard ? (
              <table className="data">
                <caption className="sr-only">Flags against your thresholds</caption>
                <tbody>
                  {hazard.max_slope_deg != null ? (
                    <>
                      <tr>
                        <th scope="row">95th-percentile slope vs {hazard.max_slope_deg}°</th>
                        <td className={flagClass(hazard.slope_p95_exceeds)}>
                          <EvidenceValue
                            title="Slope flag"
                            evidence={hazard.evidence}
                            value={flagText(hazard.slope_p95_exceeds)}
                          />
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Footprint cells steeper than {hazard.max_slope_deg}°</th>
                        <td className="num">
                          {hazard.slope_fraction_above == null ? (
                            <span className="dim">not computed</span>
                          ) : (
                            <EvidenceValue
                              title="Cells above the slope threshold"
                              evidence={hazard.evidence}
                              value={pct(hazard.slope_fraction_above)}
                            />
                          )}
                        </td>
                      </tr>
                    </>
                  ) : null}
                  {hazard.max_roughness_m != null ? (
                    <tr>
                      <th scope="row">Roughness vs {hazard.max_roughness_m} m</th>
                      <td className={flagClass(hazard.roughness_exceeds)}>
                        <EvidenceValue
                          title="Roughness flag"
                          evidence={hazard.evidence}
                          value={flagText(hazard.roughness_exceeds)}
                        />
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
