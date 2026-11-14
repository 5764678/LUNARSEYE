"""Warm the on-disk caches for every catalogue site so the first visitor does not wait.

Runs during the Docker build (and can be run by hand): for each cited site it computes the
terrain horizon mask (written under data/processed/) and reads the PGDA 20 m window the
terrain analysis needs. A site that fails is reported and skipped; the build never fails
here because the same work happens lazily at request time.

    LUNARIS_DATA_DIR=data uv run python scripts/prewarm.py
"""

from __future__ import annotations

import sys
import time

from lunaris_api import db
from lunaris_api.errors import ApiError
from lunaris_api.services.analysis import AnalysisService
from lunaris_api.services.terrain import TerrainService
from lunaris_data.catalogs.sites import load_site_catalog


def main() -> int:
    analysis = AnalysisService.from_env()
    terrain = TerrainService(analysis.registry, analysis.layout, analysis.masks)
    sites = load_site_catalog().sites
    ok_mask = ok_terrain = 0
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
        ):
            try:
                work()
                ok_mask += label == "mask"
                ok_terrain += label == "terrain"
            except ApiError as exc:
                print(f"  skip {label} for {site['name']}: {exc.message}", file=sys.stderr)
    print(
        f"prewarmed {ok_mask}/{len(sites)} horizon masks and {ok_terrain}/{len(sites)} terrain "
        f"windows in {time.perf_counter() - started:.0f} s"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
