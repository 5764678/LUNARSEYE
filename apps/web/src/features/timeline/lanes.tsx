"use client";

import { memo, useMemo } from "react";

const W = 1000;

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

/** Elevation lane: lines in degrees against a symmetric-ish range, with a 0° rule. */
export const ElevationLane = memo(function ElevationLane({
  lines,
  height = 86,
}: {
  lines: LaneLine[];
  height?: number;
}) {
  const { paths, zeroY, min, max } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const line of lines)
      for (const v of line.values) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    if (!Number.isFinite(lo)) [lo, hi] = [-1, 1];
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
    const pad = (hi - lo) * 0.08 || 0.5;
    lo -= pad;
    hi += pad;
    const y = (v: number) => height - ((v - lo) / (hi - lo)) * height;
    return {
      paths: lines.map((line) => ({ d: linePath(line.values, y), className: line.className })),
      zeroY: y(0),
      min: lo + pad,
      max: hi - pad,
    };
  }, [lines, height]);
  return (
    <div className="lane" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
        <line x1={0} x2={W} y1={zeroY} y2={zeroY} className="rule" />
        {paths.map((p) => (
          <path key={p.className} d={p.d} className={p.className} />
        ))}
      </svg>
      <span className="axis top">{max.toFixed(1)}°</span>
      <span className="axis zero" style={{ top: zeroY }}>
        0°
      </span>
      <span className="axis bottom">{min.toFixed(1)}°</span>
    </div>
  );
});

/** Visible-disk-fraction lane, 0…1: terrain as a filled step area, flat horizon as a line. */
export const FractionLane = memo(function FractionLane({
  terrain,
  astronomical,
  className,
  height = 54,
}: {
  terrain: readonly number[] | null;
  astronomical: readonly number[];
  className: string;
  height?: number;
}) {
  const { area, line } = useMemo(() => {
    const y = (v: number) => height - 2 - v * (height - 4);
    return {
      area: terrain ? areaPath(terrain, y, height) : "",
      line: linePath(astronomical, y),
    };
  }, [terrain, astronomical, height]);
  return (
    <div className="lane" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
        {area ? <path d={area} className={`${className} area`} /> : null}
        <path d={line} className="flat-line" />
      </svg>
      <span className="axis top">100 %</span>
      <span className="axis bottom">0 %</span>
    </div>
  );
});
