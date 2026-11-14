"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { SitePicker } from "@/features/sites/site-list";
import { usePlayback } from "@/features/time/controls";
import { describeError } from "@/shared/api/client";
import { useHealth, useSelectedSite } from "@/shared/api/queries";
import { useMissionUrl } from "@/shared/state/url";
import { EvidenceDrawer } from "@/shared/ui/evidence";

const NAV = [
  { path: "/", label: "Overview" },
  { path: "/illumination", label: "Illumination & Earth" },
  { path: "/terrain", label: "Terrain" },
  { path: "/compare", label: "Compare" },
];

export function Shell({ children }: { children: ReactNode }) {
  const { pathname, href, window, setParams } = useMissionUrl();
  const health = useHealth();
  const { sites, siteId } = useSelectedSite();
  usePlayback(window.startMs, window.endMs);
  const singleSite = pathname !== "/compare";

  return (
    <div className={singleSite ? "app" : "app no-sidebar"}>
      <header className="topbar">
        <div className="brand">
          <Image src="/logo.png" alt="" width={26} height={26} priority />
          LUNAREYES
        </div>
        <nav aria-label="Pages">
          {NAV.map((item) => (
            <Link
              key={item.path}
              href={href(item.path)}
              className={pathname === item.path ? "on" : ""}
              aria-current={pathname === item.path ? "page" : undefined}
            >
              {item.label}
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

      <main className="main">{children}</main>
      <EvidenceDrawer />
    </div>
  );
}
