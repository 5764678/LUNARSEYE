"use client";

import { useMemo } from "react";

import type { HorizonMaskOut } from "@/shared/api/client";

const SIZE = 220;

/**
 * The body's disc against the terrain horizon around its azimuth, drawn to scale
 * (same degrees-per-pixel on both axes; near the horizon cos(elevation) ≈ 1). This is an
 * illustration of the computed geometry: the visible fraction shown next to it is the
 * computed value, not a measurement of this drawing.
 */
export function DiskView({
  horizon,
  azimuthDeg,
  elevationDeg,
  radiusDeg,
  className,
  halfSpanDeg,
}: {
  horizon: HorizonMaskOut;
  azimuthDeg: number;
  elevationDeg: number;
  radiusDeg: number;
  className: string;
  /** Half the width and height of the view, degrees. */
  halfSpanDeg: number;
}) {
  const HALF_SPAN_DEG = halfSpanDeg;
  const scale = SIZE / (2 * HALF_SPAN_DEG);
  const centreEl = elevationDeg;
  const y = (el: number) => SIZE / 2 - (el - centreEl) * scale;
  const ground = useMemo(() => {
    const az = horizon.azimuth_deg;
    const el = horizon.elevation_deg;
    if (!az || !el || az.length === 0) return null;
    const n = az.length;
    const step = 360 / n;
    const points: string[] = [];
    const first = Math.floor((azimuthDeg - HALF_SPAN_DEG) / step);
    const last = Math.ceil((azimuthDeg + HALF_SPAN_DEG) / step);
    for (let k = first; k <= last; k += 1) {
      const index = ((k % n) + n) % n;
      const x = SIZE / 2 + (k * step - azimuthDeg) * scale;
      points.push(`${x.toFixed(1)},${y(el[index]!).toFixed(1)}`);
    }
    return `M${points.join("L")}L${SIZE},${SIZE}L0,${SIZE}Z`;
  }, [horizon, azimuthDeg, scale, centreEl, HALF_SPAN_DEG]); // eslint-disable-line react-hooks/exhaustive-deps
  const zero = y(0);
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="disk-view" role="img" aria-label="Disc against the terrain horizon">
      <rect width={SIZE} height={SIZE} className="sky" />
      <circle cx={SIZE / 2} cy={y(elevationDeg)} r={radiusDeg * scale} className={className} />
      {zero > 0 && zero < SIZE ? <line x1={0} x2={SIZE} y1={zero} y2={zero} className="rule" /> : null}
      {ground ? <path d={ground} className="ground" /> : null}
      {/* Outline on top, so a disc hidden behind terrain can still be located. */}
      <circle cx={SIZE / 2} cy={y(elevationDeg)} r={radiusDeg * scale} className="disc-outline" />
      <text x={6} y={SIZE - 6} className="svg-note">
        {2 * HALF_SPAN_DEG}° × {2 * HALF_SPAN_DEG}° · az {azimuthDeg.toFixed(1)}°
      </text>
    </svg>
  );
}
