"use client";

import { describeError } from "@/shared/api/client";
import { useDatasets } from "@/shared/api/queries";

const STATUS_LABEL: Record<string, string> = {
  acquired: "Acquired and verified locally",
  remote_window: "Read over HTTP byte ranges (not stored whole)",
  missing: "Not acquired",
  partial: "Partly acquired",
};

const mb = (bytes: number | null) =>
  bytes === null ? "size unknown" : bytes >= 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : `${(bytes / 1e6).toFixed(1)} MB`;

/** What LUNARIS computes from: every dataset, who made it, how it is used, its hash. */
export function Datasets() {
  const { data, isLoading, isError, error } = useDatasets();
  return (
    <div className="page">
      <div className="page-head">
        <h1>Data sources</h1>
        <span className="dim">
          Every number in LUNARIS traces to one of these. Acquired files are SHA-256 checked.
        </span>
      </div>
      {isLoading ? <p className="dim pad">Loading the registry…</p> : null}
      {isError ? <p className="error">{describeError(error)}</p> : null}
      {data?.datasets.map((d) => (
        <section className="card" key={d.id} aria-label={d.title}>
          <div className="panel-head">
            <h2>{d.title}</h2>
            <span
              className={`flag ${d.local.status === "acquired" || d.local.status === "remote_window" ? "good" : "bad"}`}
            >
              {STATUS_LABEL[d.local.status] ?? d.local.status}
            </span>
          </div>
          <p>{d.summary}</p>
          <p className="dim small">
            {d.provider} · {d.category} · <span className="mono">{d.id}</span> ·{" "}
            <a href={d.source_page} target="_blank" rel="noreferrer">
              source page
            </a>
          </p>
          {d.usage ? <p className="small">{d.usage}</p> : null}
          {d.citation ? <p className="dim small">Cite: {d.citation}</p> : null}
          {d.required_by.length ? (
            <p className="dim small">Required by: {d.required_by.join(", ")}</p>
          ) : null}
          <table className="data">
            <thead>
              <tr>
                <th>File</th>
                <th>Role</th>
                <th>Size</th>
                <th>SHA-256</th>
              </tr>
            </thead>
            <tbody>
              {d.files.map((f) => (
                <tr key={f.name}>
                  <th scope="row" className="mono">
                    {f.name}
                  </th>
                  <td>{f.role}</td>
                  <td>{mb(f.size_bytes)}</td>
                  <td className="mono sha">{f.sha256 ?? "not hashed (remote file; HTTP validators used)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {d.acquire_command && d.local.status !== "acquired" ? (
            <p className="mono small">{d.acquire_command}</p>
          ) : null}
          {d.notes.length ? (
            <ul className="small dim">
              {d.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
