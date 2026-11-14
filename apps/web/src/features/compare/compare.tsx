"use client";

import { useMemo } from "react";

import { WINDOWS } from "@/features/time/windows";
import {
  describeError,
  type ProfileId,
  type SiteComparison,
  type SiteList,
} from "@/shared/api/client";
import { useCompare, useSites } from "@/shared/api/queries";
import { deg, duration, pct } from "@/shared/lib/format";
import { useMissionUrl } from "@/shared/state/url";
import { EvidenceBadge } from "@/shared/ui/evidence";

const MAX_SITES = 10;
const PROFILES: Array<{ id: ProfileId | null; label: string }> = [
  { id: null, label: "No profile" },
  { id: "power", label: "Power" },
  { id: "comms", label: "Comms" },
  { id: "landing", label: "Landing" },
];

type Cell = SiteComparison["rows"][number]["cells"][string];

function formatCell(key: string, cell: Cell): string | null {
  const value = cell.value;
  if (value === null || value === undefined) return null;
  const censored = (cell.limitations ?? []).some((l) => l.startsWith("Longest run touches the window edge"));
  switch (cell.unit) {
    case "fraction":
      return pct(value);
    case "s":
      return duration(value, censored);
    case "deg":
      return key.startsWith("horizon") ? deg(value, 2) : `${value.toFixed(2)}°`;
    case "m":
      return `${value.toFixed(key === "roughness_rms_m" ? 3 : 0)} m`;
    default:
      return String(Math.round(value));
  }
}

/** Sites in the compared set: the URL's `sites`, else the cited demo trio. */
function useSelection(sites: SiteList | undefined) {
  const { params, setParams } = useMissionUrl();
  const raw = params.get("sites");
  const ids = useMemo(() => {
    const known = new Set(sites?.sites.map((s) => s.id) ?? []);
    if (raw !== null) return raw.split(",").filter((id) => known.has(id)).slice(0, MAX_SITES);
    return (sites?.sites ?? []).filter((s) => s.catalog?.demo_trio).map((s) => s.id);
  }, [raw, sites]);
  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(0, MAX_SITES);
    setParams({ sites: next.join(",") || null });
  };
  return { ids, toggle };
}

