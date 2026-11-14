"use client";

import { useQuery } from "@tanstack/react-query";

import { resolveSiteSelection } from "@/features/sites/selection";
import { useMissionUrl } from "@/shared/state/url";

import { api, keys, type AnalysisWindow, type MissionAnswers, type TerrainParams } from "./client";

export const useHealth = () =>
  useQuery({ queryKey: keys.health, queryFn: ({ signal }) => api.health(signal) });

export const useDatasets = () =>
  useQuery({ queryKey: keys.datasets, queryFn: ({ signal }) => api.datasets(signal) });

export const useSites = () =>
  useQuery({ queryKey: keys.sites, queryFn: ({ signal }) => api.sites(signal) });

/**
 * The site named in the URL, or the first catalogue site while none is named. A named
 * site that is not in the catalogue yields `siteId: null` (so nothing is requested for it)
 * and `unknownSiteParam`, which the shell turns into a "site not found" message.
 */
export function useSelectedSite() {
  const { siteParam } = useMissionUrl();
  const sites = useSites();
  const { siteId, unknownParam } = resolveSiteSelection(sites.data?.sites, siteParam, sites.isError);
  const site = sites.data?.sites.find((s) => s.id === siteId) ?? null;
  return { sites, siteId, site, unknownSiteParam: unknownParam };
}

export const useTimeline = (siteId: string | null, window: AnalysisWindow) =>
  useQuery({
    queryKey: keys.timeline(siteId ?? "", window),
    queryFn: ({ signal }) => api.timeline(siteId!, window, signal),
    enabled: siteId !== null,
  });

export const useSun = (window: AnalysisWindow) =>
  useQuery({ queryKey: keys.sun(window), queryFn: ({ signal }) => api.sun(window, signal) });

/**
 * The first read of a site's 20 m window goes to PGDA over HTTP ranges (≈ 10–15 s).
 * While new thresholds load for the SAME site the last result stays on screen (every row
 * names its own baseline and limits). It is never carried over to a different site: the
 * panel would show one site's measurements under another site's name.
 */
export const useSiteTerrain = (siteId: string | null, params: TerrainParams) =>
  useQuery({
    queryKey: keys.terrain(siteId ?? "", params),
    queryFn: ({ signal }) => api.terrain(siteId!, params, signal),
    enabled: siteId !== null,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === (siteId ?? "") ? previous : undefined,
  });

export const useTerrainScene = (gridSize: number) =>
  useQuery({ queryKey: keys.scene(gridSize), queryFn: ({ signal }) => api.scene(gridSize, signal) });

/** Rows are slow on a cold cache (PGDA window reads + horizon masks), so keep the last
 *  result on screen while the next one loads. */
export const useCompare = (siteIds: string[], window: AnalysisWindow, mission: MissionAnswers) =>
  useQuery({
    queryKey: keys.compare(siteIds, window, mission),
    queryFn: ({ signal }) => api.compare(siteIds, window, mission, signal),
    enabled: siteIds.length > 0,
    placeholderData: (previous) => previous,
  });
