"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { SitePicker } from "@/features/sites/site-list";
import { SiteNotFound } from "@/features/sites/site-not-found";
import { usePlayback } from "@/features/time/controls";
import { describeError } from "@/shared/api/client";
import { useHealth, useSelectedSite } from "@/shared/api/queries";
import { useMissionUrl } from "@/shared/state/url";
import { EvidenceDrawer } from "@/shared/ui/evidence";

const NAV = [
  { path: "/", label: "Overview" },
  { path: "/illumination", label: "Illumination", extra: " & Earth" },
  { path: "/terrain", label: "Terrain" },
  { path: "/compare", label: "Compare" },
  { path: "/data", label: "Data" },
];

export function Shell({ children }: { children: ReactNode }) {
  const { pathname, href, window, setParams } = useMissionUrl();
  const health = useHealth();
  const { sites, siteId, unknownSiteParam } = useSelectedSite();
  usePlayback(window.startMs, window.endMs);
  const singleSite = pathname !== "/compare" && pathname !== "/data";

  return (
    <div className={singleSite ? "app" : "app no-sidebar"}>
      <header className="topbar">
        <div className="brand">LUNARSEYE</div>
        <nav aria-label="Pages">
          {NAV.map((item) => (
            <Link
              key={item.path}
              href={href(item.path)}
              className={pathname === item.path ? "on" : ""}
              aria-current={pathname === item.path ? "page" : undefined}
            >
              {item.label}
              {item.extra ? <span className="nav-extra">{item.extra}</span> : null}
            </Link>
          ))}
        </nav>
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

      {singleSite ? (
        <aside className="sidebar">
          {sites.isLoading ? <p className="dim pad">Loading the site catalogue…</p> : null}
          {sites.isError ? <p className="error pad">{describeError(sites.error)}</p> : null}
          {sites.data ? (
            <SitePicker
              data={sites.data}
              selectedId={siteId}
              onSelect={(id) => setParams({ site: id })}
            />
          ) : null}
        </aside>
      ) : null}

      <main className="main">
        {singleSite && unknownSiteParam !== null ? (
          <SiteNotFound
            requested={unknownSiteParam}
            count={sites.data?.count ?? null}
            fallbackName={sites.data?.sites[0]?.name ?? null}
            onUseFallback={() => setParams({ site: null })}
          />
        ) : (
          children
        )}
      </main>
      <EvidenceDrawer />
    </div>
  );
}
