"use client";

import type { SiteList } from "@/shared/api/client";
import { formatLatitude, formatLongitude } from "@/shared/lib/geo/selenographic";
import { EvidenceBadge } from "@/shared/ui/evidence";

export function SitePicker({
  data,
  selectedId,
  onSelect,
}: {
  data: SiteList;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="sites">
      <div className="panel-head">
        <h2>Candidate sites</h2>
        <span className="dim">{data.count} cited</span>
      </div>
      <p className="caveat">
        Coordinates are DEM tile centres from PGDA product 78,{" "}
        <b>not selected landing points</b>.{" "}
        <EvidenceBadge title="Catalogue site coordinates" evidence={data.coordinate_evidence} />
      </p>
      <ul>
        {data.sites.map((site) => (
          <li key={site.id}>
            <button
              type="button"
              className={site.id === selectedId ? "site selected" : "site"}
              aria-pressed={site.id === selectedId}
              onClick={() => onSelect(site.id)}
            >
              <span className="site-name">
                {site.name}
                {site.catalog?.demo_trio ? <span className="tag">demo</span> : null}
              </span>
              <span className="mono dim">
                {formatLatitude(site.latitude_deg)} · {formatLongitude(site.longitude_deg)}
              </span>
              {site.catalog?.artemis_iii_2022_region ? (
                <span className="dim small">
                  Artemis III region (2022): {site.catalog.artemis_iii_2022_region}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
