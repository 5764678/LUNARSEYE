"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { isWindowId, resolveWindow, type WindowId } from "@/features/time/windows";

/**
 * Shareable state lives in the URL: the selected site, the analysis window and (on
 * Compare) the compared set and profile. Links between pages keep the query string.
 */
export function useMissionUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();

  const windowParam = params.get("window");
  const windowId: WindowId = isWindowId(windowParam) ? windowParam : "2027";
  const window = useMemo(() => resolveWindow(windowId), [windowId]);

  const setParams = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(query);
      for (const [name, value] of Object.entries(changes)) {
        if (value === null || value === "") next.delete(name);
        else next.set(name, value);
      }
      const text = next.toString();
      router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
    },
    [query, pathname, router],
  );
  const href = useCallback((path: string) => (query ? `${path}?${query}` : path), [query]);

  return { pathname, params, siteParam: params.get("site"), windowId, window, setParams, href };
}
