"""Terrain at a site (PGDA 20 m, read as HTTP-range windows) and the south-pole scene
heightmap (LOLA LDEM_75S_240M).

Site values come from the frozen ``lunareyes_science.terrain.analysis.analyze_site`` on a
window of the PGDA LOLA 20 m south-pole DEM. The window is read once over HTTP byte ranges
and cached under ``data/processed/pgda-lola-20mpp-80s/windows``.
"""

from __future__ import annotations

import math
import threading
from typing import Any

import numpy as np

from lunareyes_api.errors import DatasetUnavailableError, InvalidRequestError, OutOfCoverageError
from lunareyes_api.services.analysis import evidence_dict
from lunareyes_api.services.horizon import HorizonMaskService
from lunareyes_data.registry import DatasetRegistry
from lunareyes_data.remote.window import RemoteWindowError, read_window, remote_source
from lunareyes_data.store import DataLayout
from lunareyes_science.provenance import Evidence, EvidenceKind, SourceReference
from lunareyes_science.terrain.analysis import (
    ROUGHNESS_METHOD,
    SLOPE_METHOD,
    HazardThresholds,
    TerrainAnalysisError,
    analyze_site,
)
from lunareyes_science.terrain.polar_stereographic import SouthPolarStereographic
from lunareyes_science.terrain.scene import SceneError, build_terrain_scene

ANALYSIS_DATASET = "pgda-lola-20mpp-80s"
DEFAULT_FOOTPRINT_RADIUS_M = 50.0
MAX_FOOTPRINT_RADIUS_M = 2000.0
SCENE_HALF_EXTENT_M = 125_000.0
TERRAIN_LIMITATIONS = (
    "DEM resolution bounds what is detectable: boulders and craters smaller than a few "
    "grid cells (20 m) are invisible to slope and roughness.",
    "Polar LOLA products interpolate between altimetry tracks; values there are less "
    "constrained than on tracks.",
    "Slope and roughness depend on their baseline; compare values only at equal baselines.",
    "The site coordinate is a DEM tile centre, not a selected landing point.",
)


def _finite(value: float, digits: int = 4) -> float | None:
    return round(float(value), digits) if math.isfinite(value) else None


