"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useMemo } from "react";

import { SiteSummary } from "@/features/timeline/summary";
import { TimelinePanel } from "@/features/timeline/timeline-panel";
import { describeError, type Evidence } from "@/shared/api/client";
import { useSelectedSite, useSun, useTimeline } from "@/shared/api/queries";
import { bodyFixedToScene, formatLatitude, formatLongitude } from "@/shared/lib/geo/selenographic";
import { globeSunAt, type GlobeSunSeries } from "@/shared/lib/globe/sun";
import { useTime } from "@/shared/state/time";
import { useMissionUrl } from "@/shared/state/url";
import { EvidenceBadge } from "@/shared/ui/evidence";
import { HudNote } from "@/shared/ui/hud-note";
import { Icon } from "@/shared/ui/icons";

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

export function Overview() {
  const { window, setParams } = useMissionUrl();
  const { sites, siteId, site } = useSelectedSite();
  const timeline = useTimeline(siteId, window);
  const sun = useSun(window);
  const texture = useQuery({
    queryKey: ["texture-manifest"],
    queryFn: async () => {
      const response = await fetch("/textures/moon/manifest.json");
      if (!response.ok) return null;
      return (await response.json()) as TextureManifest;
    },
  });
  const epochMs = useTime((s) => s.epochMs);

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
      method: "Resampled to a web texture by lunareyes-data build-web-texture.",
      assumptions: m.assumptions,
      limitations: ["The colour map is a picture of the surface, never an analysis input."],
    };
  }, [texture.data]);

  return (
    <>
      <h1 className="sr-only">Overview{site ? ` · ${site.name}` : ""}</h1>
      <div className="top-row">
        <div className="globe">
          <div className="viz-fill">
            <MoonGlobe
              sites={sites.data?.sites ?? []}
              selectedId={siteId}
              onSelect={(id) => setParams({ site: id })}
              sunScene={sunScene}
              textureUrl={texture.data ? `/textures/moon/${texture.data.file}` : null}
            />
          </div>
          <div className="hud">
            {site ? (
              <div>
                <b>
                  <Icon name="site" /> {site.name}
                </b>{" "}
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
            <HudNote summary="Lit sphere, no terrain shadows">
              <p>
                Smooth sphere lit from the computed Sun direction: terrain shadows are not drawn, and the
                night side is lifted for visibility. Sunlight numbers come from the timeline.
              </p>
              <p>Drag to rotate, scroll to zoom, click a marker to pick a site.</p>
            </HudNote>
          </div>
        </div>

        <div className="side">
          {timeline.isError ? <p className="error pad">{describeError(timeline.error)}</p> : null}
          {timeline.data && sites.data ? (
            <SiteSummary timeline={timeline.data} coordinateEvidence={sites.data.coordinate_evidence} />
          ) : !timeline.isError ? (
            <p className="dim pad">
              {site ? `Computing ${site.name}…` : "Pick a site to see its sunlight and Earth visibility."}
            </p>
          ) : null}
        </div>
      </div>

      <TimelinePanel timeline={timeline.data ?? null} startMs={window.startMs} endMs={window.endMs} />
    </>
  );
}
