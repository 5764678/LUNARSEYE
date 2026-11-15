import { Easing, interpolate } from 'remotion';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** A clamped tween. `ease` is a cubic-bezier tuple or an easing function. */
export const tw = (
  frame: number,
  input: readonly number[],
  output: readonly number[],
  ease?: readonly [number, number, number, number] | ((t: number) => number),
) =>
  interpolate(frame, input as number[], output as number[], {
    ...CLAMP,
    easing: ease ? (typeof ease === 'function' ? ease : Easing.bezier(...ease)) : undefined,
  });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const pad4 = (n: number) => String(Math.max(0, Math.round(n))).padStart(4, '0');
