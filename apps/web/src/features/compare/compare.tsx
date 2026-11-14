"use client";

import { useMemo, useState } from "react";

import { WINDOWS } from "@/features/time/windows";
import {
  describeError,
  type MissionAnswers,
  type SiteComparison,
  type SiteList,
} from "@/shared/api/client";
import { useCompare, useSites } from "@/shared/api/queries";
import { deg, duration, pct } from "@/shared/lib/format";
import { useMissionUrl } from "@/shared/state/url";
import { EvidenceBadge } from "@/shared/ui/evidence";

import {
  isDefaultMission,
  LIMIT_QUESTIONS,
  NEED_QUESTIONS,
  parseLimit,
  parseMission,
  PRIORITY_OPTIONS,
  RESET_MISSION,
} from "./mission";

const MAX_SITES = 10;

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
  const recommended = data.summary.recommendation.site_id;
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
                {r.site_id === recommended ? <span className="tag pick-tag">recommended</span> : null}
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

type SetParams = (changes: Record<string, string | null>) => void;

/** A limit is committed on blur or Enter, so a half-typed number does not refetch. */
function LimitInput({
  label,
  unit,
  placeholder,
  value,
  onCommit,
}: {
  label: string;
  unit: string;
  placeholder: string;
  value: number | null;
  onCommit: (value: number | null) => void;
}) {
  const text = value === null ? "" : String(value);
  const [draft, setDraft] = useState(text);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(text);
  }
  const commit = () => {
    const parsed = parseLimit(draft);
    if (parsed === value) setDraft(text);
    else onCommit(parsed);
  };
  return (
    <label>
      {label}
      <span className="limit-field">
        <input
          inputMode="decimal"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === "Enter" && commit()}
        />
        <span className="dim">{unit}</span>
      </span>
    </label>
  );
}

