"""Request-scoped access to application state."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import Request

from lunaris_api import db
from lunaris_api.errors import NotFoundError
from lunaris_api.services.analysis import AnalysisService
from lunaris_data.catalogs.sites import load_site_catalog


def analysis(request: Request) -> AnalysisService:
    service: AnalysisService = request.app.state.analysis
    return service


def _catalog_by_uuid() -> dict[uuid.UUID, Any]:
    return {db.catalog_site_uuid(s.id): s for s in load_site_catalog().sites}


def site_out(site: db.Site) -> dict[str, Any]:
    entry = _catalog_by_uuid().get(site.id)
    return {
        "id": str(site.id),
        "name": site.name,
        "latitude_deg": site.lat_deg,
        "longitude_deg": site.lon_deg,
        "frame": site.frame,
        "origin": site.origin,
        "reference": site.reference,
        "notes": site.notes,
        "created_at_utc": site.created_at,
        "catalog": (
            {
                "catalog_site_id": entry.id,
                "pgda_site_id": entry.pgda_site_id,
                "artemis_iii_2022_region": entry.artemis_iii_2022_region,
                "demo_trio": entry.demo_trio,
                "tile_url": str(entry.tile.url),
            }
            if entry
            else None
        ),
    }


def load_site(request: Request, site_id: uuid.UUID) -> dict[str, Any]:
    site = db.get_site(request.app.state.engine, site_id)
    if site is None:
        raise NotFoundError(f"No site with id {site_id}.")
    return site_out(site)
