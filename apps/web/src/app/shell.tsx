"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { SitePicker } from "@/features/sites/site-list";
import { usePlayback } from "@/features/time/controls";
import { describeError } from "@/shared/api/client";
import { useHealth, useSelectedSite } from "@/shared/api/queries";
import { BRAND } from "@/shared/brand";
import { useMissionUrl } from "@/shared/state/url";
import { EvidenceDrawer } from "@/shared/ui/evidence";

const NAV = [
  { path: "/", label: "Overview" },
  { path: "/illumination", label: "Illumination & Earth" },
  { path: "/terrain", label: "Terrain" },
];

const HEALTH_OK = "API ready · SPICE kernels and DEM verified";

/** The detail after "API ready" drops out on narrow screens, where the title still has it. */
function HealthStatus() {
  const health = useHealth();
  if (health.isLoading) {
    return (
      <div className="health" role="status">
        Checking API…
      </div>
    );
  }
  if (health.data?.status === "ok") {
    return (
      <div className="health ok" role="status" title={HEALTH_OK}>
        <span>
          API ready<span className="health-detail"> · SPICE kernels and DEM verified</span>
        </span>
      </div>
    );
  }
  const failing =
    health.data?.checks
      .filter((c) => c.status !== "ok")
      .map((c) => c.name)
      .join(", ") ?? describeError(health.error);
  return (
    <div className="health bad" role="status">
      API degraded: {failing}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { pathname, href, window, setParams } = useMissionUrl();
  const { sites, siteId } = useSelectedSite();
  usePlayback(window.startMs, window.endMs);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">{BRAND}</div>
        <nav aria-label="Pages">
          {NAV.map((item) => (
            <Link
              key={item.path}
              href={href(item.path)}
              aria-current={pathname === item.path ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <HealthStatus />
      </header>

      <aside className="sidebar">
        {sites.isLoading ? <p className="dim pad">Loading the site catalogue…</p> : null}
        {sites.isError ? <p className="error pad">{describeError(sites.error)}</p> : null}
        {sites.data ? (
          <SitePicker data={sites.data} selectedId={siteId} onSelect={(id) => setParams({ site: id })} />
        ) : null}
      </aside>

      <main className="main">{children}</main>
      <EvidenceDrawer />
    </div>
  );
}
