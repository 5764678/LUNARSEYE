"use client";

import { memo, useMemo } from "react";

import type { BodySeries, HorizonMaskOut } from "@/shared/api/client";

const W = 1200;
const H = 360;
const PAD = { left: 44, right: 10, top: 10, bottom: 26 };

/** Vertical bars, one per sample: centre ± disc radius at the body's azimuth. */
function trackPath(body: BodySeries, x: (az: number) => number, y: (el: number) => number): string {
  const parts: string[] = [];
  const n = body.azimuth_deg.length;
  for (let i = 0; i < n; i += 1) {
    const cx = x(body.azimuth_deg[i]!).toFixed(1);
    const r = body.angular_radius_deg[i]!;
    const el = body.elevation_deg[i]!;
    parts.push(`M${cx},${y(el + r).toFixed(1)}V${y(el - r).toFixed(1)}`);
  }
  return parts.join("");
}

const Static = memo(function Static({
  horizon,
  sun,
  earth,
  range,
}: {
  horizon: HorizonMaskOut;
  sun: BodySeries;
  earth: BodySeries;
  range: [number, number];
}) {
  const x = (az: number) => PAD.left + (az / 360) * (W - PAD.left - PAD.right);
  const y = (el: number) =>
    PAD.top + (1 - (el - range[0]) / (range[1] - range[0])) * (H - PAD.top - PAD.bottom);
  const skyline = useMemo(() => {
    const az = horizon.azimuth_deg;
    const el = horizon.elevation_deg;
    if (!az || !el) return null;
    const points = az.map((a, i) => `${x(a).toFixed(1)},${y(el[i]!).toFixed(1)}`);
    points.push(`${x(360).toFixed(1)},${y(el[0]!).toFixed(1)}`);
    const base = y(range[0]);
    return `M${x(0)},${base}L${points.join("L")}L${x(360)},${base}Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon, range]);
  const truncated = useMemo(() => {
    const flags = horizon.truncated ?? [];
    const out: Array<{ az: number; el: number }> = [];
    flags.forEach((flag, i) => {
      // One marker per 2° keeps a long truncated arc readable.
      if (flag && i % 8 === 0) out.push({ az: horizon.azimuth_deg![i]!, el: horizon.elevation_deg![i]! });
    });
    return out;
  }, [horizon]);
  const sunPath = useMemo(() => trackPath(sun, x, y), [sun, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const earthPath = useMemo(() => trackPath(earth, x, y), [earth, range]); // eslint-disable-line react-hooks/exhaustive-deps

  const elTicks: number[] = [];
  const stepEl = range[1] - range[0] > 16 ? 5 : 2;
  for (let e = Math.ceil(range[0] / stepEl) * stepEl; e <= range[1]; e += stepEl) elTicks.push(e);

  return (
    <>
      {elTicks.map((e) => (
        <g key={e}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(e)} y2={y(e)} className={e === 0 ? "sky-zero" : "sky-grid"} />
          <text x={PAD.left - 6} y={y(e) + 3.5} textAnchor="end" className="sky-tick">
            {e}°
          </text>
        </g>
      ))}
      {[0, 45, 90, 135, 180, 225, 270, 315, 360].map((a) => (
        <g key={a}>
          <line x1={x(a)} x2={x(a)} y1={PAD.top} y2={H - PAD.bottom} className="sky-grid" />
          <text x={x(a)} y={H - 9} textAnchor="middle" className="sky-tick">
            {a === 0 || a === 360 ? "N" : a === 90 ? "E" : a === 180 ? "S" : a === 270 ? "W" : `${a}°`}
          </text>
        </g>
      ))}
      <path d={earthPath} className="sky-track earth" />
      <path d={sunPath} className="sky-track sun" />
      {skyline ? <path d={skyline} className="sky-terrain" /> : null}
      {truncated.map((t) => (
        <path
          key={t.az}
          d={`M${x(t.az) - 4},${y(t.el) - 2}L${x(t.az) + 4},${y(t.el) - 2}L${x(t.az)},${y(t.el) - 9}Z`}
          className="sky-lower-bound"
        />
      ))}
    </>
  );
});

/**
 * The site's sky as azimuth × elevation: terrain skyline, and every sampled position of
 * the Sun and the Earth drawn as a bar of the disc's height. The axes have different
 * scales (360° across, a few degrees up), so discs are bars, not circles.
 */
export function SkyChart({
  horizon,
  sun,
  earth,
  index,
}: {
  horizon: HorizonMaskOut;
  sun: BodySeries;
  earth: BodySeries;
  index: number;
}) {
  const range = useMemo((): [number, number] => {
    let lo = 0;
    let hi = 0;
    for (const series of [horizon.elevation_deg ?? [], sun.elevation_deg, earth.elevation_deg]) {
      for (const v of series) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    return [Math.floor(lo - 1.5), Math.ceil(hi + 1.5)];
  }, [horizon, sun, earth]);
  const x = (az: number) => PAD.left + (az / 360) * (W - PAD.left - PAD.right);
  const y = (el: number) =>
    PAD.top + (1 - (el - range[0]) / (range[1] - range[0])) * (H - PAD.top - PAD.bottom);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sky-chart" role="img" aria-label="Sky chart: terrain skyline with Sun and Earth tracks">
      <Static horizon={horizon} sun={sun} earth={earth} range={range} />
      <circle cx={x(earth.azimuth_deg[index]!)} cy={y(earth.elevation_deg[index]!)} r={5} className="sky-now earth" />
      <circle cx={x(sun.azimuth_deg[index]!)} cy={y(sun.elevation_deg[index]!)} r={5} className="sky-now sun" />
    </svg>
  );
}