function MissionQuestions({ mission, setParams }: { mission: MissionAnswers; setParams: SetParams }) {
  return (
    <div className="card mission">
      <div className="panel-head">
        <h2>What does this mission need?</h2>
        {isDefaultMission(mission) ? (
          <span className="dim small">
            Starting point: every need counts as Important, no limits. Change any answer to override.
          </span>
        ) : (
          <button type="button" className="btn" onClick={() => setParams(RESET_MISSION)}>
            Reset answers
          </button>
        )}
      </div>
      <div className="questions">
        {NEED_QUESTIONS.map((q) => (
          <div className="question" key={q.id}>
            <div>
              <div className="question-text">{q.question}</div>
              <div className="dim small">{q.hint}</div>
            </div>
            <div className="segmented" role="group" aria-label={q.question}>
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={mission[q.id] === option.id ? "on" : ""}
                  aria-pressed={mission[q.id] === option.id}
                  onClick={() => setParams({ [q.id]: option.id === "medium" ? null : option.id })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <h3>Hard limits (optional)</h3>
      <p className="dim small">
        A site that breaks a limit is excluded and listed with the reason. It is never just scored
        lower. Leave a field empty for no limit.
      </p>
      <div className="form limits">
        {LIMIT_QUESTIONS.map((limit) => (
          <LimitInput
            key={limit.id}
            label={limit.question}
            unit={limit.unit}
            placeholder={limit.placeholder}
            value={mission[limit.id]}
            onCommit={(value) => setParams({ [limit.param]: value === null ? null : String(value) })}
          />
        ))}
      </div>
    </div>
  );
}

type Rec = SiteComparison["summary"]["recommendation"];

const CONFIDENCE: Record<Rec["confidence"], string> = {
  clear: "Clear lead",
  moderate: "Moderate lead",
  narrow: "Narrow lead",
  tie: "Tie",
  only_option: "Only option",
  none: "No pick",
};

const points = (score: number | null | undefined) =>
  score === null || score === undefined ? "–" : (score * 100).toFixed(1);

function Recommendation({ data }: { data: SiteComparison }) {
  const rec = data.summary.recommendation;
  const top = rec.ranking.find((e) => e.site_id === rec.site_id);
  return (
    <div className={`card recommendation conf-${rec.confidence}`}>
      <div className="panel-head">
        <div className="eyebrow">Recommended site for this mission</div>
        <span className="dim small">
          weights and scales are assumptions{" "}
          <EvidenceBadge
            title="Mission-fit score"
            evidence={rec.evidence}
            value={top ? `${points(top.score)} / 100` : undefined}
          />
        </span>
      </div>
      <div className="rec-pick">
        <span className="rec-name">{rec.name ?? "No site qualifies"}</span>
        {top ? <span className="rec-score">{points(top.score)} / 100</span> : null}
        <span className="conf-chip">{CONFIDENCE[rec.confidence]}</span>
      </div>
      <p className="rec-headline">{rec.headline}</p>
      {rec.reasons.length + rec.tradeoffs.length > 0 ? (
        <div className="rec-why">
          <div>
            <h3>Why</h3>
            <ul>
              {rec.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>What it gives up</h3>
            {rec.tradeoffs.length > 0 ? (
              <ul>
                {rec.tradeoffs.map((tradeoff) => (
                  <li key={tradeoff}>{tradeoff}</li>
                ))}
              </ul>
            ) : (
              <p className="dim">Nothing among the needs this mission weights.</p>
            )}
          </div>
        </div>
      ) : null}
      {rec.robustness ? (
        <p className={rec.robustness.flips.length > 0 ? "rec-robust shaky" : "rec-robust"}>
          {rec.robustness.statement}
        </p>
      ) : null}
      {rec.caveats.map((caveat) => (
        <p key={caveat} className="caveat">
          {caveat}
        </p>
      ))}
      <h3>All compared sites</h3>
      <div className="table-scroll">
        <table className="data ranking">
          <thead>
            <tr>
              <th>#</th>
              <th>Site</th>
              <th>Mission fit (0–100)</th>
              {rec.needs.map((need) => (
                <th key={need.need} className={need.weight === 0 ? "off" : ""}>
                  {need.label}
                  <div className="dim small">
                    {need.weight === 0 ? "not counted" : `${(need.weight * 100).toFixed(0)} % of the score`}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rec.ranking.map((entry) => (
              <tr key={entry.site_id} className={`status-${entry.status}`}>
                <td>{entry.rank ?? "–"}</td>
                <th scope="row">{entry.name}</th>
                <td>
                  {entry.score === null || entry.score === undefined ? (
                    <span className="dim">
                      {entry.status === "excluded" ? "Excluded: " : "No score: "}
                      {(entry.reasons ?? []).join("; ")}
                    </span>
                  ) : (
                    <span className="fit">
                      <span className="fit-bar">
                        <i style={{ width: `${entry.score * 100}%` }} />
                      </span>
                      {points(entry.score)}
                    </span>
                  )}
                </td>
                {rec.needs.map((need) => (
                  <td key={need.need} className={need.weight === 0 ? "off" : ""}>
                    {points(entry.need_scores?.[need.need])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="dim small">
        Each need is scored on fixed scales, so a site's score does not change when other sites are
        added or removed. Open the ASSUMED tag for every weight, scale and limit. {rec.method}
      </p>
    </div>
  );
}

function Verdict({ data }: { data: SiteComparison }) {
  const { summary } = data;
  return (
    <div className="card verdict">
      <div className="eyebrow">Trade-offs, measure by measure</div>
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

export function Compare() {
  const { windowId, window, params, setParams } = useMissionUrl();
  const sites = useSites();
  const { ids, toggle } = useSelection(sites.data);
  const query = params.toString();
  const mission = useMemo(() => parseMission(new URLSearchParams(query)), [query]);
  const compare = useCompare(ids, window, mission);
  const data = compare.data;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Compare sites</h1>
        <span className="dim">
          Up to {MAX_SITES} cited sites, same window. Say what the mission needs and get one
          recommended site, with a number and its evidence in every cell.
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
        {compare.isFetching ? (
          <span className="dim small">
            Computing… the first read of each site's 20 m terrain and horizon takes a while.
          </span>
        ) : null}
      </div>

      {sites.isError ? <p className="error">{describeError(sites.error)}</p> : null}
      <MissionQuestions mission={mission} setParams={setParams} />
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
          <Recommendation data={data} />
          <Verdict data={data} />
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
