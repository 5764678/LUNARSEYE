"use client";

import { useEffect, useRef, type ReactNode } from "react";

import type { Evidence } from "@/shared/api/client";
import { BRAND } from "@/shared/brand";
import { useEvidence } from "@/shared/state/evidence";

import { Icon } from "./icons";

const KIND: Record<Evidence["kind"], { tag: string; label: string }> = {
  observation: { tag: "OBS", label: "Observation" },
  derived_product: { tag: "DERIVED", label: "Derived data product" },
  model: { tag: "MODEL", label: "Model output" },
  calculation: { tag: "CALC", label: `${BRAND} calculation` },
  assumption: { tag: "ASSUMED", label: "Assumption" },
  placeholder: { tag: "PLACEHOLDER", label: "Placeholder (not decision grade)" },
};

/**
 * What kind of evidence stands behind a table, card or line. Say it once, in the heading,
 * rather than beside every number: the individual numbers open the same evidence through
 * <EvidenceValue>. A missing source is shown as plain "N/C" (not computed), never as a chip.
 */
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
  if (!evidence) {
    return (
      <abbr className="nc" title="Not computed">
        N/C
      </abbr>
    );
  }
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

/** A number that opens the evidence behind it. Plain text when nothing backs it. */
export function EvidenceValue({
  title,
  evidence,
  value,
  children,
}: {
  title: string;
  evidence: Evidence | null | undefined;
  value: string;
  children?: ReactNode;
}) {
  const show = useEvidence((s) => s.show);
  if (!evidence) return <>{children ?? value}</>;
  return (
    <button
      type="button"
      className="inspect"
      aria-label={`${title}: ${value}. Show source, method and limits.`}
      onClick={(event) => {
        event.stopPropagation();
        show(title, evidence, value);
      }}
    >
      {children ?? value}
    </button>
  );
}

/** The source, method and limits behind a number. A native modal <dialog>: it traps focus,
 *  makes the page behind it inert, closes on Escape and returns focus to the control that
 *  opened it, with no custom code. A click on the backdrop lands on the dialog itself. */
export function EvidenceDrawer() {
  const open = useEvidence((s) => s.open);
  const close = useEvidence((s) => s.close);
  const dialog = useRef<HTMLDialogElement>(null);
  const isOpen = open !== null;

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (isOpen && !node.open) {
      node.showModal();
      // Land on the content, so a screen reader reads the title first and Tab reaches Close.
      node.querySelector<HTMLElement>(".drawer-body")?.focus();
    } else if (!isOpen && node.open) {
      node.close();
    }
  }, [isOpen]);

  const kind = open ? KIND[open.evidence.kind] : null;
  return (
    <dialog
      ref={dialog}
      className="drawer"
      aria-labelledby="evidence-title"
      onClose={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {open && kind ? (
        <div className="drawer-body" tabIndex={-1}>
          <header className="drawer-head">
            <div>
              <div className="eyebrow">Evidence</div>
              <h2 id="evidence-title">{open.title}</h2>
              {open.value ? <div className="drawer-value">{open.value}</div> : null}
            </div>
            <button type="button" className="btn icon-only" onClick={close} aria-label="Close evidence">
              <Icon name="close" />
            </button>
          </header>
          <p>
            <span className={`ev ev-${open.evidence.kind}`}>{kind.tag}</span> <b>{kind.label}</b>
          </p>
          <p>{open.evidence.statement}</p>

          {open.evidence.method ? (
            <section>
              <h3>Method</h3>
              <p>{open.evidence.method}</p>
            </section>
          ) : null}

          <section>
            <h3>Sources ({open.evidence.sources?.length ?? 0})</h3>
            {(open.evidence.sources ?? []).length === 0 ? <p className="dim">No external source.</p> : null}
            <ul className="sources">
              {(open.evidence.sources ?? []).map((source) => (
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

          {(open.evidence.assumptions ?? []).length > 0 ? (
            <section>
              <h3>Assumptions</h3>
              <ul>
                {(open.evidence.assumptions ?? []).map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {(open.evidence.limitations ?? []).length > 0 ? (
            <section>
              <h3>Limits</h3>
              <ul>
                {(open.evidence.limitations ?? []).map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
