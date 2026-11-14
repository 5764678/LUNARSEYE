import { create } from "zustand";

/** Timeline epoch and playback. The selected site and window live in the URL. */
interface TimeState {
  epochMs: number | null;
  playing: boolean;
  /** Simulated seconds per real second. */
  rate: number;
  setEpoch: (ms: number) => void;
  setPlaying: (playing: boolean) => void;
  setRate: (rate: number) => void;
}

export const useTime = create<TimeState>((set) => ({
  epochMs: null,
  playing: false,
  rate: 86_400,
  setEpoch: (epochMs) => set({ epochMs }),
  setPlaying: (playing) => set({ playing }),
  setRate: (rate) => set({ rate }),
}));

export const RATES = [
  { value: 3_600, label: "1 h/s" },
  { value: 21_600, label: "6 h/s" },
  { value: 86_400, label: "1 d/s" },
  { value: 432_000, label: "5 d/s" },
] as const;
