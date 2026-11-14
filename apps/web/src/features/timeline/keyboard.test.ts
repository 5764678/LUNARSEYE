import { describe, expect, it } from "vitest";

import { DAY_MS } from "@/shared/lib/time/time";

import { nextEpoch } from "./keyboard";

const START = Date.UTC(2027, 0, 1);
const END = START + 30 * DAY_MS;
const HOUR = 3_600_000;
const mid = START + 10 * DAY_MS;

describe("nextEpoch", () => {
  it("moves one sample with the arrow keys", () => {
    expect(nextEpoch("ArrowRight", mid, START, END, HOUR)).toBe(mid + HOUR);
    expect(nextEpoch("ArrowUp", mid, START, END, HOUR)).toBe(mid + HOUR);
    expect(nextEpoch("ArrowLeft", mid, START, END, HOUR)).toBe(mid - HOUR);
    expect(nextEpoch("ArrowDown", mid, START, END, HOUR)).toBe(mid - HOUR);
  });

  it("moves a day with Shift+arrow and Page Up/Down", () => {
    expect(nextEpoch("ArrowRight", mid, START, END, HOUR, true)).toBe(mid + DAY_MS);
    expect(nextEpoch("ArrowLeft", mid, START, END, HOUR, true)).toBe(mid - DAY_MS);
    expect(nextEpoch("PageUp", mid, START, END, HOUR)).toBe(mid + DAY_MS);
    expect(nextEpoch("PageDown", mid, START, END, HOUR)).toBe(mid - DAY_MS);
  });

  it("jumps to the window edges and never leaves the window", () => {
    expect(nextEpoch("Home", mid, START, END, HOUR)).toBe(START);
    expect(nextEpoch("End", mid, START, END, HOUR)).toBe(END);
    expect(nextEpoch("ArrowLeft", START, START, END, HOUR)).toBe(START);
    expect(nextEpoch("ArrowRight", END, START, END, HOUR)).toBe(END);
    expect(nextEpoch("PageUp", END - HOUR, START, END, HOUR)).toBe(END);
  });

  it("ignores other keys", () => {
    expect(nextEpoch("a", mid, START, END, HOUR)).toBeNull();
    expect(nextEpoch("Tab", mid, START, END, HOUR)).toBeNull();
  });
});
