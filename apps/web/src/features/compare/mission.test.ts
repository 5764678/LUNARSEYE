import { describe, expect, it } from "vitest";

import { missionQuery } from "@/shared/api/client";

import { DEFAULT_MISSION, isDefaultMission, parseLimit, parseMission, RESET_MISSION } from "./mission";

const params = (query: string) => new URLSearchParams(query);

describe("mission answers in the URL", () => {
  it("defaults to every need important and no limits", () => {
    expect(parseMission(params(""))).toEqual(DEFAULT_MISSION);
    expect(isDefaultMission(parseMission(params("sites=a,b&window=90d")))).toBe(true);
  });

  it("reads priorities and limits, ignoring values it does not know", () => {
    const mission = parseMission(
      params("power=high&comms=none&landing=maximum&max_slope=8&max_dark=7,5&min_sun=abc"),
    );
    expect(mission).toEqual({
      ...DEFAULT_MISSION,
      power: "high",
      comms: "none",
      maxSlopeDeg: 8,
      maxDarknessD: 7.5,
    });
    expect(isDefaultMission(mission)).toBe(false);
  });

  it("treats empty, zero and negative limits as no limit", () => {
    expect(parseLimit("")).toBeNull();
    expect(parseLimit("0")).toBeNull();
    expect(parseLimit("-3")).toBeNull();
    expect(parseLimit(" 12 ")).toBe(12);
    expect(parseMission(params("max_slope=400")).maxSlopeDeg).toBe(90);
  });

  it("clears every answer on reset", () => {
    expect(Object.keys(RESET_MISSION).sort()).toEqual(
      ["comms", "landing", "max_dark", "max_outage", "max_slope", "min_sun", "power"].sort(),
    );
  });
});

describe("mission answers in the API request", () => {
  it("sends nothing for the default mission", () => {
    expect(missionQuery(DEFAULT_MISSION)).toBe("");
  });

  it("sends only the answers that differ from the default", () => {
    expect(
      missionQuery({ ...DEFAULT_MISSION, power: "high", landing: "none", maxSlopeDeg: 8, minSunlitD: 14 }),
    ).toBe("&power=high&landing=none&max_slope_deg=8&min_sunlit_d=14");
  });
});
