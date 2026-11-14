"use client";

import { useEffect } from "react";

import { formatUtc } from "@/shared/lib/time/time";
import { RATES, useTime } from "@/shared/state/time";
import { useMissionUrl } from "@/shared/state/url";

import { WINDOWS } from "./windows";

/** Advances the epoch while playing and keeps it inside the analysis window. Mounted
 *  once, in the shell. */
export function usePlayback(startMs: number, endMs: number) {
  const playing = useTime((s) => s.playing);
  const epochMs = useTime((s) => s.epochMs);
  const setEpoch = useTime((s) => s.setEpoch);
  useEffect(() => {
    if (epochMs === null || epochMs < startMs || epochMs > endMs) setEpoch(startMs);
  }, [epochMs, startMs, endMs, setEpoch]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const state = useTime.getState();
      const next = (state.epochMs ?? startMs) + (now - last) * state.rate;
      last = now;
      if (next >= endMs) {
        state.setEpoch(endMs);
        state.setPlaying(false);
        return;
      }
      state.setEpoch(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, startMs, endMs]);
}

/** Play/pause, rate, current epoch and the analysis-window selector. */
export function TimeControls() {
  const { window, windowId, setParams } = useMissionUrl();
  const epochMs = useTime((s) => s.epochMs) ?? window.startMs;
  const playing = useTime((s) => s.playing);
  const rate = useTime((s) => s.rate);
  const setEpoch = useTime((s) => s.setEpoch);
  const setPlaying = useTime((s) => s.setPlaying);
  const setRate = useTime((s) => s.setRate);
  return (
    <div className="controls">
      <button
        type="button"
        className="btn primary"
        onClick={() => {
          if (!playing && epochMs >= window.endMs) setEpoch(window.startMs);
          setPlaying(!playing);
        }}
      >
        {playing ? "❚❚ Pause" : "▶ Play"}
      </button>
      <div className="segmented" role="group" aria-label="Playback rate">
        {RATES.map((r) => (
          <button
            key={r.value}
            type="button"
            className={r.value === rate ? "on" : ""}
            onClick={() => setRate(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="epoch mono">{formatUtc(epochMs, false)} UTC</div>
      <div className="spacer" />
      <div className="segmented" role="group" aria-label="Analysis window">
        {WINDOWS.map((w) => (
          <button
            key={w.id}
            type="button"
            className={w.id === windowId ? "on" : ""}
            onClick={() => setParams({ window: w.id })}
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  );
}