function Picker({
  sites,
  ids,
  toggle,
}: {
  sites: SiteList;
  ids: string[];
  toggle: (id: string) => void;
}) {
  return (
    <div className="card">
      <div className="panel-head">
        <h2>Sites to compare</h2>
        <span className="dim small">
          {ids.length} of {MAX_SITES} max · coordinates are DEM tile centres, not landing points
        </span>
      </div>
      <ul className="chips">
        {sites.sites.map((s) => {
          const on = ids.includes(s.id);
          const full = !on && ids.length >= MAX_SITES;
          return (
            <li key={s.id}>
              <label className={`chip ${on ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={full}
                  onChange={() => toggle(s.id)}
                />
                {s.name}
                {s.catalog?.demo_trio ? <span className="tag">demo</span> : null}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ComparisonTable({ data }: { data: SiteComparison }) {
  const leaders = new Map(data.summary.leaders.map((l) => [l.key, l]));
  const trails = new Map(
    data.summary.sites.map((s) => [s.site_id, new Set(s.trails)] as const),
  );
  return (
    <div className="card table-scroll">
      <h2>Measures</h2>
      <table className="data compare">
        <thead>
          <tr>
            <th>Measure</th>
            <th>Better</th>
            {data.rows.map((r) => (
              <th key={r.site_id} className="site-col">
                {r.name}
                <div className="dim small">
                  {deg(r.latitude_deg)} / {r.longitude_deg.toFixed(2)}°E
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.columns.map((col) => {
            const lead = leaders.get(col.key);
            return (
              <tr key={col.key}>
                <th scope="row" title={col.description}>
                  {col.label}
                </th>
                <td className="dim small" title={col.better_rationale ?? undefined}>
                  {col.better === "higher" ? "↑ higher" : col.better === "lower" ? "↓ lower" : "—"}
                </td>
                {data.rows.map((r) => {
                  const cell = r.cells[col.key];
                  const text = formatCell(col.key, cell);
                  const best = lead?.site_ids.includes(r.site_id) ?? false;
                  const worst = trails.get(r.site_id)?.has(col.key) ?? false;
                  return (
                    <td key={r.site_id} className={best ? "best" : worst ? "worst" : ""}>
                      {text ?? (
                        <span className="dim" title={cell.reason ?? undefined}>
                          not computed
                        </span>
                      )}{" "}
                      <EvidenceBadge
                        title={`${col.label} · ${r.name}`}
                        evidence={
                          text === null || !cell.evidence
                            ? null
                            : { ...cell.evidence, limitations: cell.limitations }
                        }
                        value={text ?? undefined}
                      />
                      {best ? <span className="mark best-mark" title="Best or tied">▲</span> : null}
                      {worst ? <span className="mark worst-mark" title="Worst">▼</span> : null}
                      {cell.baseline_m ? (
                        <div className="dim small">baseline {cell.baseline_m.toFixed(0)} m</div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="dim small">
        ▲ best or tied among the compared sites · ▼ worst. Only measures with a declared direction
        are ranked; hover “Better” for why. A measure needs values for two or more sites to rank.
      </p>
    </div>
  );
}

function Verdict({ data }: { data: SiteComparison }) {
  const { summary } = data;
  return (
    <div className="card verdict">
      <div className="eyebrow">Verdict</div>
      <p className="verdict-text">{summary.verdict}</p>
      <p className="dim small">
        Built only from per-measure leads, trails and Pareto dominance. No weights are involved.{" "}
        {summary.method}
      </p>
      <ul className="standings">
        {summary.sites.map((s) => (
          <li key={s.site_id}>
            <b>{s.name}</b> · {s.dominance}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Score({ data }: { data: SiteComparison }) {
  const score = data.summary.score;
  if (!score) return null;
  return (
    <div className="card">
      <div className="panel-head">
        <h2>
          {score.profile[0].toUpperCase() + score.profile.slice(1)} profile score{" "}
          <EvidenceBadge title={`${score.profile} profile score`} evidence={score.evidence} />
        </h2>
        <span className="dim small">weights are assumptions chosen by LUNARIS, not requirements</span>
      </div>
      <table className="data">
        <thead>
          <tr>
            <th>Site</th>
            <th>Score (0–1)</th>
          </tr>
        </thead>
        <tbody>
          {score.scores.map((s) => (
            <tr key={s.site_id}>
              <th scope="row">{s.name}</th>
              <td>
                {s.score === null ? (
                  <span className="dim">no score: {s.reason}</span>
                ) : (
                  s.score.toFixed(3)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Weights</h3>
      <ul className="legend">
        {Object.entries(score.weights).map(([key, weight]) => (
          <li key={key}>
            {data.columns.find((c) => c.key === key)?.label ?? key}: <b>{weight}</b>
          </li>
        ))}
      </ul>
      <p className="dim small">{score.normalisation}</p>
    </div>
  );
}

export function Compare() {
  const { windowId, window, params, setParams } = useMissionUrl();
  const sites = useSites();
  const { ids, toggle } = useSelection(sites.data);
  const profileParam = params.get("profile");
  const profile: ProfileId | null =
    profileParam === "power" || profileParam === "comms" || profileParam === "landing"
      ? profileParam
      : null;
  const compare = useCompare(ids, window, profile);
  const data = compare.data;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Compare sites</h1>
        <span className="dim">
          Up to {MAX_SITES} cited sites, same window, a number and its evidence in every cell.
        </span>
      </div>
      <div className="controls">
        <div className="segmented" role="group" aria-label="Analysis window">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={windowId === w.id ? "on" : ""}
              onClick={() => setParams({ window: w.id === "2027" ? null : w.id })}
            >
              {w.label}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Mission profile">
          {PROFILES.map((p) => (
            <button
              key={p.label}
              type="button"
              className={profile === p.id ? "on" : ""}
              onClick={() => setParams({ profile: p.id })}
            >
              {p.label}
            </button>
          ))}
        </div>
        {compare.isFetching ? (
          <span className="dim small">
            Computing… the first read of each site's 20 m terrain and horizon takes a while.
          </span>
        ) : null}
      </div>

      {sites.isError ? <p className="error">{describeError(sites.error)}</p> : null}
      {sites.data ? <Picker sites={sites.data} ids={ids} toggle={toggle} /> : null}
      {ids.length === 0 && sites.data ? (
        <p className="dim pad">Choose at least one site.</p>
      ) : null}
      {compare.isError ? <p className="error">{describeError(compare.error)}</p> : null}
      {compare.isLoading && ids.length > 0 ? (
        <p className="dim pad">Computing the comparison…</p>
      ) : null}

      {data ? (
        <>
          <Verdict data={data} />
          <Score data={data} />
          <ComparisonTable data={data} />
          <div className="card">
            <h3>Assumptions</h3>
            <ul>
              {data.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
