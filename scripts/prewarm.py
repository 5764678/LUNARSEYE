"""Warm the on-disk caches for every catalogue site so the first visitor does not wait.

Runs during the Docker build (and can be run by hand): for each cited site it computes the
terrain horizon mask (written under data/processed/), reads the PGDA 20 m window the terrain
analysis needs, and bakes the timelines the web app asks for by default (year 2027, 90 days and
30 days, hourly) to data/processed/timelines/, where the API serves them without computing. A site that fails is reported and skipped; the build never fails
here because the same work happens lazily at request time.

    LUNARIS_DATA_DIR=data uv run python scripts/prewarm.py
"""

from __future__ import annotations

import sys
import time
from datetime import UTC, datetime, timedelta

from lunaris_api import db
from lunaris_api.errors import ApiError
from lunaris_api.services.analysis import AnalysisService
from lunaris_api.services.terrain import TerrainService
from lunaris_data.catalogs.sites import load_site_catalog


def main() -> int:
    analysis = AnalysisService.from_env()
    terrain = TerrainService(analysis.registry, analysis.layout, analysis.masks)
    sites = load_site_catalog().sites
    start = datetime(2027, 1, 1, tzinfo=UTC)
    windows = [
        (start, datetime(2028, 1, 1, tzinfo=UTC)),
        (start, start + timedelta(days=90)),
        (start, start + timedelta(days=30)),
    ]  # keep in step with apps/web/src/features/time/windows.ts
    ok_mask = ok_terrain = ok_timeline = 0
    started = time.perf_counter()
    for s in sites:
        site = {
            "id": str(db.catalog_site_uuid(s.id)),
            "name": s.name,
            "latitude_deg": s.reference_point.latitude_deg,
            "longitude_deg": s.reference_point.longitude_deg,
        }
        for label, work in (
            ("mask", lambda site=site: analysis.masks.get_mask(
                latitude_deg=site["latitude_deg"], longitude_deg=site["longitude_deg"]
            )),
            ("terrain", lambda site=site: terrain.site_terrain(site)),
            (
                "timeline",
                lambda site=site: [
                    analysis.site_timeline(site, a, b, 3600.0, cache=False, persist=True)
                    for a, b in windows
                ],
            ),
        ):
            try:
                work()
                ok_mask += label == "mask"
                ok_terrain += label == "terrain"
                ok_timeline += label == "timeline"
            except ApiError as exc:
                print(f"  skip {label} for {site['name']}: {exc.message}", file=sys.stderr)
    print(
        f"prewarmed {ok_mask}/{len(sites)} horizon masks, {ok_terrain}/{len(sites)} terrain "
        f"windows and {ok_timeline}/{len(sites)} timeline sets in {time.perf_counter() - started:.0f} s"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
