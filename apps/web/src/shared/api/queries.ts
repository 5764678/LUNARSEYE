"use client";

import { useQuery } from "@tanstack/react-query";

import { useMissionUrl } from "@/shared/state/url";

import { api, keys, type AnalysisWindow } from "./client";

export const useHealth = () =>
  useQuery({ queryKey: keys.health, queryFn: ({ signal }) => api.health(signal) });

export const useSites = () =>
  useQuery({ queryKey: keys.sites, queryFn: ({ signal }) => api.sites(signal) });

/** The site named in the URL, or the first catalogue site while none is named. */
export function useSelectedSite() {
  const { siteParam } = useMissionUrl();
  const sites = useSites();
  const siteId = siteParam ?? sites.data?.sites[0]?.id ?? null;
  const site = sites.data?.sites.find((s) => s.id === siteId) ?? null;
  return { sites, siteId, site };
}

export const useTimeline = (siteId: string | null, window: AnalysisWindow) =>
  useQuery({
    queryKey: keys.timeline(siteId ?? "", window),
    queryFn: ({ signal }) => api.timeline(siteId!, window, signal),
    enabled: siteId !== null,
  });

export const useSun = (window: AnalysisWindow) =>
  useQuery({ queryKey: keys.sun(window), queryFn: ({ signal }) => api.sun(window, signal) });