class TerrainService:
    def __init__(
        self, registry: DatasetRegistry, layout: DataLayout, masks: HorizonMaskService
    ) -> None:
        self._registry = registry
        self._layout = layout
        self._masks = masks
        self._lock = threading.Lock()
        self._scenes: dict[int, dict[str, Any]] = {}
        self._sites: dict[tuple[Any, ...], dict[str, Any]] = {}

    # ── site terrain ───────────────────────────────────────────────────────────────────
    def site_terrain(
        self,
        site: dict[str, Any],
        *,
        footprint_radius_m: float = DEFAULT_FOOTPRINT_RADIUS_M,
        max_slope_deg: float | None = None,
        max_roughness_m: float | None = None,
    ) -> dict[str, Any]:
        if not (0.0 < footprint_radius_m <= MAX_FOOTPRINT_RADIUS_M):
            raise InvalidRequestError(
                f"footprint_radius_m must be within (0, {MAX_FOOTPRINT_RADIUS_M:g}] m",
                "footprint_range",
                ["query", "footprint_radius_m"],
            )
        key = (site["id"], footprint_radius_m, max_slope_deg, max_roughness_m)
        with self._lock:
            if key in self._sites:
                return self._sites[key]
        try:
            thresholds = (
                HazardThresholds(max_slope_deg=max_slope_deg, max_roughness_m=max_roughness_m)
                if max_slope_deg is not None or max_roughness_m is not None
                else None
            )
        except TerrainAnalysisError as exc:
            raise InvalidRequestError(str(exc), "threshold_range") from None

        manifest = self._registry.get(ANALYSIS_DATASET)
        source = remote_source(manifest)
        lat, lon = site["latitude_deg"], site["longitude_deg"]
        k = float(SouthPolarStereographic(source.reference_radius_m).scale_factor(lat)) if lat < 0 else 1.0
        cell_m = (manifest.spatial.nominal_resolution_m if manifest.spatial else None) or 20.0
        side_px = math.ceil(2.0 * footprint_radius_m * k / cell_m) + 8
        try:
            window = read_window(
                source,
                latitude_deg=lat,
                longitude_deg=lon,
                side_px=side_px,
                cache_dir=self._layout.processed / ANALYSIS_DATASET / "windows",
            )
        except RemoteWindowError as exc:
            if "outside the raster" in str(exc):
                raise OutOfCoverageError(
                    f"{site['name']} is outside the {ANALYSIS_DATASET} coverage (about 80°S–90°S)."
                ) from None
            raise DatasetUnavailableError(f"Could not read {ANALYSIS_DATASET}: {exc}") from None
        try:
            result = analyze_site(
                window.dem, lat, lon, footprint_radius_m=footprint_radius_m, thresholds=thresholds
            )
        except TerrainAnalysisError as exc:
            raise OutOfCoverageError(
                f"Terrain analysis not possible at {site['name']}: {exc}"
            ) from None

        p = window.provenance
        dem_source = SourceReference(
            source_id=manifest.id,
            title=manifest.title,
            url=p.url,
            version=f"ETag {p.etag}; Last-Modified {p.last_modified}",
            citation=manifest.citation,
        )
        evidence = Evidence(
            kind=EvidenceKind.CALCULATION,
            statement=(
                "Height, slope, roughness and footprint statistics computed by LUNAREYES from "
                f"a window of {manifest.title}."
            ),
            sources=(dem_source,),
            method=f"Height: bilinear. Slope: {SLOPE_METHOD} Roughness: {ROUGHNESS_METHOD}",
            assumptions=(
                f"Footprint radius {result.footprint.radius_m:g} m (request parameter).",
                "Heights are relative to the 1 737 400 m reference sphere.",
                "The remote file is identified by its HTTP validators (ETag, Last-Modified, "
                "size) pinned in the dataset manifest: a 2.7 GB file is not hashed, so no "
                "SHA-256 is given.",
            ),
        )
        fp = result.footprint
        hazard = None
        if result.hazard is not None:
            t = result.hazard.thresholds
            hazard = {
                "max_slope_deg": t.max_slope_deg,
                "max_roughness_m": t.max_roughness_m,
                "slope_fraction_above": (
                    _finite(result.hazard.slope_fraction_above)
                    if result.hazard.slope_fraction_above is not None
                    else None
                ),
                "slope_p95_exceeds": result.hazard.slope_exceeds,
                "roughness_exceeds": result.hazard.roughness_exceeds,
                "evidence": evidence_dict(
                    Evidence(
                        kind=EvidenceKind.ASSUMPTION,
                        statement=(
                            "Hazard flags compare the computed values with thresholds "
                            "supplied by the user. LUNAREYES ships no default safe slope."
                        ),
                        assumptions=tuple(
                            f"{name} = {value:g} (user threshold)"
                            for name, value in (
                                ("max_slope_deg", t.max_slope_deg),
                                ("max_roughness_m", t.max_roughness_m),
                            )
                            if value is not None
                        ),
                    ),
                    ["A flag is only as good as its threshold and the 20 m DEM behind it."],
                ),
            }
        out = {
            "site": site,
            "height_m": round(result.height_m, 2),
            "scale_factor": round(result.scale_factor, 6),
            "slope_at_site": {
                "slope_deg": _finite(result.slope_at_site.slope_deg),
                "baseline_m": round(result.slope_at_site.baseline_m, 2),
            },
            "footprint": {
                "radius_m": fp.radius_m,
                "cell_count": fp.cell_count,
                "missing_cell_count": fp.missing_cell_count,
                "height_min_m": round(fp.height_min_m, 2),
                "height_max_m": round(fp.height_max_m, 2),
                "height_mean_m": round(fp.height_mean_m, 2),
                "slope_mean_deg": _finite(fp.slope_mean_deg),
                "slope_p95_deg": _finite(fp.slope_p95_deg),
                "slope_max_deg": _finite(fp.slope_max_deg),
                "slope_baseline_m": round(fp.slope_baseline_m, 2),
                "roughness_rms_m": _finite(fp.roughness_rms_m),
                "roughness_baseline_m": round(fp.roughness_baseline_m, 2),
            },
            "hazard": hazard,
            "dem": {
                "dataset_id": manifest.id,
                "title": manifest.title,
                "url": p.url,
                "etag": p.etag,
                "last_modified": p.last_modified,
                "resolution_m": p.resolution_m,
                "window_col_row_width_height": list(p.window_col_row_width_height),
                "bytes_requested": p.bytes_requested,
                "http_retries": p.http_retries,
                "served_from_cache": p.served_from_cache,
                "read_at_utc": p.read_at_utc,
            },
            "evidence": evidence_dict(evidence, TERRAIN_LIMITATIONS),
        }
        with self._lock:
            self._sites[key] = out
        return out

    # ── south-pole scene ───────────────────────────────────────────────────────────────
    def scene(self, grid_size: int) -> dict[str, Any]:
        """Heights on a square grid of the south polar stereographic plane, ±125 km."""
        with self._lock:
            if grid_size in self._scenes:
                return self._scenes[grid_size]
        dem = self._masks.load_dem()
        try:
            scene = build_terrain_scene(dem, grid_size=grid_size, half_extent_m=SCENE_HALF_EXTENT_M)
        except SceneError as exc:
            raise InvalidRequestError(str(exc), "grid_size_range", ["query", "grid_size"]) from None
        heights = scene.vertices[..., 3]
        manifest = self._registry.get(dem.dataset_id)
        spec = next(f for f in manifest.files if f.sha256 == dem.sha256)
        evidence = Evidence(
            kind=EvidenceKind.DERIVED_PRODUCT,
            statement=(
                "Heights above the 1 737 400 m sphere on a regular grid of the south polar "
                "stereographic plane, resampled from LOLA LDEM_75S_240M for display."
            ),
            sources=(
                SourceReference(
                    source_id=f"{manifest.id}/{spec.name}",
                    title=spec.description or spec.name,
                    url=str(spec.url),
                    sha256=dem.sha256,
                    citation=manifest.citation,
                ),
            ),
            method=(
                f"Bilinear resampling to {scene.width}×{scene.height} vertices, "
                f"{scene.vertex_spacing_m:.0f} m apart in the map plane (true scale at the pole)."
            ),
            assumptions=("South polar stereographic on the sphere, MOON_ME (DE421).",),
        )
        out = {
            "scene_id": "south-pole",
            "grid_size": grid_size,
            "half_extent_m": scene.half_extent_m,
            "vertex_spacing_m": scene.vertex_spacing_m,
            "reference_radius_m": scene.reference_radius_m,
            "height_min_m": scene.height_min_m,
            "height_max_m": scene.height_max_m,
            "nodata_vertex_count": scene.nodata_vertex_count,
            "layout": (
                "Row-major heights in metres, rounded to 1 m. Row 0 is the top edge of the map "
                "(map y = +half_extent, toward 0°E); columns run toward 90°E (map x "
                "increasing). null = no DEM value: do not draw."
            ),
            "heights_m": [
                None if not math.isfinite(v) else int(round(v))
                for v in np.asarray(heights, dtype=np.float64).ravel().tolist()
            ],
            "evidence": evidence_dict(
                evidence,
                [
                    "For display only. Shading and shadows drawn from this mesh are an "
                    "illustration; sunlight values come from the horizon-mask calculation.",
                    f"Vertex spacing {scene.vertex_spacing_m:.0f} m: features smaller than "
                    "that are smoothed away.",
                ],
            ),
        }
        with self._lock:
            self._scenes[grid_size] = out
        return out
