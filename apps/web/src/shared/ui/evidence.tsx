"use client";

import { useEffect } from "react";

import type { Evidence } from "@/shared/api/client";
import { useEvidence } from "@/shared/state/evidence";

const KIND: Record<Evidence["kind"], { tag: string; label: string }> = {
  observation: { tag: "OBS", label: "Observation" },
  derived_product: { tag: "DERIVED", label: "Derived data product" },
  model: { tag: "MODEL", label: "Model output" },
  calculation: { tag: "CALC", label: "LUNAREYES calculation" },
  assumption: { tag: "ASSUMED", label: "Assumption" },
  placeholder: { tag: "PLACEHOLDER", label: "Placeholder (not decision grade)" },
};

/** Small tag next to a number; opens the source, method and limits behind it. */
export function EvidenceBadge({
  title,
  evidence,
  value,
}: {
  title: string;
  evidence: Evidence | null | undefined;
  value?: string;
}) {
  const show = useEvidence((s) => s.show);
  if (!evidence) return <span className="ev ev-none">N/C</span>;
  const kind = KIND[evidence.kind];
  return (
    <button
      type="button"
      className={`ev ev-${evidence.kind}`}
      title={`${kind.label}: show source, method and limits`}
      aria-label={`Evidence for ${title}: ${kind.label}`}
      onClick={(event) => {
        event.stopPropagation();
        show(title, evidence, value);
      }}
    >
      {kind.tag}
    </button>
  );
}

export function EvidenceDrawer() {
  const open = useEvidence((s) => s.open);
  const close = useEvidence((s) => s.close);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  if (!open) return null;
  const { evidence, title, value } = open;
  const kind = KIND[evidence.kind];
  return (
    <div className="drawer-backdrop" onClick={close}>
      <aside
        className="drawer"
        role="dialog"
        aria-label={`Evidence: ${title}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <div className="eyebrow">Evidence</div>
            <h2>{title}</h2>
            {value ? <div className="drawer-value">{value}</div> : null}
          </div>
          <button type="button" className="btn" onClick={close} aria-label="Close">
            ✕
          </button>
        </header>
        <p>
          <span className={`ev ev-${evidence.kind}`}>{kind.tag}</span> <b>{kind.label}</b>
        </p>
        <p>{evidence.statement}</p>

        {evidence.method ? (
          <section>
            <h3>Method</h3>
            <p>{evidence.method}</p>
          </section>
        ) : null}

        <section>
          <h3>Sources ({evidence.sources?.length ?? 0})</h3>
          {(evidence.sources ?? []).length === 0 ? <p className="dim">No external source.</p> : null}
          <ul className="sources">
            {(evidence.sources ?? []).map((source) => (
              <li key={source.source_id}>
                <div className="source-title">{source.title}</div>
                <div className="mono dim">{source.source_id}</div>
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.url}
                  </a>
                ) : null}
                {source.sha256 ? (
                  <div className="mono sha" title="SHA-256 of the file actually used">
                    sha256 {source.sha256}
                  </div>
                ) : null}
                {source.citation ? <div className="dim">{source.citation}</div> : null}
              </li>
            ))}
          </ul>
        </section>

        {(evidence.assumptions ?? []).length > 0 ? (
          <section>
            <h3>Assumptions</h3>
            <ul>
              {(evidence.assumptions ?? []).map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {(evidence.limitations ?? []).length > 0 ? (
          <section>
            <h3>Limits</h3>
            <ul>
              {(evidence.limitations ?? []).map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
