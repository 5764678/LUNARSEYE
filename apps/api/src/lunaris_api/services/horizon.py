"""Terrain horizon masks (contract C1) from LOLA LDEM_75S_240M.

Computed once per (DEM checksum, site, observer height) with the frozen
``lunaris_science.terrain.horizon.compute_horizon_mask`` and cached as files under
``data/processed/lola-ldem-75s-240m/horizon-masks/``. The DEM itself is read once per
process and its SHA-256 is checked against the checksum pinned in the dataset manifest.

Phase 1 note: the cache is a plain file cache plus an in-process DEM handle. The
content-addressed artifact store of the Round 2 target architecture replaces it in Phase 2.
"""

from __future__ import annotations

import hashlib
import json
import math
import threading
from pathlib import Path
from typing import Any

import numpy as np

from lunaris_api.errors import DatasetUnavailableError, OutOfCoverageError
from lunaris_data.readers.ldem import read_ldem_polar
from lunaris_data.registry import DatasetRegistry
from lunaris_data.store import DataLayout
from lunaris_science.coordinates import SelenographicCoordinate
from lunaris_science.horizon_mask import HorizonMask
from lunaris_science.provenance import SourceReference
from lunaris_science.terrain.dem import PolarDem
from lunaris_science.terrain.horizon import (
    DEFAULT_AZIMUTH_STEP_DEG,
    DEFAULT_MAX_RANGE_M,
    HorizonError,
    compute_horizon_mask,
)

HORIZON_DATASET = "lola-ldem-75s-240m"
DEFAULT_OBSERVER_HEIGHT_M = 2.0
HORIZON_METHOD_VERSION = "1"

_LOCK = threading.Lock()
_DEM_CACHE: dict[str, PolarDem] = {}


def _cache_key(dem_sha256: str, lat: float, lon: float, height: float) -> str:
    parts = [
        dem_sha256,
        repr(float(lat)),
        repr(float(lon)),
        repr(float(height)),
        repr(DEFAULT_AZIMUTH_STEP_DEG),
        repr(DEFAULT_MAX_RANGE_M),
        HORIZON_METHOD_VERSION,
    ]
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:32]


def _write(base: Path, mask: HorizonMask) -> None:
    base.parent.mkdir(parents=True, exist_ok=True)
    tmp = base.with_suffix(".tmp.npz")
    np.savez(tmp, azimuth=mask.azimuth_deg, elevation=mask.elevation_deg, truncated=mask.truncated)
    meta = {
        "latitude_deg": mask.site.latitude_deg,
        "longitude_deg": mask.site.longitude_deg,
        "observer_height_m": mask.observer_height_m,
        "surface_height_m": mask.surface_height_m,
        "max_range_m": mask.max_range_m,
        "dem_source_id": mask.dem_source_id,
        "dem_sha256": mask.dem_sha256,
        "dem_resolution_m": mask.dem_resolution_m,
        "method": mask.method,
    }
    base.with_suffix(".json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    tmp.replace(base.with_suffix(".npz"))  # data file last: its presence marks completion


def _read(base: Path) -> HorizonMask | None:
    data_path, meta_path = base.with_suffix(".npz"), base.with_suffix(".json")
    if not (data_path.is_file() and meta_path.is_file()):
        return None
    meta: dict[str, Any] = json.loads(meta_path.read_text(encoding="utf-8"))
    with np.load(data_path) as arrays:
        azimuth, elevation, truncated = arrays["azimuth"], arrays["elevation"], arrays["truncated"]
    return HorizonMask(
        site=SelenographicCoordinate(
            meta["latitude_deg"], meta["longitude_deg"], meta["surface_height_m"]
        ),
        observer_height_m=meta["observer_height_m"],
        surface_height_m=meta["surface_height_m"],
        azimuth_deg=azimuth,
        elevation_deg=elevation,
        truncated=truncated,
        max_range_m=meta["max_range_m"],
        dem_source_id=meta["dem_source_id"],
        dem_sha256=meta["dem_sha256"],
        dem_resolution_m=meta["dem_resolution_m"],
        method=meta["method"],
    )


class HorizonMaskService:
    """Horizon masks by coordinate. ``sites`` is accepted for signature compatibility with
    the frozen science tests (``tests/science/illumination/test_terrain_physics.py``)."""

    def __init__(
        self, registry: DatasetRegistry, layout: DataLayout, sites: object | None = None
    ) -> None:
        self._registry = registry
        self._layout = layout
        self.computed = 0

    @property
    def cache_dir(self) -> Path:
        return self._layout.processed / HORIZON_DATASET / "horizon-masks"

    def _pinned_sha256(self) -> str:
        manifest = self._registry.get(HORIZON_DATASET)
        pinned = next((f.sha256 for f in manifest.files if f.role.value == "data"), None)
        if pinned is None:
            raise DatasetUnavailableError(f"{HORIZON_DATASET}: no checksum pinned in the manifest")
        return pinned

    def load_dem(self) -> PolarDem:
        manifest = self._registry.get(HORIZON_DATASET)
        label = next(f.name for f in manifest.files if f.role.value == "label")
        path = self._layout.dataset_dir(manifest) / label
        key = str(path)
        with _LOCK:
            dem = _DEM_CACHE.get(key)
            if dem is not None:
                return dem
            if not path.is_file():
                raise DatasetUnavailableError(
                    f"{HORIZON_DATASET} is not acquired; run "
                    f"`uv run lunaris-data acquire {HORIZON_DATASET}`"
                )
            dem = read_ldem_polar(path, HORIZON_DATASET)
            if dem.sha256 != self._pinned_sha256():
                raise DatasetUnavailableError(
                    f"{HORIZON_DATASET}: file checksum differs from the manifest; re-acquire it"
                )
            _DEM_CACHE[key] = dem
            return dem

    def dem_source(self, mask: HorizonMask) -> SourceReference:
        """Provenance of the DEM file a mask came from (manifest id, URL, SHA-256)."""
        manifest = self._registry.get(mask.dem_source_id)
        spec = next(f for f in manifest.files if f.sha256 == mask.dem_sha256)
        return SourceReference(
            source_id=f"{manifest.id}/{spec.name}",
            title=spec.description or spec.name,
            url=str(spec.url),
            sha256=mask.dem_sha256,
            citation=manifest.citation,
        )

    def get_mask(
        self,
        *,
        latitude_deg: float,
        longitude_deg: float,
        observer_height_m: float = DEFAULT_OBSERVER_HEIGHT_M,
    ) -> HorizonMask:
        if not math.isfinite(observer_height_m) or observer_height_m < 0.0:
            raise OutOfCoverageError("observer_height_m must be finite and non-negative")
        base = self.cache_dir / _cache_key(
            self._pinned_sha256(), latitude_deg, longitude_deg, observer_height_m
        )
        with _LOCK:
            cached = _read(base)
        if cached is not None:
            return cached
        dem = self.load_dem()
        try:
            mask = compute_horizon_mask(
                dem, latitude_deg, longitude_deg, observer_height_m=observer_height_m
            )
        except HorizonError as exc:
            raise OutOfCoverageError(
                f"No horizon mask at ({latitude_deg}, {longitude_deg}): {exc}. "
                f"{HORIZON_DATASET} covers about 75°S–90°S."
            ) from None
        self.computed += 1
        with _LOCK:
            _write(base, mask)
        return mask
