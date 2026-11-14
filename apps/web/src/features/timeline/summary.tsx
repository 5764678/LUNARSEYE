"use client";

import type { Evidence, HorizonSummary, SiteTimeline } from "@/shared/api/client";
import { deg, duration, pct } from "@/shared/lib/format";
import { formatLatitude, formatLongitude } from "@/shared/lib/geo/selenographic";
import { EvidenceBadge, EvidenceValue } from "@/shared/ui/evidence";

interface Labels {
  mean: string;
  any: string;
  hidden: string;
  visible: string;
}

function StatRow({
  label,
  title,
  evidence,
  terrain,
  flat,
}: {
  label: string;
  title: string;
  evidence: Evidence;
  terrain: string | null;
  flat: string;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="num">
        {terrain === null ? (
          <span className="dim">not computed</span>
        ) : (
          <EvidenceValue title={`${title}: ${label} (terrain horizon)`} evidence={evidence} value={terrain} />
        )}
      </td>
      <td className="num dim">
        <EvidenceValue title={`${title}: ${label} (flat horizon)`} evidence={evidence} value={flat} />
      </td>
    </tr>
  );
}

/** One body's four statistics: terrain horizon beside the flat horizon, one row each. The
 *  evidence kind sits once in the header; each value opens the evidence behind it. */
function BodyStats({
  title,
  tone,
  terrain,
  astronomical,
  evidence,
  labels,
}: {
  title: string;
  tone: "sun-text" | "earth-text";
  terrain: HorizonSummary | null;
  astronomical: HorizonSummary;
  evidence: Evidence;
  labels: Labels;
}) {
  const upper = terrain?.any_truncated ? "≤ " : "";
  const row = (label: string, get: (s: HorizonSummary) => string, bound = false) => (
    <StatRow
      label={label}
      title={title}
      evidence={evidence}
      terrain={terrain ? `${bound ? upper : ""}${get(terrain)}` : null}
      flat={get(astronomical)}
    />
  );
  return (
    <table className="data stats">
      <caption className="sr-only">{title}: terrain horizon against flat horizon</caption>
      <thead>
        <tr>
          <th scope="col" className="group-th">
            <span className={tone}>{title}</span>
            <EvidenceBadge title={title} evidence={evidence} />
          </th>
          <th scope="col" className="num">
            Terrain
          </th>
          <th scope="col" className="num">
            Flat
          </th>
        </tr>
      </thead>
      <tbody>
        {row(labels.mean, (s) => pct(s.mean_visible_disk_fraction), true)}
        {row(labels.any, (s) => pct(s.visible_time_fraction), true)}
        {row(labels.hidden, (s) => duration(s.longest_hidden_s, s.longest_hidden_censored))}
        {row(labels.visible, (s) => duration(s.longest_visible_s, s.longest_visible_censored))}
      </tbody>
    </table>
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
  const period = `${timeline.start_utc.slice(0, 10)} → ${timeline.end_utc.slice(0, 10)} · every ${
    timeline.step_s / 3600
  } h · ${timeline.sample_count} samples`;
  const elevationRange = horizon.available ? `${deg(horizon.min_elevation_deg!)} … ${deg(horizon.max_elevation_deg!)}` : null;
  const surfaceHeight = horizon.available ? `${horizon.surface_height_m!.toFixed(0)} m` : null;
  return (
    <div className="summary">
      <div className="summary-head">
        <h2>{site.name}</h2>
        <span className="mono dim">
          {formatLatitude(site.latitude_deg)} · {formatLongitude(site.longitude_deg)}{" "}
          <EvidenceBadge
            title={`${site.name}: coordinates`}
            evidence={site.origin === "catalog" ? coordinateEvidence : null}
          />
        </span>
      </div>
      <p className="summary-caption">
        {period}. Run lengths are ± {duration(timeline.step_s)}; ≤ and ≥ mark bounds.
        {timeline.terrain_horizon_available
          ? ""
          : ` Terrain horizon not available: ${horizon.unavailable_reason ?? "unknown reason"}`}
      </p>

      <div className="stat-group">
        <BodyStats
          title="Sunlight"
          tone="sun-text"
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

      <div className="stat-group">
        <BodyStats
          title="Earth line of sight"
          tone="earth-text"
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
        <p className="summary-foot">Geometric line of sight only. It does not imply a radio link.</p>
      </div>

      <div className="stat-group">
        <table className="data stats">
          <caption className="sr-only">Terrain horizon</caption>
          <thead>
            <tr>
              <th scope="col" className="group-th" colSpan={2}>
                <span>Terrain horizon</span>
                <EvidenceBadge title="Terrain horizon" evidence={horizon.evidence} />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">
                Horizon elevation, min … max
                <span className="row-note">
                  {horizon.available
                    ? `${horizon.azimuth_deg!.length} azimuths, ${horizon.max_range_m! / 1000} km; ${horizon.truncated_count} truncated`
                    : horizon.unavailable_reason}
                </span>
              </th>
              <td className="num">
                {elevationRange === null ? (
                  <span className="dim">not computed</span>
                ) : (
                  <EvidenceValue title="Horizon elevation, min … max" evidence={horizon.evidence} value={elevationRange} />
                )}
              </td>
            </tr>
            <tr>
              <th scope="row">
                Surface height at site
                <span className="row-note">
                  {horizon.available
                    ? `above the 1737.4 km sphere; eye ${horizon.observer_height_m} m above it`
                    : "site placed on the reference sphere"}
                </span>
              </th>
              <td className="num">
                {surfaceHeight === null ? (
                  <span className="dim">not sampled</span>
                ) : (
                  <EvidenceValue title="Surface height at site" evidence={horizon.evidence} value={surfaceHeight} />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
