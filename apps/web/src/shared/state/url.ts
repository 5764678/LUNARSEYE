"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { isWindowId, resolveWindow, type WindowId } from "@/features/time/windows";

/**
 * Shareable state lives in the URL: the selected site, the analysis window and (on
 * Compare) the compared set and the mission answers. Links between pages keep the query string.
 */
/**
 * The query string asked for by the last `setParams` that the router has not applied yet.
 * Two changes in a row (leave a field, then click a button) must not lose the first one.
 */
let pending: { from: string; to: string } | null = null;

export function useMissionUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();

  const windowParam = params.get("window");
  const windowId: WindowId = isWindowId(windowParam) ? windowParam : "2027";
  const window = useMemo(() => resolveWindow(windowId), [windowId]);

  useEffect(() => {
    pending = null; // the router has moved on: the URL is the truth again
  }, [query]);

  const setParams = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(pending?.from === query ? pending.to : query);
      for (const [name, value] of Object.entries(changes)) {
        if (value === null || value === "") next.delete(name);
        else next.set(name, value);
      }
      const text = next.toString();
      pending = { from: query, to: text };
      router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
    },
    [query, pathname, router],
  );
  const href = useCallback((path: string) => (query ? `${path}?${query}` : path), [query]);

  return { pathname, params, siteParam: params.get("site"), windowId, window, setParams, href };
}
