import { describe, expect, it } from "vitest";

import { resolveSiteSelection } from "./selection";

const SITES = [{ id: "0b1c2d3e-0000-4000-8000-000000000001" }, { id: "0b1c2d3e-0000-4000-8000-000000000002" }];

describe("resolveSiteSelection", () => {
  it("defaults to the first catalogue site when the URL names none", () => {
    expect(resolveSiteSelection(SITES, null)).toEqual({ siteId: SITES[0]!.id, unknownParam: null });
    expect(resolveSiteSelection(SITES, "")).toEqual({ siteId: SITES[0]!.id, unknownParam: null });
    expect(resolveSiteSelection(SITES, "   ")).toEqual({ siteId: SITES[0]!.id, unknownParam: null });
  });

  it("selects the named site", () => {
    expect(resolveSiteSelection(SITES, SITES[1]!.id)).toEqual({ siteId: SITES[1]!.id, unknownParam: null });
  });

  it("matches ids case-insensitively and answers with the catalogue spelling", () => {
    expect(resolveSiteSelection(SITES, SITES[1]!.id.toUpperCase()).siteId).toBe(SITES[1]!.id);
  });

  it("requests nothing for an unknown id, and reports it", () => {
    expect(resolveSiteSelection(SITES, "made-up")).toEqual({ siteId: null, unknownParam: "made-up" });
    expect(resolveSiteSelection(SITES, "0b1c2d3e-0000-4000-8000-0000000000ff")).toEqual({
      siteId: null,
      unknownParam: "0b1c2d3e-0000-4000-8000-0000000000ff",
    });
  });

  it("waits for the catalogue instead of sending an unchecked id to the API", () => {
    expect(resolveSiteSelection(undefined, SITES[0]!.id)).toEqual({ siteId: null, unknownParam: null });
    expect(resolveSiteSelection(undefined, null)).toEqual({ siteId: null, unknownParam: null });
  });

  it("trusts the URL when the catalogue itself failed to load", () => {
    expect(resolveSiteSelection(undefined, "abc", true)).toEqual({ siteId: "abc", unknownParam: null });
  });
});
