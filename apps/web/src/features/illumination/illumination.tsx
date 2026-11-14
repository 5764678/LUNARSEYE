"use client";

import type { BodySeries, Evidence, HorizonSummary, SiteTimeline } from "@/shared/api/client";
import { TimeControls } from "@/features/time/controls";
import { describeError } from "@/shared/api/client";
import { useSelectedSite, useTimeline } from "@/shared/api/queries";
import { duration, pct } from "@/shared/lib/format";
import { formatLatitude, formatLongitude } from "@/shared/lib/geo/selenographic";
import { clamp, formatUtc } from "@/shared/lib/time/time";
import { useTime } from "@/shared/state/time";
import { useMissionUrl } from "@/shared/state/url";
import { EvidenceBadge } from "@/shared/ui/evidence";

import { SkyChart } from "./sky-chart";

const MAX_WINDOWS_SHOWN = 40;

interface Row {
  label: string;
  value: (s: HorizonSummary) => string;
}

function rows(names: { visible: string; hidden: string; any: string }): Row[] {
  return [
    { label: "Mean visible disc", value: (s) => `${s.any_truncated ? "≤ " : ""}${pct(s.mean_visible_disk_fraction)}` },
    { label: names.any, value: (s) => `${s.any_truncated ? "≤ " : ""}${pct(s.visible_time_fraction)}` },
    { label: "Time with the whole disc visible", value: (s) => pct(s.fully_visible_time_fraction) },
    { label: names.visible, value: (s) => duration(s.longest_visible_s, s.longest_visible_censored) },
    { label: names.hidden, value: (s) => duration(s.longest_hidden_s, s.longest_hidden_censored) },
  ];
}

