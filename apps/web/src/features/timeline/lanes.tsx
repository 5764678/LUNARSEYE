"use client";

import { memo, useMemo, type CSSProperties } from "react";

import { deg } from "@/shared/lib/format";

const W = 1000;
export const ELEVATION_H = 86;
export const FRACTION_H = 54;

/** Lane height as a CSS variable, so the label column and the plot always agree and a
 *  media query can release the height on narrow screens. */
export const laneVars = (height: number) => ({ "--lane-h": `${height}px` }) as CSSProperties;

function linePath(values: readonly number[], y: (v: number) => number): string {
  const n = values.length;
  if (n === 0) return "";
  const dx = n > 1 ? W / (n - 1) : 0;
  const parts = new Array<string>(n);
  for (let i = 0; i < n; i += 1) {
    parts[i] = `${i === 0 ? "M" : "L"}${(i * dx).toFixed(1)},${y(values[i]!).toFixed(1)}`;
  }
  return parts.join("");
}

/** Step area: each sample stands for one step, as in the summaries. */
function areaPath(values: readonly number[], y: (v: number) => number, base: number): string {
  const n = values.length;
  if (n === 0) return "";
  const dx = n > 1 ? W / (n - 1) : W;
  const parts: string[] = [`M0,${base}`];
  for (let i = 0; i < n; i += 1) {
    const x0 = (i * dx).toFixed(1);
    const x1 = Math.min(W, (i + 1) * dx).toFixed(1);
    const yy = y(values[i]!).toFixed(1);
    parts.push(`L${x0},${yy}L${x1},${yy}`);
  }
  parts.push(`L${W},${base}Z`);
  return parts.join("");
}

export interface LaneLine {
  values: readonly number[];
  className: string;
}

/** Degrees-to-pixels for an elevation lane: the data range plus a little padding, always
 *  including 0°. Shared by the plot and its axis, which sits beside the lane, not on it. */
export interface ElevationScale {
  height: number;
  /** The data range as labelled on the axis. */
  min: number;
  max: number;
  zeroY: number;
  y: (degrees: number) => number;
}

export function elevationScale(lines: readonly LaneLine[], height = ELEVATION_H): ElevationScale {
  let lo = Infinity;
  let hi = -Infinity;
  for (const line of lines) {
    for (const v of line.values) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (!Number.isFinite(lo)) [lo, hi] = [-1, 1];
  lo = Math.min(lo, 0);
  hi = Math.max(hi, 0);
  const pad = (hi - lo) * 0.08 || 0.5;
  const bottom = lo - pad;
  const top = hi + pad;
  const y = (v: number) => height - ((v - bottom) / (top - bottom)) * height;
  return { height, min: lo, max: hi, zeroY: y(0), y };
}

/** Elevation lane: lines in degrees with a 0° rule. */
export const ElevationLane = memo(function ElevationLane({
  lines,
  scale,
}: {
  lines: LaneLine[];
  scale: ElevationScale;
}) {
  const paths = useMemo(
    () => lines.map((line) => ({ d: linePath(line.values, scale.y), className: line.className })),
    [lines, scale],
  );
  return (
    <div className="lane" style={laneVars(scale.height)}>
      <svg viewBox={`0 0 ${W} ${scale.height}`} preserveAspectRatio="none">
        <line x1={0} x2={W} y1={scale.zeroY} y2={scale.zeroY} className="rule" />
        {paths.map((p) => (
          <path key={p.className} d={p.d} className={p.className} />
        ))}
      </svg>
    </div>
  );
});

/** The elevation axis, in the label column beside its lane. On narrow screens the stacked
 *  ticks give way to a one-line range. */
export function ElevationAxis({ scale }: { scale: ElevationScale }) {
  // Skip the 0° tick when it would sit on top of the max or min label.
  const showZero = scale.zeroY > 12 && scale.height - scale.zeroY > 12;
  return (
    <>
      <div className="lane-axis" aria-hidden="true">
        <span className="top">{deg(scale.max, 1)}</span>
        {showZero ? (
          <span className="zero" style={{ top: scale.zeroY }}>
            0°
          </span>
        ) : null}
        <span className="bottom">{deg(scale.min, 1)}</span>
      </div>
      <span className="lane-range">
        {deg(scale.min, 1)} … {deg(scale.max, 1)}
      </span>
    </>
  );
}

/** Visible-disk-fraction lane, 0…1: terrain as a filled step area, flat horizon as a line. */
export const FractionLane = memo(function FractionLane({
  terrain,
  astronomical,
  className,
}: {
  terrain: readonly number[] | null;
  astronomical: readonly number[];
  className: string;
}) {
  const height = FRACTION_H;
  const { area, line } = useMemo(() => {
    const y = (v: number) => height - 2 - v * (height - 4);
    return {
      area: terrain ? areaPath(terrain, y, height) : "",
      line: linePath(astronomical, y),
    };
  }, [terrain, astronomical, height]);
  return (
    <div className="lane" style={laneVars(height)}>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
        {area ? <path d={area} className={`${className} area`} /> : null}
        <path d={line} className="flat-line" />
      </svg>
    </div>
  );
});

export function FractionAxis() {
  return (
    <>
      <div className="lane-axis" aria-hidden="true">
        <span className="top">100 %</span>
        <span className="bottom">0 %</span>
      </div>
      <span className="lane-range">0 % … 100 %</span>
    </>
  );
}
