import { describe, expect, it } from "vitest";

import { directionToLocal, latLonToMap, mapToMoonMe, moonMeToLocalKm, sceneHeightAt } from "./polar";

// Reference values from lunaris_science (SouthPolarStereographic(1737400).inverse and
// spherical_to_cartesian), computed with the frozen core on 2026-11-14.
describe("mapToMoonMe", () => {
  it("matches the science core", () => {
    const a = mapToMoonMe(50_000, -30_000, 1_000);
    expect(a[0]).toBeCloseTo(-30008.816957926654, 4);
    expect(a[1]).toBeCloseTo(50014.694929877776, 4);
    expect(a[2]).toBeCloseTo(-1737421.2388467733, 4);
    const b = mapToMoonMe(-125_000, 125_000, -2_500);
    expect(b[0]).toBeCloseTo(124497.91355076499, 4);
    expect(b[1]).toBeCloseTo(-124497.91355076505, 4);
    expect(b[2]).toBeCloseTo(-1725942.800049588, 4);
  });

  it("puts the pole at the origin of the local frame, with up = +Y", () => {
    for (const component of moonMeToLocalKm(mapToMoonMe(0, 0, 0))) expect(component).toBeCloseTo(0, 12);
    expect(moonMeToLocalKm(mapToMoonMe(0, 0, 2_000))[1]).toBeCloseTo(2, 9);
    expect(directionToLocal([0, 0, -1])).toEqual([0, 1, 0]);
  });
});

describe("latLonToMap", () => {
  it("matches the science core's forward projection", () => {
    const [x, y] = latLonToMap(-88.811, 123.69);
    expect(x).toBeCloseTo(30000.22729206, 3);
    expect(y).toBeCloseTo(-20000.10045717, 3);
  });
});

describe("sceneHeightAt", () => {
  // 3×3 grid over ±100 m: rows top (y = +100) to bottom, columns x = −100 … +100.
  const heights = [0, 10, 20, 0, 10, 20, 0, 10, null];
  it("interpolates bilinearly", () => {
    expect(sceneHeightAt(heights, 3, 100, -50, 50)).toBeCloseTo(5, 12);
    expect(sceneHeightAt(heights, 3, 100, -50, 0)).toBeCloseTo(5, 12);
    expect(sceneHeightAt(heights, 3, 100, -100, 100)).toBeCloseTo(0, 12);
  });
  it("returns null outside the grid and next to missing data, never zero", () => {
    expect(sceneHeightAt(heights, 3, 100, 101, 0)).toBeNull();
    expect(sceneHeightAt(heights, 3, 100, 50, -50)).toBeNull();
  });
});
