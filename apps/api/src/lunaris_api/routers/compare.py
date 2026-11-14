from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Query, Request

from lunaris_api.deps import load_site
from lunaris_api.errors import InvalidRequestError
from lunaris_api.schemas import ErrorEnvelope
from lunaris_api.schemas_compare import Mission, MissionLimits, Priority, SiteComparison
from lunaris_api.services.compare import MAX_COMPARE_SITES, CompareService
from lunaris_api.services.terrain import DEFAULT_FOOTPRINT_RADIUS_M

ERRORS: dict[int | str, dict[str, Any]] = {
    code: {"model": ErrorEnvelope} for code in (404, 422, 500, 503)
}
router = APIRouter(prefix="/v1", tags=["compare"])


@router.get(
    "/compare", response_model=SiteComparison, responses=ERRORS, operation_id="compareSites"
)
def compare_sites(
    request: Request,
    site_ids: Annotated[
        str, Query(description=f"Comma-separated site ids, 1 to {MAX_COMPARE_SITES} distinct.")
    ],
    start_utc: Annotated[datetime, Query(description="Window start, ISO 8601 with UTC offset")],
    end_utc: Annotated[datetime, Query(description="Window end, ISO 8601 UTC")],
    step_s: Annotated[float, Query(ge=1, le=2_592_000)] = 3600.0,
    footprint_radius_m: Annotated[float, Query(gt=0, le=2000)] = DEFAULT_FOOTPRINT_RADIUS_M,
    power: Annotated[
        Priority,
        Query(description="How much the mission depends on sunlight (none = e.g. nuclear)."),
    ] = "medium",
    comms: Annotated[
        Priority,
        Query(description="How much it depends on direct line of sight to Earth (none = relay)."),
    ] = "medium",
    landing: Annotated[
        Priority, Query(description="How much it needs gentle, smooth terrain.")
    ] = "medium",
    max_slope_deg: Annotated[
        float | None,
        Query(gt=0, le=90, description="Limit: steepest slope (at the site and footprint p95)."),
    ] = None,
    max_darkness_d: Annotated[
        float | None, Query(gt=0, description="Limit: longest darkness survivable, days.")
    ] = None,
    max_earth_outage_d: Annotated[
        float | None, Query(gt=0, description="Limit: longest gap without Earth in view, days.")
    ] = None,
    min_sunlit_d: Annotated[
        float | None, Query(gt=0, description="Limit: continuous sunlight required, days.")
    ] = None,
) -> dict[str, Any]:
    """Compare up to 10 sites: per-measure leaders, Pareto dominance, a verdict built from
    them, and a recommendation for the stated mission (priorities and limits; every weight
    and scale is returned as an assumption). Sites that break a limit are excluded."""
    ids: list[uuid.UUID] = []
    for raw in site_ids.split(","):
        raw = raw.strip()
        if not raw:
            continue
        try:
            value = uuid.UUID(raw)
        except ValueError:
            raise InvalidRequestError(
                f"{raw!r} is not a site id", "site_id", ["query", "site_ids"]
            ) from None
        if value not in ids:
            ids.append(value)
    sites = [load_site(request, i) for i in ids]  # 404 for unknown ids
    service: CompareService = request.app.state.compare
    mission = Mission(
        power=power,
        comms=comms,
        landing=landing,
        limits=MissionLimits(
            max_slope_deg=max_slope_deg,
            max_darkness_d=max_darkness_d,
            max_earth_outage_d=max_earth_outage_d,
            min_sunlit_d=min_sunlit_d,
        ),
    )
    return service.compare(
        sites, start_utc, end_utc, step_s, footprint_radius_m=footprint_radius_m, mission=mission
    )
