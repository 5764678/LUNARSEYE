import { describe, expect, it } from "vitest";

import { interpretThresholds } from "./thresholds";

describe("interpretThresholds", () => {
  it("applies valid values untouched and says nothing", () => {
    expect(interpretThresholds("100", "12", "0.5")).toEqual({
      radiusM: 100,
      maxSlopeDeg: 12,
      maxRoughnessM: 0.5,
      radiusNote: null,
      slopeNote: null,
      roughnessNote: null,
    });
  });

  it("leaves empty optional limits quiet: none requested, none applied", () => {
    const t = interpretThresholds("50", "", " ");
    expect(t.maxSlopeDeg).toBeNull();
    expect(t.maxRoughnessM).toBeNull();
    expect(t.slopeNote).toBeNull();
    expect(t.roughnessNote).toBeNull();
  });

  it("explains an unusable radius and the 50 m fallback", () => {
    expect(interpretThresholds("", "", "")).toMatchObject({ radiusM: 50, radiusNote: "Empty: using 50 m." });
    expect(interpretThresholds("abc", "", "")).toMatchObject({
      radiusM: 50,
      radiusNote: "Not a positive number: using 50 m.",
    });
    expect(interpretThresholds("-5", "", "").radiusM).toBe(50);
  });

  it("explains clamping to the 20–2000 m range", () => {
    expect(interpretThresholds("5", "", "")).toMatchObject({ radiusM: 20, radiusNote: expect.stringContaining("20 m") });
    expect(interpretThresholds("5000", "", "")).toMatchObject({
      radiusM: 2000,
      radiusNote: expect.stringContaining("2000 m"),
    });
    expect(interpretThresholds("20", "", "").radiusNote).toBeNull();
    expect(interpretThresholds("2000", "", "").radiusNote).toBeNull();
  });

  it("explains a slope limit that is ignored, instead of dropping it silently", () => {
    expect(interpretThresholds("50", "90", "")).toMatchObject({
      maxSlopeDeg: null,
      slopeNote: "Must be below 90°: no slope limit applied.",
    });
    expect(interpretThresholds("50", "120", "").maxSlopeDeg).toBeNull();
    expect(interpretThresholds("50", "x", "").slopeNote).toMatch(/Not a positive number/);
    expect(interpretThresholds("50", "89.9", "").maxSlopeDeg).toBe(89.9);
  });

  it("explains an unusable roughness limit", () => {
    expect(interpretThresholds("50", "", "0")).toMatchObject({ maxRoughnessM: null });
    expect(interpretThresholds("50", "", "0").roughnessNote).toMatch(/Not a positive number/);
  });
});
