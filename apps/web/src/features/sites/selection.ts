/**
 * Which catalogue site a page should analyse, given the `?site=` value in the URL.
 *
 * A shared link can carry a stale or mistyped id. Such an id must never reach the API
 * (it answers with an opaque validation error while the page keeps saying "computing"),
 * so it is checked against the loaded catalogue first.
 */
export interface SiteSelection {
  /** The site to analyse. Null while the catalogue loads, or when the URL names an unknown site. */
  siteId: string | null;
  /** The `?site=` value that matches no catalogue site; null when there is nothing to report. */
  unknownParam: string | null;
}

export function resolveSiteSelection(
  sites: ReadonlyArray<{ id: string }> | undefined,
  siteParam: string | null,
  /** The catalogue request failed: trust the URL and let the API be the judge. */
  catalogueFailed = false,
): SiteSelection {
  const requested = siteParam?.trim() ? siteParam.trim() : null;
  if (requested === null) return { siteId: sites?.[0]?.id ?? null, unknownParam: null };
  if (!sites) return { siteId: catalogueFailed ? requested : null, unknownParam: null };
  // Ids are UUIDs: compare case-insensitively, and answer with the catalogue's own spelling.
  const wanted = requested.toLowerCase();
  const match = sites.find((site) => site.id.toLowerCase() === wanted);
  return match ? { siteId: match.id, unknownParam: null } : { siteId: null, unknownParam: requested };
}
