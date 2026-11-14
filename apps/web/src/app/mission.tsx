"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { SitePicker } from "@/features/sites/site-list";
import { SiteSummary } from "@/features/timeline/summary";
import { TimelinePanel } from "@/features/timeline/timeline-panel";
import { isWindowId, resolveWindow, type WindowId } from "@/features/timeline/windows";
import { api, describeError, keys, type Evidence } from "@/shared/api/client";
import { bodyFixedToScene, formatLatitude, formatLongitude } from "@/shared/lib/geo/selenographic";
import { globeSunAt, type GlobeSunSeries } from "@/shared/lib/globe/sun";
import { useTime } from "@/shared/state/time";
import { EvidenceBadge, EvidenceDrawer } from "@/shared/ui/evidence";

const MoonGlobe = dynamic(() => import("@/viewport/moon-globe"), {
  ssr: false,
  loading: () => <div className="globe-loading">Loading the globe…</div>,
});

interface TextureManifest {
  file: string;
  credit: string;
  usage: string;
  assumptions: string[];
  source: { dataset_id: string; dataset_title: string; source_url: string; sha256: string };
}

/** Advances the epoch while playing; one store commit per animation frame at most. */
function usePlayback(startMs: number, endMs: number) {
  const playing = useTime((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const { epochMs, rate, setEpoch, setPlaying } = useTime.getState();
      const next = (epochMs ?? startMs) + (now - last) * rate;
      last = now;
      if (next >= endMs) {
        setEpoch(endMs);
        setPlaying(false);
        return;
      }
      setEpoch(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, startMs, endMs]);
}

export function Mission() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Selected site and analysis window live in the URL.
  const windowParam = params.get("window");
  const windowId: WindowId = isWindowId(windowParam) ? windowParam : "2027";
  const window_ = useMemo(() => resolveWindow(windowId), [windowId]);
  const setParam = useCallback(
    (name: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      next.set(name, value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const health = useQuery({ queryKey: keys.health, queryFn: ({ signal }) => api.health(signal) });
  const sites = useQuery({ queryKey: keys.sites, queryFn: ({ signal }) => api.sites(signal) });
  const siteId = params.get("site") ?? sites.data?.sites[0]?.id ?? null;
  const site = sites.data?.sites.find((s) => s.id === siteId) ?? null;

  const timeline = useQuery({
    queryKey: keys.timeline(siteId ?? "", window_),
    queryFn: ({ signal }) => api.timeline(siteId!, window_, signal),
    enabled: siteId !== null && sites.isSuccess,
  });
  const sun = useQuery({
    queryKey: keys.sun(window_),
    queryFn: ({ signal }) => api.sun(window_, signal),
  });
  const texture = useQuery({
    queryKey: ["texture-manifest"],
    queryFn: async () => {
      const response = await fetch("/textures/moon/manifest.json");
      if (!response.ok) return null;
      return (await response.json()) as TextureManifest;
    },
  });

  // Keep the epoch inside the window.
  const epochMs = useTime((s) => s.epochMs);
  const setEpoch = useTime((s) => s.setEpoch);
  useEffect(() => {
    if (epochMs === null || epochMs < window_.startMs || epochMs > window_.endMs) {
      setEpoch(window_.startMs);
    }
  }, [epochMs, window_.startMs, window_.endMs, setEpoch]);
  usePlayback(window_.startMs, window_.endMs);

  const sunSeries = useMemo((): GlobeSunSeries | null => {
    if (!sun.data) return null;
    return {
      directions: {
        epochsMs: sun.data.epochs_utc.map((t) => Date.parse(t)),
        directions: sun.data.direction_moon_me as unknown as Array<readonly [number, number, number]>,
        elevationDeg: [],
        azimuthDeg: [],
      },
      subsolarLatDeg: sun.data.subsolar_latitude_deg,
      subsolarLonDeg: sun.data.subsolar_longitude_deg,
    };
  }, [sun.data]);
  const sunNow = useMemo(
    () => (sunSeries && epochMs !== null ? globeSunAt(sunSeries, epochMs) : null),
    [sunSeries, epochMs],
  );
  const sunScene = useMemo(() => (sunNow ? bodyFixedToScene(sunNow.direction) : null), [sunNow]);

  const textureEvidence = useMemo((): Evidence | null => {
    const m = texture.data;
    if (!m) return null;
    return {
      kind: "derived_product",
      statement: `${m.source.dataset_title}. ${m.usage}`,
      sources: [
        {
          source_id: m.source.dataset_id,
          title: m.credit,
          url: m.source.source_url,
          sha256: m.source.sha256,
        },
      ],
      method: "Resampled to a web texture by lunaris-data build-web-texture.",
      assumptions: m.assumptions,
      limitations: ["The colour map is a picture of the surface, never an analysis input."],
    };
  }, [texture.data]);

  const selectSite = useCallback((id: string) => setParam("site", id), [setParam]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          LUNARIS <span className="dim">lunar south-pole site analysis</span>
        </div>
        <div className="spacer" />
        <div className={`health ${health.data?.status === "ok" ? "ok" : health.isLoading ? "" : "bad"}`}>
          {health.isLoading
            ? "Checking API…"
            : health.data?.status === "ok"
              ? "API ready · SPICE kernels and DEM verified"
              : `API degraded: ${
                  health.data?.checks
                    .filter((c) => c.status !== "ok")
                    .map((c) => c.name)
                    .join(", ") ?? describeError(health.error)
                }`}
        </div>
      </header>

      <aside className="sidebar">
        {sites.isLoading ? <p className="dim pad">Loading the site catalogue…</p> : null}
        {sites.isError ? <p className="error pad">{describeError(sites.error)}</p> : null}
        {sites.data ? (
          <SitePicker data={sites.data} selectedId={siteId} onSelect={selectSite} />
        ) : null}
      </aside>

      <main className="main">
        <div className="top-row">
          <div className="globe">
            <MoonGlobe
              sites={sites.data?.sites ?? []}
              selectedId={siteId}
              onSelect={selectSite}
              sunScene={sunScene}
              textureUrl={texture.data ? `/textures/moon/${texture.data.file}` : null}
            />
            <div className="hud">
              {site ? (
                <div>
                  <b className="sun-text">◎ {site.name}</b>{" "}
                  <span className="mono dim">
                    {formatLatitude(site.latitude_deg)} · {formatLongitude(site.longitude_deg)}
                  </span>
                </div>
              ) : null}
              <div>
                <b>Sun</b>{" "}
                {sunNow ? (
                  <>
                    sub-solar point {formatLatitude(sunNow.subsolarLatDeg, 2)} ·{" "}
                    {formatLongitude(sunNow.subsolarLonDeg, 2)}{" "}
                    <EvidenceBadge title="Sun direction lighting the globe" evidence={sun.data?.evidence} />
                  </>
                ) : sun.isError ? (
                  <span className="error">{describeError(sun.error)}</span>
                ) : (
                  "computing the SPICE Sun direction…"
                )}
              </div>
              <div>
                <b>Surface</b>{" "}
                {texture.data ? (
                  <>
                    NASA SVS colour map (visualization only){" "}
                    <EvidenceBadge title="Globe colour map" evidence={textureEvidence} />
                  </>
                ) : (
                  <>
                    procedural placeholder, not lunar data <span className="ev ev-placeholder">PLACEHOLDER</span>
                  </>
                )}
              </div>
              <div className="dim">
                Smooth sphere lit from the computed Sun direction: terrain shadows are not drawn,
                and the night side is lifted for visibility. Sunlight numbers come from the
                timeline. Drag to rotate, scroll to zoom, click a marker to pick a site.
              </div>
            </div>
          </div>

          <div className="side">
            {timeline.isError ? <p className="error pad">{describeError(timeline.error)}</p> : null}
            {timeline.data && sites.data ? (
              <SiteSummary
                timeline={timeline.data}
                coordinateEvidence={sites.data.coordinate_evidence}
              />
            ) : !timeline.isError ? (
              <p className="dim pad">
                {site ? `Computing ${site.name}…` : "Pick a site to see its sunlight and Earth visibility."}
              </p>
            ) : null}
          </div>
        </div>

        <TimelinePanel
          timeline={timeline.data ?? null}
          windowId={windowId}
          onWindow={(id) => setParam("window", id)}
          startMs={window_.startMs}
          endMs={window_.endMs}
        />
      </main>
      <EvidenceDrawer />
    </div>
  );
}
