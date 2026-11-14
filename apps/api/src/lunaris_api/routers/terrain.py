from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Query, Request

from lunaris_api.deps import load_site
from lunaris_api.schemas import ErrorEnvelope
from lunaris_api.schemas_terrain import SiteTerrain, TerrainScene
from lunaris_api.services.terrain import DEFAULT_FOOTPRINT_RADIUS_M, TerrainService

ERRORS: dict[int | str, dict[str, Any]] = {
    code: {"model": ErrorEnvelope} for code in (404, 422, 500, 503)
}
router = APIRouter(prefix="/v1", tags=["terrain"])


def _service(request: Request) -> TerrainService:
    service: TerrainService = request.app.state.terrain
    return service


@router.get(
    "/sites/{site_id}/terrain",
    response_model=SiteTerrain,
    responses=ERRORS,
    operation_id="getSiteTerrain",
)
def site_terrain(
    request: Request,
    site_id: uuid.UUID,
    footprint_radius_m: Annotated[float, Query(gt=0, le=2000)] = DEFAULT_FOOTPRINT_RADIUS_M,
    max_slope_deg: Annotated[float | None, Query(gt=0, lt=90)] = None,
    max_roughness_m: Annotated[float | None, Query(gt=0)] = None,
) -> dict[str, Any]:
    """Height, slope and roughness at a site from the PGDA 20 m DEM. Thresholds are user
    assumptions; without them no hazard flag is returned."""
    return _service(request).site_terrain(
        load_site(request, site_id),
        footprint_radius_m=footprint_radius_m,
        max_slope_deg=max_slope_deg,
        max_roughness_m=max_roughness_m,
    )


@router.get(
    "/terrain/scene", response_model=TerrainScene, responses=ERRORS, operation_id="getTerrainScene"
)
def terrain_scene(
    request: Request, grid_size: Annotated[int, Query(ge=2, le=1024)] = 384
) -> dict[str, Any]:
    """South-pole heightmap (±125 km) for the 3D scene, from LOLA LDEM_75S_240M."""
    return _service(request).scene(grid_size)