function SummaryTable({ title, body, list }: { title: string; body: BodySeries; list: Row[] }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <table className="data">
        <thead>
          <tr>
            <th scope="col">Measure</th>
            <th scope="col">Terrain horizon</th>
            <th scope="col">No hills (0°)</th>
          </tr>
        </thead>
        <tbody>
          {list.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>
                {body.terrain ? row.value(body.terrain) : "not computed"}{" "}
                <EvidenceBadge
                  title={`${title}: ${row.label} (terrain horizon)`}
                  evidence={body.terrain ? body.evidence : null}
                  value={body.terrain ? row.value(body.terrain) : undefined}
                />
              </td>
              <td>
                {row.value(body.astronomical)}{" "}
                <EvidenceBadge
                  title={`${title}: ${row.label} (astronomical horizon)`}
                  evidence={body.evidence}
                  value={row.value(body.astronomical)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WindowTable({ title, body, evidence }: { title: string; body: BodySeries; evidence: Evidence }) {
  const summary = body.terrain ?? body.astronomical;
  const windows = summary.visible_windows;
  const shown = windows.slice(0, MAX_WINDOWS_SHOWN);
  return (
    <div className="card">
      <div className="panel-head">
        <h2>
          {title} <EvidenceBadge title={title} evidence={evidence} />
        </h2>
        <span className="dim small">
          {windows.length} windows · {summary.horizon} horizon · edges ± {duration(summary.resolution_s)}
        </span>
      </div>
      {windows.length === 0 ? (
        <p className="dim">None in this period.</p>
      ) : (
        <table className="data mono">
          <thead>
            <tr>
              <th scope="col">Start (UTC)</th>
              <th scope="col">End (UTC)</th>
              <th scope="col">Duration</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((w) => (
              <tr key={w.start_utc}>
                <td>
                  {w.censored_start ? "≤ " : ""}
                  {formatUtc(Date.parse(w.start_utc), false)}
                </td>
                <td>
                  {w.censored_end ? "≥ " : ""}
                  {formatUtc(Date.parse(w.end_utc), false)}
                </td>
                <td>{duration(w.duration_s, w.censored_start || w.censored_end)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {windows.length > shown.length ? (
        <p className="dim small">
          Showing the first {shown.length} of {windows.length}. Shorten the period to see the rest.
        </p>
      ) : null}
      <p className="dim small">
        “≥” marks a window that touches the edge of the analysis period: it started before or
        continues after it, so its duration is a lower bound.
      </p>
    </div>
  );
}

function Loaded({ timeline }: { timeline: SiteTimeline }) {
  const { window } = useMissionUrl();
  const epochMs = useTime((s) => s.epochMs) ?? window.startMs;
  const index = clamp(
    Math.round((epochMs - window.startMs) / (timeline.step_s * 1000)),
    0,
    timeline.sample_count - 1,
  );
  const { horizon, sun, earth } = timeline;
  return (
    <>
      <div className="card">
        <div className="panel-head">
          <h2>
            Sky from the site{" "}
            <EvidenceBadge title="Terrain skyline" evidence={horizon.evidence} />
          </h2>
          <span className="dim small">
            dots: positions at {formatUtc(Date.parse(timeline.epochs_utc[index]!), false)} UTC
          </span>
        </div>
        {horizon.available ? (
          <>
            <SkyChart horizon={horizon} sun={sun} earth={earth} index={index} />
            <ul className="legend">
              <li>
                <i style={{ background: "var(--horizon)" }} />
                Terrain skyline (LOLA 240 m, {horizon.azimuth_deg!.length} azimuths,{" "}
                {horizon.max_range_m! / 1000} km)
              </li>
              <li>
                <i style={{ background: "var(--sun)" }} />
                Sun, bar = disc height{" "}
                <EvidenceBadge title="Sun azimuth and elevation" evidence={sun.geometry_evidence} />
              </li>
              <li>
                <i style={{ background: "var(--earth)" }} />
                Earth, bar = disc height{" "}
                <EvidenceBadge title="Earth azimuth and elevation" evidence={earth.geometry_evidence} />
              </li>
              <li>
                {horizon.truncated_count
                  ? `▲ ${horizon.truncated_count} azimuths where the ray left DEM coverage: the skyline there is a lower bound`
                  : "No truncated azimuths: every ray stayed inside DEM coverage"}
              </li>
            </ul>
            <p className="dim small">
              Azimuth runs clockwise from local north. The two axes have different scales, so a
              disc appears as a bar. Where a bar dips under the skyline, that part of the disc
              is hidden by terrain.
            </p>
          </>
        ) : (
          <p className="dim">
            N/C · terrain skyline not computed: {horizon.unavailable_reason}. The tables below
            report the astronomical horizon only.
          </p>
        )}
        <TimeControls />
      </div>

      <div className="cols">
        <SummaryTable
          title="Sunlight"
          body={sun}
          list={rows({ any: "Time with direct sunlight", visible: "Longest sunlit run", hidden: "Longest darkness" })}
        />
        <SummaryTable
          title="Earth line of sight"
          body={earth}
          list={rows({ any: "Time with Earth in view", visible: "Longest Earth pass", hidden: "Longest Earth outage" })}
        />
      </div>
      <p className="dim small">
        Period {timeline.start_utc.slice(0, 10)} → {timeline.end_utc.slice(0, 10)}, every{" "}
        {timeline.step_s / 3600} h ({timeline.sample_count} samples). Published illumination
        values use other periods and DEMs, so they are not directly comparable. Earth
        visibility is geometric line of sight only and does not imply a radio link.
      </p>

      <div className="cols">
        <WindowTable title="Sunlit windows" body={sun} evidence={sun.evidence} />
        <WindowTable title="Earth-visible windows" body={earth} evidence={earth.evidence} />
      </div>
    </>
  );
}

export function Illumination() {
  const { window } = useMissionUrl();
  const { siteId, site } = useSelectedSite();
  const timeline = useTimeline(siteId, window);
  return (
    <div className="page">
      <div className="page-head">
        <h1>Illumination &amp; Earth{site ? ` · ${site.name}` : ""}</h1>
        {site ? (
          <span className="mono dim">
            {formatLatitude(site.latitude_deg)} · {formatLongitude(site.longitude_deg)}
          </span>
        ) : null}
      </div>
      {timeline.isError ? <p className="error">{describeError(timeline.error)}</p> : null}
      {timeline.data ? (
        <Loaded timeline={timeline.data} />
      ) : !timeline.isError ? (
        <p className="dim">Computing the sky and timelines…</p>
      ) : null}
    </div>
  );
}
