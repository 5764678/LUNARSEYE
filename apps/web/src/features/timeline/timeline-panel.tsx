"use client";

import { useCallback, useMemo, useRef, type KeyboardEvent } from "react";

import type { BodySeries, SiteTimeline } from "@/shared/api/client";
import { deg, pct } from "@/shared/lib/format";
import { clamp, DAY_MS, formatUtc } from "@/shared/lib/time/time";
import { TimeControls } from "@/features/time/controls";
import { useTime } from "@/shared/state/time";
import { EvidenceBadge, EvidenceValue } from "@/shared/ui/evidence";

import { DiskView } from "./disk-view";
import { nextEpoch } from "./keyboard";
import {
  ELEVATION_H,
  ElevationAxis,
  ElevationLane,
  FRACTION_H,
  FractionAxis,
  FractionLane,
  elevationScale,
  laneVars,
} from "./lanes";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ticks(startMs: number, endMs: number): Array<{ position: number; label: string }> {
  const span = endMs - startMs;
  const out: Array<{ position: number; label: string }> = [];
  if (span > 120 * DAY_MS) {
    const d = new Date(startMs);
    for (let m = d.getUTCMonth(), y = d.getUTCFullYear(); ; m += 1) {
      const t = Date.UTC(y, m, 1);
      if (t > endMs) break;
      if (t >= startMs && t < endMs) out.push({ position: (t - startMs) / span, label: MONTHS[m % 12]! });
    }
    return out;
  }
  const every = span > 45 * DAY_MS ? 10 : 5;
  for (let t = startMs, i = 0; t < endMs; t += DAY_MS, i += 1) {
    if (i % every === 0) {
      const d = new Date(t);
      out.push({
        position: (t - startMs) / span,
        label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`,
      });
    }
  }
  return out;
}

const LOS_LABEL: Record<string, string> = {
  clear: "clear",
  terrain_obstructed: "blocked by terrain",
  below_geometric_horizon: "below the horizon",
};

/** One body at the cursor. The kind of evidence is named once in the heading; each value
 *  opens the evidence behind it. */
function Readout({ body, index, name }: { body: BodySeries; index: number; name: string }) {
  const terrain = body.terrain_visible_fraction?.[index];
  const truncated = body.terrain_truncated?.[index] ?? false;
  const horizon = body.terrain_horizon_elevation_deg?.[index];
  const los = body.line_of_sight?.[index];
  const position = `${body.azimuth_deg[index]!.toFixed(2)}° / ${deg(body.elevation_deg[index]!)}`;
  const horizonText = horizon === undefined || horizon === null ? "not computed" : deg(horizon);
  const visibleText =
    terrain === undefined || terrain === null ? "not computed" : `${truncated ? "≤ " : ""}${pct(terrain)}`;
  return (
    <div className="readout-block">
      <h3 className="readout-title">
        {name} <EvidenceBadge title={`${name} geometry and visibility`} evidence={body.evidence} />
      </h3>
      <dl className="readout">
        <dt>Azimuth / elevation</dt>
        <dd>
          <EvidenceValue title={`${name} azimuth and elevation`} evidence={body.geometry_evidence} value={position} />
        </dd>
        <dt>Terrain horizon at that azimuth</dt>
        <dd>
          <EvidenceValue
            title={`${name}: terrain horizon at its azimuth`}
            evidence={horizon == null ? null : body.evidence}
            value={horizonText}
          />
        </dd>
        <dt>Visible disc (terrain)</dt>
        <dd>
          <EvidenceValue
            title={`Visible ${name} disc`}
            evidence={terrain == null ? null : body.evidence}
            value={visibleText}
          />
          <span className="dim">flat: {pct(body.astronomical_visible_fraction[index]!)}</span>
        </dd>
        {los ? (
          <>
            <dt>Line of sight</dt>
            <dd className={`los-${los}`}>{LOS_LABEL[los]}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

export function TimelinePanel({
  timeline,
  startMs,
  endMs,
}: {
  timeline: SiteTimeline | null;
  startMs: number;
  endMs: number;
}) {
  const epochMs = useTime((s) => s.epochMs) ?? startMs;
  const setEpoch = useTime((s) => s.setEpoch);
  const setPlaying = useTime((s) => s.setPlaying);
  const track = useRef<HTMLDivElement>(null);

  const scrub = useCallback(
    (clientX: number) => {
      const box = track.current?.getBoundingClientRect();
      if (!box) return;
      const f = clamp((clientX - box.left) / box.width, 0, 1);
      setEpoch(startMs + f * (endMs - startMs));
    },
    [startMs, endMs, setEpoch],
  );

  /** The slider keyboard pattern; the key map lives in `nextEpoch` (and its tests). */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextEpoch(
      event.key,
      epochMs,
      startMs,
      endMs,
      (timeline?.step_s ?? 3600) * 1000,
      event.shiftKey,
    );
    if (next === null) return;
    event.preventDefault();
    setPlaying(false);
    setEpoch(next);
  };

  const position = clamp((epochMs - startMs) / (endMs - startMs), 0, 1);
  const axis = useMemo(() => ticks(startMs, endMs), [startMs, endMs]);
  const count = timeline?.sample_count ?? 0;
  const index = count ? clamp(Math.round((epochMs - startMs) / (timeline!.step_s * 1000)), 0, count - 1) : 0;

  const sunLines = useMemo(
    () =>
      timeline
        ? [
            { values: timeline.sun.elevation_deg, className: "line sun" },
            ...(timeline.sun.terrain_horizon_elevation_deg
              ? [{ values: timeline.sun.terrain_horizon_elevation_deg, className: "line horizon" }]
              : []),
          ]
        : [],
    [timeline],
  );
  const earthLines = useMemo(
    () =>
      timeline
        ? [
            { values: timeline.earth.elevation_deg, className: "line earth" },
            ...(timeline.earth.terrain_horizon_elevation_deg
              ? [{ values: timeline.earth.terrain_horizon_elevation_deg, className: "line horizon" }]
              : []),
          ]
        : [],
    [timeline],
  );
  const sunScale = useMemo(() => elevationScale(sunLines), [sunLines]);
  const earthScale = useMemo(() => elevationScale(earthLines), [earthLines]);

  return (
    <section className="timeline" aria-label="Timeline">
      <TimeControls />

      <div className="lanes-grid">
        <div className="lane-labels">
          <div className="lane-label" style={laneVars(ELEVATION_H)}>
            <div className="lane-title">
              <b className="sun-text">Sun elevation</b>
              <span className="dim">vs terrain horizon at its azimuth</span>
            </div>
            {timeline ? <ElevationAxis scale={sunScale} /> : null}
          </div>
          <div className="lane-label" style={laneVars(FRACTION_H)}>
            <div className="lane-title">
              <b className="sun-text">Sun disc visible</b>
              <span className="dim">filled: terrain · line: flat</span>
            </div>
            {timeline ? <FractionAxis /> : null}
          </div>
          <div className="lane-label" style={laneVars(ELEVATION_H)}>
            <div className="lane-title">
              <b className="earth-text">Earth elevation</b>
              <span className="dim">vs terrain horizon at its azimuth</span>
            </div>
            {timeline ? <ElevationAxis scale={earthScale} /> : null}
          </div>
          <div className="lane-label" style={laneVars(FRACTION_H)}>
            <div className="lane-title">
              <b className="earth-text">Earth disc visible</b>
              <span className="dim">filled: terrain · line: flat</span>
            </div>
            {timeline ? <FractionAxis /> : null}
          </div>
        </div>
        <div
          className="track"
          ref={track}
          role="slider"
          tabIndex={0}
          aria-label="Timeline position"
          aria-describedby="timeline-help"
          aria-orientation="horizontal"
          aria-valuemin={startMs}
          aria-valuemax={endMs}
          aria-valuenow={Math.round(epochMs)}
          aria-valuetext={`${formatUtc(epochMs, false)} UTC`}
          onKeyDown={onKeyDown}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setPlaying(false);
            scrub(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) scrub(event.clientX);
          }}
        >
          <span id="timeline-help" className="sr-only">
            Left and right arrows move one sample, Shift with an arrow, Page Up and Page Down move one day,
            Home and End jump to the ends of the window.
          </span>
          {timeline ? (
            <>
              <ElevationLane lines={sunLines} scale={sunScale} />
              <FractionLane
                terrain={timeline.sun.terrain_visible_fraction}
                astronomical={timeline.sun.astronomical_visible_fraction}
                className="sun"
              />
              <ElevationLane lines={earthLines} scale={earthScale} />
              <FractionLane
                terrain={timeline.earth.terrain_visible_fraction}
                astronomical={timeline.earth.astronomical_visible_fraction}
                className="earth"
              />
            </>
          ) : (
            <div className="lanes-placeholder">
              Computing the timeline… the first request for a site also computes its horizon mask from the
              240 m DEM (about 2 s).
            </div>
          )}
          <div className="cursor" style={{ left: `${position * 100}%` }} />
          <div className="ticks">
            {axis.map((t) => (
              <span key={`${t.label}-${t.position}`} style={{ left: `${t.position * 100}%` }}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {timeline ? (
        <div className="at-cursor">
          <div className="at-cursor-head">
            <b>At {formatUtc(Date.parse(timeline.epochs_utc[index]!), false)} UTC</b>
            <span className="dim small">computed sample values (not interpolated)</span>
          </div>
          <div className="at-cursor-body">
            <div className="body-block">
              {timeline.horizon.available ? (
                <DiskView
                  horizon={timeline.horizon}
                  azimuthDeg={timeline.sun.azimuth_deg[index]!}
                  elevationDeg={timeline.sun.elevation_deg[index]!}
                  radiusDeg={timeline.sun.angular_radius_deg[index]!}
                  className="disc sun"
                  halfSpanDeg={1.5}
                />
              ) : null}
              <Readout body={timeline.sun} index={index} name="Sun" />
            </div>
            <div className="body-block">
              {timeline.horizon.available ? (
                <DiskView
                  horizon={timeline.horizon}
                  azimuthDeg={timeline.earth.azimuth_deg[index]!}
                  elevationDeg={timeline.earth.elevation_deg[index]!}
                  radiusDeg={timeline.earth.angular_radius_deg[index]!}
                  className="disc earth"
                  halfSpanDeg={4}
                />
              ) : null}
              <Readout body={timeline.earth} index={index} name="Earth" />
            </div>
          </div>
          <p className="dim small">
            The disc drawings illustrate the computed geometry to scale. Quantitative values are the visible
            disc fractions, computed against the horizon mask.
          </p>
        </div>
      ) : null}
    </section>
  );
}
