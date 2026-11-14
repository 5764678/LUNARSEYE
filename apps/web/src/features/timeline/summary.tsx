"use client";

import type { ReactNode } from "react";

import type { Evidence, HorizonSummary, SiteTimeline } from "@/shared/api/client";
import { deg, duration, pct } from "@/shared/lib/format";
import { formatLatitude, formatLongitude } from "@/shared/lib/geo/selenographic";
import { EvidenceBadge } from "@/shared/ui/evidence";

function Stat({
  label,
  value,
  note,
  evidence,
}: {
  label: string;
  value: string;
  note?: ReactNode;
  evidence: Evidence | null | undefined;
}) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value} <EvidenceBadge title={label} evidence={evidence} value={value} />
      </div>
      {note ? <div className="stat-note">{note}</div> : null}
    </div>
  );
}

const flat = (text: string) => <>flat horizon: {text}</>;

function BodyStats({
  terrain,
  astronomical,
  evidence,
  labels,
}: {
  terrain: HorizonSummary | null;
  astronomical: HorizonSummary;
  evidence: Evidence;
  labels: { mean: string; any: string; hidden: string; visible: string };
}) {
  const main = terrain ?? astronomical;
  const upper = main.any_truncated ? "≤ " : "";
  return (
    <>
      <Stat
        label={labels.mean}
        value={`${upper}${pct(main.mean_visible_disk_fraction)}`}
        note={terrain ? flat(pct(astronomical.mean_visible_disk_fraction)) : "flat horizon only"}
        evidence={evidence}
      />
      <Stat
        label={labels.any}
        value={`${upper}${pct(main.visible_time_fraction)}`}
        note={terrain ? flat(pct(astronomical.visible_time_fraction)) : "flat horizon only"}
        evidence={evidence}
      />
      <Stat
        label={labels.hidden}
        value={duration(main.longest_hidden_s, main.longest_hidden_censored)}
        note={
          terrain
            ? flat(duration(astronomical.longest_hidden_s, astronomical.longest_hidden_censored))
            : "flat horizon only"
        }
        evidence={evidence}
      />
      <Stat
        label={labels.visible}
        value={duration(main.longest_visible_s, main.longest_visible_censored)}
        note={
          main.longest_visible_censored
            ? "touches the window edge: a lower bound"
            : `resolution ± ${duration(main.resolution_s)}`
        }
        evidence={evidence}
      />
    </>
  );
}

export function SiteSummary({
  timeline,
  coordinateEvidence,
}: {
  timeline: SiteTimeline;
  coordinateEvidence: Evidence;
}) {
  const { site, horizon, sun, earth } = timeline;
  const period = `${timeline.start_utc.slice(0, 10)} → ${timeline.end_utc.slice(0, 10)}, every ${
    timeline.step_s / 3600
  } h`;
  return (
    <div className="summary">
      <div className="panel-head">
        <h2>{site.name}</h2>
        <span className="mono dim">
          {formatLatitude(site.latitude_deg)} · {formatLongitude(site.longitude_deg)}{" "}
          <EvidenceBadge
            title={`${site.name}: coordinates`}
            evidence={site.origin === "catalog" ? coordinateEvidence : null}
          />
        </span>
      </div>
      <p className="dim small">
        Statistics over {period} ({timeline.sample_count} samples).{" "}
        {timeline.terrain_horizon_available
          ? "Main values use the terrain horizon; the flat (astronomical) horizon is shown for comparison."
          : `Terrain horizon not available: ${horizon.unavailable_reason ?? "unknown reason"}`}
      </p>

      <h3 className="group sun-text">Sunlight</h3>
      <div className="stats">
        <BodyStats
          terrain={sun.terrain}
          astronomical={sun.astronomical}
          evidence={sun.evidence}
          labels={{
            mean: "Mean visible Sun disc",
            any: "Time with direct sunlight",
            hidden: "Longest darkness",
            visible: "Longest sunlit run",
          }}
        />
      </div>

      <h3 className="group earth-text">Earth line of sight</h3>
      <div className="stats">
        <BodyStats
          terrain={earth.terrain}
          astronomical={earth.astronomical}
          evidence={earth.evidence}
          labels={{
            mean: "Mean visible Earth disc",
            any: "Time with Earth in view",
            hidden: "Longest Earth outage",
            visible: "Longest Earth pass",
          }}
        />
      </div>
      <p className="dim small">Geometric line of sight only. It does not imply a radio link.</p>

      <h3 className="group">Terrain horizon</h3>
      <div className="stats">
        <Stat
          label="Horizon elevation, min … max"
          value={
            horizon.available
              ? `${deg(horizon.min_elevation_deg!)} … ${deg(horizon.max_elevation_deg!)}`
              : "not computed"
          }
          note={
            horizon.available
              ? `${horizon.azimuth_deg!.length} azimuths, ${horizon.max_range_m! / 1000} km; ${
                  horizon.truncated_count
                } truncated`
              : horizon.unavailable_reason
          }
          evidence={horizon.evidence}
        />
        <Stat
          label="Surface height at site"
          value={horizon.available ? `${horizon.surface_height_m!.toFixed(0)} m` : "not sampled"}
          note={
            horizon.available
              ? `above the 1737.4 km sphere; eye ${horizon.observer_height_m} m above it`
              : "site placed on the reference sphere"
          }
          evidence={horizon.evidence}
        />
      </div>
    </div>
  );
}
