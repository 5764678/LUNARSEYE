"use client";

/**
 * Shown instead of a page when the URL names a site that is not in the catalogue (an
 * out-of-date or mistyped shared link). The pages would otherwise keep saying "computing"
 * for a request that can never succeed.
 */
export function SiteNotFound({
  requested,
  count,
  fallbackName,
  onUseFallback,
}: {
  requested: string;
  count: number | null;
  fallbackName: string | null;
  onUseFallback: () => void;
}) {
  return (
    <div className="page" role="alert">
      <div className="page-head">
        <h1>Site not found</h1>
      </div>
      <p>
        This link names a site that is not in the catalogue:{" "}
        <span className="mono">{requested.length > 64 ? `${requested.slice(0, 64)}…` : requested}</span>. The link
        may be out of date or mistyped.
      </p>
      <p className="dim">
        Pick {count ? `one of the ${count} cited sites` : "a site"} from the list
        {fallbackName ? ", or start from the first one." : "."}
      </p>
      {fallbackName ? (
        <p>
          <button type="button" className="btn primary" onClick={onUseFallback}>
            Show {fallbackName}
          </button>
        </p>
      ) : null}
    </div>
  );
}
