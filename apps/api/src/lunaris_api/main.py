"""LUNARIS Round 2 API (Phase 1: one end-to-end path).

    uv run uvicorn lunaris_api.main:app --port 8000

Routes: ``GET /health``, ``GET /v1/sites``, ``GET /v1/sites/{id}``,
``GET /v1/sites/{id}/timeline``, ``GET /v1/sites/{id}/terrain``, ``GET /v1/terrain/scene``,
``GET /v1/compare``, ``GET /v1/ephemeris/sun``. No auth (explicit non-goal).
"""

from __future__ import annotations

import logging
import os
import re
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import FastAPI, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from lunaris_api import __version__, db
from lunaris_api.deps import load_site, site_out
from lunaris_api.errors import ApiError
from lunaris_api.routers import compare as compare_router
from lunaris_api.routers import terrain as terrain_router
from lunaris_api.schemas import ErrorEnvelope, Health, SiteList, SiteOut, SiteTimeline, SunDirection
from lunaris_api.services.analysis import AnalysisService
from lunaris_api.services.compare import CompareService
from lunaris_api.services.terrain import TerrainService
from lunaris_data.catalogs.sites import load_site_catalog

log = logging.getLogger("lunaris.api")
SITE_LIMIT = 250
REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,128}$")
ERRORS: dict[int | str, dict[str, Any]] = {
    code: {"model": ErrorEnvelope} for code in (404, 422, 500, 503)
}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.engine = db.make_engine()
    db.init_db(app.state.engine)
    app.state.analysis = AnalysisService.from_env()
    app.state.terrain = TerrainService(
        app.state.analysis.registry, app.state.analysis.layout, app.state.analysis.masks
    )
    app.state.compare = CompareService(app.state.analysis, app.state.terrain)
    try:  # load kernels and the DEM once, before the first request
        app.state.analysis.spice()
        app.state.analysis.masks.load_dem()
    except ApiError as exc:
        log.warning("science data not ready: %s", exc.message)
    yield
    app.state.engine.dispose()


app = FastAPI(
    title="LUNARIS API",
    version=__version__,
    description="Lunar south-pole site analysis: SPICE geometry, terrain-aware sunlight and "
    "Earth line of sight, with evidence on every number.",
    lifespan=lifespan,
)
app.add_middleware(GZipMiddleware, minimum_size=2048)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip()
        for o in os.environ.get(
            "LUNARIS_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
        ).split(",")
        if o.strip()
    ],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)

app.include_router(terrain_router.router)
app.include_router(compare_router.router)


@app.middleware("http")
async def request_id(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    incoming = request.headers.get("X-Request-ID", "")
    request.state.request_id = incoming if REQUEST_ID.match(incoming) else uuid.uuid4().hex
    try:
        response = await call_next(request)
    except Exception:  # unhandled: log with the id, return the envelope without internals
        log.exception("unhandled error request_id=%s", request.state.request_id)
        response = _envelope(request, 500, "internal_error", "Internal server error.")
    response.headers["X-Request-ID"] = request.state.request_id
    return response


def _envelope(
    request: Request, status: int, code: str, message: str, details: list[Any] | None = None
) -> JSONResponse:
    rid = getattr(request.state, "request_id", uuid.uuid4().hex)
    body = {"error": {"code": code, "message": message, "details": details or [], "request_id": rid}}
    return JSONResponse(body, status_code=status, headers={"X-Request-ID": rid})


@app.exception_handler(ApiError)
async def _api_error(request: Request, exc: ApiError) -> JSONResponse:
    return _envelope(request, exc.status_code, exc.code, exc.message, exc.details)


@app.exception_handler(RequestValidationError)
async def _validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {"location": list(e["loc"]), "message": e["msg"], "type": e["type"]} for e in exc.errors()
    ]
    return _envelope(request, 422, "validation_error", "Request validation failed.", details)


@app.exception_handler(StarletteHTTPException)
async def _http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = {404: "not_found", 405: "method_not_allowed"}.get(exc.status_code, "http_error")
    return _envelope(request, exc.status_code, code, str(exc.detail))


