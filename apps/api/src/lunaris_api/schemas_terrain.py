"""Wire contract v1: terrain."""

from __future__ import annotations

from lunaris_api.schemas import Evidence, Model, SiteOut


class SlopeValue(Model):
    slope_deg: float | None
    baseline_m: float


class Footprint(Model):
    radius_m: float
    cell_count: int
    missing_cell_count: int
    height_min_m: float
    height_max_m: float
    height_mean_m: float
    slope_mean_deg: float | None
    slope_p95_deg: float | None
    slope_max_deg: float | None
    slope_baseline_m: float
    roughness_rms_m: float | None
    roughness_baseline_m: float


class Hazard(Model):
    """Flags against user thresholds; ``evidence.kind`` is always ``assumption``."""

    max_slope_deg: float | None
    max_roughness_m: float | None
    slope_fraction_above: float | None
    slope_p95_exceeds: bool | None
    roughness_exceeds: bool | None
    evidence: Evidence


class DemWindow(Model):
    dataset_id: str
    title: str
    url: str
    etag: str | None
    last_modified: str | None
    resolution_m: float
    window_col_row_width_height: list[int]
    bytes_requested: int
    http_retries: int
    served_from_cache: bool
    read_at_utc: str


class SiteTerrain(Model):
    site: SiteOut
    height_m: float
    scale_factor: float
    slope_at_site: SlopeValue
    footprint: Footprint
    hazard: Hazard | None
    dem: DemWindow
    evidence: Evidence


class TerrainScene(Model):
    scene_id: str
    grid_size: int
    half_extent_m: float
    vertex_spacing_m: float
    reference_radius_m: float
    height_min_m: float
    height_max_m: float
    nodata_vertex_count: int
    layout: str
    heights_m: list[int | None]
    evidence: Evidence
