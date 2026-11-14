"use client";

import { useRef, useState } from "react";

import type { SiteList } from "@/shared/api/client";
import { formatLatitude, formatLongitude } from "@/shared/lib/geo/selenographic";
import { EvidenceBadge } from "@/shared/ui/evidence";
import { Icon } from "@/shared/ui/icons";

/**
 * The 27-site catalogue. Wide screens keep it as a sidebar list. Narrow screens show the
 * selected site on one line that opens the list below it, so the page content is not pushed
 * down by a permanent strip of sites.
 */
export function SitePicker({
  data,
  selectedId,
  onSelect,
}: {
  data: SiteList;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const current = data.sites.find((site) => site.id === selectedId) ?? null;

  return (
    <div className="sites">
      <div className="panel-head">
        <h2>Candidate sites</h2>
        <span className="dim">{data.count} cited</span>
      </div>
      <p className="caveat">
        Coordinates are DEM tile centres from PGDA product 78, <b>not selected landing points</b>.{" "}
        <EvidenceBadge title="Catalogue site coordinates" evidence={data.coordinate_evidence} />
      </p>

      <button
        ref={toggle}
        type="button"
        className="site-toggle"
        aria-expanded={open}
        aria-controls="site-list"
        onClick={() => setOpen(!open)}
      >
        <span className="site-toggle-text">
          <span className="site-name">
            <span className="sr-only">Selected site: </span>
            {current?.name ?? "Choose a site"}
          </span>
          {current ? (
            <span className="mono dim">
              {formatLatitude(current.latitude_deg)} · {formatLongitude(current.longitude_deg)}
            </span>
          ) : null}
        </span>
        <Icon name="chevron" className="chev" />
      </button>

      <div id="site-list" className="sites-list" data-open={open}>
        <ul>
          {data.sites.map((site) => (
            <li key={site.id}>
              <button
                type="button"
                className="site"
                aria-pressed={site.id === selectedId}
                onClick={() => {
                  onSelect(site.id);
                  setOpen(false);
                  toggle.current?.focus();
                }}
              >
                <span className="site-name">
                  {site.name}
                  {site.catalog?.demo_trio ? <span className="tag">demo</span> : null}
                </span>
                <span className="mono dim">
                  {formatLatitude(site.latitude_deg)} · {formatLongitude(site.longitude_deg)}
                </span>
                {site.catalog?.artemis_iii_2022_region ? (
                  <span className="dim small">Artemis III region (2022): {site.catalog.artemis_iii_2022_region}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