# ── helpers ────────────────────────────────────────────────────────────────────────────
def _coordinate_evidence() -> dict[str, Any]:
    catalog = load_site_catalog()
    return {
        "kind": catalog.evidence_kind,
        "statement": catalog.reference_point_definition,
        "sources": [
            {"source_id": f"{catalog.id}/{i}", "title": s.title, "url": str(s.url), "citation": s.use}
            for i, s in enumerate(catalog.sources)
        ],
        "method": catalog.method,
        "assumptions": ["Each coordinate is a DEM tile centre, not a selected landing point."],
        "limitations": list(catalog.limitations),
    }


# ── routes ─────────────────────────────────────────────────────────────────────────────
@app.get(
    "/health", response_model=Health, responses={503: {"model": Health}}, operation_id="getHealth"
)
def health(request: Request, response: Response) -> dict[str, Any]:
    checks = []
    try:
        with request.app.state.engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        checks.append({"name": "database", "status": "ok", "detail": None})
    except Exception as exc:  # noqa: BLE001 - reported, not raised
        checks.append({"name": "database", "status": "fail", "detail": type(exc).__name__})
    analysis: AnalysisService = request.app.state.analysis
    for name, probe in (("spice_kernels", analysis.spice), ("horizon_dem", analysis.masks.load_dem)):
        try:
            probe()
            checks.append({"name": name, "status": "ok", "detail": None})
        except ApiError as exc:
            checks.append({"name": name, "status": "fail", "detail": exc.message})
    ok = all(c["status"] == "ok" for c in checks)
    if not ok:
        response.status_code = 503
    return {
        "status": "ok" if ok else "degraded",
        "service": "lunaris-api",
        "version": __version__,
        "api_version": "v1",
        "time_utc": datetime.now(UTC),
        "checks": checks,
    }


@app.get("/v1/sites", response_model=SiteList, responses=ERRORS, operation_id="listSites")
def list_sites(request: Request) -> dict[str, Any]:
    sites = [site_out(s) for s in db.list_sites(request.app.state.engine)]
    sites.sort(key=lambda s: (not (s["catalog"] or {}).get("demo_trio", False), s["name"]))
    return {
        "sites": sites,
        "count": len(sites),
        "limit": SITE_LIMIT,
        "coordinate_evidence": _coordinate_evidence(),
    }


@app.get("/v1/sites/{site_id}", response_model=SiteOut, responses=ERRORS, operation_id="getSite")
def get_site(request: Request, site_id: uuid.UUID) -> dict[str, Any]:
    return load_site(request, site_id)


Start = Annotated[datetime, Query(description="Window start, ISO 8601 with explicit UTC offset")]
End = Annotated[datetime, Query(description="Window end (inclusive grid), ISO 8601 UTC")]
Step = Annotated[float, Query(description="Sample step in seconds (1 … 2 592 000)")]


@app.get(
    "/v1/sites/{site_id}/timeline",
    response_model=SiteTimeline,
    responses=ERRORS,
    operation_id="getSiteTimeline",
)
def site_timeline(
    request: Request, site_id: uuid.UUID, start_utc: Start, end_utc: End, step_s: Step = 3600.0
) -> dict[str, Any]:
    """Sun and Earth azimuth/elevation, visible disk fraction above the astronomical and
    the terrain horizon, Earth line of sight, summaries and windows for one site."""
    site = load_site(request, site_id)
    analysis: AnalysisService = request.app.state.analysis
    return analysis.site_timeline(site, start_utc, end_utc, step_s)


@app.get(
    "/v1/ephemeris/sun", response_model=SunDirection, responses=ERRORS, operation_id="getSunDirection"
)
def sun_direction(
    request: Request, start_utc: Start, end_utc: End, step_s: Step = 3600.0
) -> dict[str, Any]:
    """Moon-centred apparent Sun direction in MOON_ME, for lighting the globe."""
    analysis: AnalysisService = request.app.state.analysis
    return analysis.sun_direction(start_utc, end_utc, step_s)
