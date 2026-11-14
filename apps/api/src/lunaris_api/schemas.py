"""Wire contract v1 (code-first Pydantic → OpenAPI at /openapi.json).

Conventions: snake_case, units as suffixes (``_deg``, ``_m``, ``_s``, ``_fraction``),
ISO-8601 UTC timestamps, and an ``evidence`` object next to every group of numbers.
Series are columnar: one array per quantity, aligned with ``epochs_utc``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

EvidenceKind = Literal[
    "observation", "derived_product", "model", "calculation", "assumption", "placeholder"
]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Source(Model):
    source_id: str
    title: str
    url: str | None = None
    version: str | None = None
    sha256: str | None = None
    citation: str | None = None


class Evidence(Model):
    kind: EvidenceKind
    statement: str
    sources: list[Source] = []
    method: str | None = None
    assumptions: list[str] = []
    limitations: list[str] = []


class ErrorDetail(Model):
    location: list[str | int] = []
    message: str
    type: str


class ErrorBody(Model):
    code: str
    message: str
    details: list[ErrorDetail] = []
    request_id: str


class ErrorEnvelope(Model):
    error: ErrorBody


class HealthCheck(Model):
    name: str
    status: Literal["ok", "fail"]
    detail: str | None = None


class Health(Model):
    status: Literal["ok", "degraded"]
    service: str
    version: str
    api_version: str
    time_utc: datetime
    checks: list[HealthCheck]


class CatalogInfo(Model):
    catalog_site_id: str
    pgda_site_id: str
    artemis_iii_2022_region: str | None
    demo_trio: bool
    tile_url: str


class SiteOut(Model):
    id: str
    name: str
    latitude_deg: float
    longitude_deg: float
    frame: Literal["MOON_ME"]
    origin: Literal["catalog", "user"]
    reference: str | None
    notes: str | None
    created_at_utc: datetime
    catalog: CatalogInfo | None


class SiteList(Model):
    sites: list[SiteOut]
    count: int
    limit: int
    coordinate_evidence: Evidence
    """Evidence for the coordinates of ``origin = catalog`` sites."""


class SunDirection(Model):
    start_utc: datetime
    end_utc: datetime
    step_s: float
    sample_count: int
    frame: Literal["MOON_ME"]
    origin: Literal["MOON"]
    aberration_correction: str
    epochs_utc: list[datetime]
    direction_moon_me: list[tuple[float, float, float]]
    subsolar_latitude_deg: list[float]
    subsolar_longitude_deg: list[float]
    angular_radius_deg: list[float]
    range_m: list[float]
    evidence: Evidence


class Window(Model):
    start_utc: datetime
    end_utc: datetime
    duration_s: float
    censored_start: bool
    censored_end: bool


class HorizonSummary(Model):
    """Disk-fraction statistics against one horizon over the analysis window."""

    horizon: Literal["astronomical", "terrain"]
    mean_visible_disk_fraction: float
    visible_time_fraction: float
    """Share of the window with any part of the disk above the horizon."""
    fully_visible_time_fraction: float
    longest_visible_s: float
    longest_visible_censored: bool
    """True: the run touches the window edge, so the duration is a lower bound (≥)."""
    longest_hidden_s: float
    longest_hidden_censored: bool
    resolution_s: float
    any_truncated: bool
    visible_windows: list[Window]


class BodySeries(Model):
    body: Literal["sun", "earth"]
    azimuth_deg: list[float]
    elevation_deg: list[float]
    """Above the astronomical horizon (local horizontal plane); terrain not considered."""
    angular_radius_deg: list[float]
    geometry_evidence: Evidence
    astronomical_visible_fraction: list[float]
    terrain_visible_fraction: list[float] | None
    terrain_horizon_elevation_deg: list[float] | None
    terrain_truncated: list[bool] | None
    """True: the mask ray left DEM coverage there; the terrain fraction is an upper bound."""
    line_of_sight: list[Literal["clear", "terrain_obstructed", "below_geometric_horizon"]] | None
    """Earth only: geometric line of sight per epoch."""
    astronomical: HorizonSummary
    terrain: HorizonSummary | None
    evidence: Evidence


class HorizonMaskOut(Model):
    available: bool
    unavailable_reason: str | None
    azimuth_deg: list[float] | None
    elevation_deg: list[float] | None
    truncated: list[bool] | None
    truncated_count: int | None
    min_elevation_deg: float | None
    max_elevation_deg: float | None
    max_range_m: float | None
    surface_height_m: float | None
    observer_height_m: float | None
    evidence: Evidence | None


class Observer(Model):
    latitude_deg: float
    longitude_deg: float
    frame: Literal["MOON_ME"]
    reference_radius_m: float
    surface_height_m: float | None
    observer_height_m: float
    radius_m: float


class Software(Model):
    service_version: str
    components: dict[str, str | None]


class SiteTimeline(Model):
    site: SiteOut
    observer: Observer
    start_utc: datetime
    end_utc: datetime
    step_s: float
    sample_count: int
    max_samples: int
    epochs_utc: list[datetime]
    terrain_horizon_available: bool
    horizon: HorizonMaskOut
    sun: BodySeries
    earth: BodySeries
    computed_at_utc: datetime
    compute_s: float
    software: Software
