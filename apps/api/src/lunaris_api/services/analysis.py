"""Sun/Earth geometry and terrain-aware visibility timelines for a site.

Thin orchestration over the frozen science core: SPICE geometry (C2), horizon mask (C1),
visible disk fractions and summaries (C4). Phase 1 computes on request and keeps results
in a small in-process LRU; the content-addressed cache and process pool are Phase 2.
"""

from __future__ import annotations

import dataclasses
import os
import threading
import time
from collections import OrderedDict
from datetime import UTC, datetime, timedelta
from typing import Any

import numpy as np

from lunaris_api import __version__
from lunaris_api.errors import (
    ApiError,
    DatasetUnavailableError,
    InvalidRequestError,
    KernelsUnavailableError,
    OutOfCoverageError,
)
from lunaris_api.services.horizon import DEFAULT_OBSERVER_HEIGHT_M, HorizonMaskService
from lunaris_data.kernels import KERNEL_DATASET_ID, KernelSetUnavailableError, get_spice_context
from lunaris_data.registry import DatasetRegistry
from lunaris_data.store import DataLayout
from lunaris_science.coordinates import CoordinateError, SelenographicCoordinate
from lunaris_science.geometry import (
    Body,
    EpochError,
    GeometryError,
    ObserverSite,
    SpiceContext,
    SpiceKernelError,
    body_geometry,
    moon_centred_direction,
    sample_count,
    uniform_utc_grid,
    utc_to_et,
)
from lunaris_science.horizon_mask import HorizonMask
from lunaris_science.illumination.analysis import BodyTimeline, HorizonTimeline, body_timeline
from lunaris_science.provenance import Evidence, EvidenceKind
from lunaris_science.runtime import scientific_runtime
from lunaris_science.visibility import classify_line_of_sight

MAX_SAMPLES = 10_000
MAX_STEP_S = 30 * 86400.0
_CACHE_SIZE = 8  # a finished full-year hourly timeline is ~4.5 MiB (measured)
# Computing one peaks at ~100 MiB of numpy temporaries (measured with tracemalloc), so at most
# this many run at once, across all requests: a 512 MiB instance was OOM-killed when Compare
# ran 4 in parallel on top of a normal page load.
_MAX_CONCURRENT_TIMELINES = 1


def evidence_dict(evidence: Evidence, limitations: tuple[str, ...] | list[str] = ()) -> dict[str, Any]:
    out = dataclasses.asdict(evidence)
    out["kind"] = evidence.kind.value
    out["limitations"] = list(limitations)
    return out


def _round(values: np.ndarray, digits: int) -> list[float]:
    return np.round(np.asarray(values, dtype=np.float64), digits).tolist()


class AnalysisService:
    def __init__(self, registry: DatasetRegistry, layout: DataLayout) -> None:
        self.registry = registry
        self.layout = layout
        self.masks = HorizonMaskService(registry, layout)
        self._cache: OrderedDict[tuple[Any, ...], dict[str, Any]] = OrderedDict()
        self._lock = threading.Lock()
        self._heavy = threading.BoundedSemaphore(_MAX_CONCURRENT_TIMELINES)

    @classmethod
    def from_env(cls) -> AnalysisService:
        root = os.environ.get("LUNARIS_DATA_DIR", "data")
        return cls(DatasetRegistry.load_builtin(), DataLayout.from_root(root))

    # ── shared plumbing ────────────────────────────────────────────────────────────────
    def spice(self) -> SpiceContext:
        try:
            return get_spice_context(self.registry.get(KERNEL_DATASET_ID), self.layout)
        except (KernelSetUnavailableError, SpiceKernelError) as exc:
            raise KernelsUnavailableError(str(exc)) from None

    def _grid(
        self, start_utc: datetime, end_utc: datetime, step_s: float
    ) -> tuple[tuple[datetime, ...], np.ndarray, float]:
        for name, value in (("start_utc", start_utc), ("end_utc", end_utc)):
            if value.tzinfo is None or value.utcoffset() != timedelta(0):
                raise InvalidRequestError(
                    f"{name} must carry an explicit UTC offset (Z or +00:00)",
                    "utc_required",
                    ["query", name],
                )
        if not (1.0 <= step_s <= MAX_STEP_S):
            raise InvalidRequestError(
                f"step_s must be between 1 and {MAX_STEP_S:.0f} s", "step_range", ["query", "step_s"]
            )
        if end_utc < start_utc:
            raise InvalidRequestError(
                "end_utc must not be earlier than start_utc", "window_order", ["query", "end_utc"]
            )
        count = sample_count(start_utc, end_utc, step_s)
        if count > MAX_SAMPLES:
            raise InvalidRequestError(
                f"{count} samples requested; the cap is {MAX_SAMPLES} per request",
                "sample_cap_exceeded",
            )
        context = self.spice()
        try:
            epochs = uniform_utc_grid(start_utc, end_utc, step_s)
            ets = utc_to_et(context, epochs)
            end_et = float(utc_to_et(context, [end_utc])[0])
        except EpochError as exc:
            raise InvalidRequestError(str(exc), "invalid_window") from None
        coverage = context.coverage
        if float(ets.min()) < coverage.start_et_s or max(float(ets.max()), end_et) > coverage.end_et_s:
            raise InvalidRequestError(
                "The window falls outside the time coverage of the loaded kernels "
                "(DE440s: 1849-12-26 … 2150-01-21).",
                "outside_kernel_coverage",
            )
        return epochs, ets, end_et

    def _cached(self, key: tuple[Any, ...]) -> dict[str, Any] | None:
        with self._lock:
            hit = self._cache.get(key)
            if hit is not None:
                self._cache.move_to_end(key)
            return hit

    def _store(self, key: tuple[Any, ...], value: dict[str, Any]) -> None:
        with self._lock:
            self._cache[key] = value
            while len(self._cache) > _CACHE_SIZE:
                self._cache.popitem(last=False)

    # ── Moon-centred Sun direction (globe lighting) ───────────────────────────────────
    def sun_direction(self, start_utc: datetime, end_utc: datetime, step_s: float) -> dict[str, Any]:
        key = ("sun", start_utc, end_utc, step_s)
        if (hit := self._cached(key)) is not None:
            return hit
        epochs, ets, _ = self._grid(start_utc, end_utc, step_s)
        try:
            series = moon_centred_direction(self.spice(), Body.SUN, ets)
        except GeometryError as exc:
            raise InvalidRequestError(str(exc), "geometry_error") from None
        result = {
            "start_utc": start_utc,
            "end_utc": end_utc,
            "step_s": step_s,
            "sample_count": len(epochs),
            "frame": "MOON_ME",
            "origin": "MOON",
            "aberration_correction": series.aberration_correction,
            "epochs_utc": list(epochs),
            "direction_moon_me": _round(series.direction_moon_me, 7),
            "subsolar_latitude_deg": _round(series.subpoint_latitude_deg, 5),
            "subsolar_longitude_deg": _round(series.subpoint_longitude_deg, 5),
            "angular_radius_deg": _round(series.angular_radius_deg, 6),
            "range_m": _round(series.range_m, 0),
            "evidence": evidence_dict(
                series.evidence,
                [
                    "Lighting the globe from this direction shows a smooth sphere: terrain "
                    "shadows are not rendered here. Quantitative sunlight at a site comes "
                    "from the site timeline (visible disk fraction over the terrain horizon)."
                ],
            ),
        }
        self._store(key, result)
        return result

    # ── site timeline ────────────────────────────────────────────────────────────────
    def _mask(self, latitude_deg: float, longitude_deg: float) -> tuple[HorizonMask | None, str | None]:
        try:
            return self.masks.get_mask(latitude_deg=latitude_deg, longitude_deg=longitude_deg), None
        except (DatasetUnavailableError, OutOfCoverageError) as exc:
            return None, exc.message

    def _horizon_out(self, mask: HorizonMask | None, reason: str | None) -> dict[str, Any]:
        if mask is None:
            return {
                "available": False,
                "unavailable_reason": reason,
                **dict.fromkeys(
                    [
                        "azimuth_deg",
                        "elevation_deg",
                        "truncated",
                        "truncated_count",
                        "min_elevation_deg",
                        "max_elevation_deg",
                        "max_range_m",
                        "surface_height_m",
                        "observer_height_m",
                        "evidence",
                    ]
                ),
            }
        truncated_count = int(mask.truncated.sum())
        limitations = [
            "Horizon from a 240 m DEM: obstacles smaller than the grid spacing or closer "
            "than one cell (240 m) are not resolved.",
            f"Terrain beyond {mask.max_range_m / 1000:g} km is not considered.",
        ]
        if truncated_count:
            limitations.insert(
                0,
                f"{truncated_count} of {mask.size} azimuths are truncated: the ray left DEM "
                "coverage before the full range, so the horizon there is a lower bound.",
            )
        evidence = Evidence(
            kind=EvidenceKind.CALCULATION,
            statement=(
                "Terrain horizon elevation versus azimuth at the site, computed by LUNARIS "
                "from LOLA LDEM_75S_240M."
            ),
            sources=(self.masks.dem_source(mask),),
            method=f"{mask.method} {mask.size} azimuths ({mask.step_deg:g}° step).",
            assumptions=(
                f"Eye point {mask.observer_height_m:g} m above the DEM surface "
                f"(default {DEFAULT_OBSERVER_HEIGHT_M:g} m; a user-adjustable assumption).",
                f"Surface height at the site {mask.surface_height_m:.1f} m above the "
                "1 737 400 m sphere, bilinear from the DEM.",
            ),
        )
        return {
            "available": True,
            "unavailable_reason": None,
            "azimuth_deg": _round(mask.azimuth_deg, 3),
            "elevation_deg": _round(mask.elevation_deg, 4),
            "truncated": mask.truncated.tolist(),
            "truncated_count": truncated_count,
            "min_elevation_deg": round(float(mask.elevation_deg.min()), 4),
            "max_elevation_deg": round(float(mask.elevation_deg.max()), 4),
            "max_range_m": mask.max_range_m,
            "surface_height_m": round(mask.surface_height_m, 2),
            "observer_height_m": mask.observer_height_m,
            "evidence": evidence_dict(evidence, limitations),
        }

    @staticmethod
    def _summary(
        timeline: HorizonTimeline, epochs: tuple[datetime, ...], step_s: float, end: datetime
    ) -> dict[str, Any]:
        s = timeline.summary
        step = timedelta(seconds=step_s)
        return {
            "horizon": timeline.horizon.value,
            "mean_visible_disk_fraction": s.mean_visible_disk_fraction,
            "visible_time_fraction": s.illuminated_fraction,
            "fully_visible_time_fraction": s.fully_visible_fraction,
            "longest_visible_s": s.longest_visible.duration_s,
            "longest_visible_censored": s.longest_visible.censored,
            "longest_hidden_s": s.longest_hidden.duration_s,
            "longest_hidden_censored": s.longest_hidden.censored,
            "resolution_s": step_s,
            "any_truncated": s.any_truncated,
            "visible_windows": [
                {
                    "start_utc": epochs[w.start_index],
                    "end_utc": min(epochs[w.end_index] + step, end),
                    "duration_s": w.duration_s,
                    "censored_start": w.censored_start,
                    "censored_end": w.censored_end,
                }
                for w in s.visible_windows
            ],
        }

    def _body_out(
        self, timeline: BodyTimeline, epochs: tuple[datetime, ...], step_s: float, end: datetime
    ) -> dict[str, Any]:
        g = timeline.geometry
        terrain = timeline.terrain
        is_earth = timeline.body is Body.EARTH
        return {
            "body": timeline.body.value.lower(),
            "azimuth_deg": _round(g.azimuth_deg, 4),
            "elevation_deg": _round(g.elevation_deg, 4),
            "angular_radius_deg": _round(g.angular_radius_deg, 5),
            "geometry_evidence": evidence_dict(
                g.evidence,
                [
                    "Elevation is relative to the astronomical horizon (the local horizontal "
                    "plane); terrain is not considered in this number.",
                ],
            ),
            "astronomical_visible_fraction": _round(timeline.astronomical.disk.visible_fraction, 4),
            "terrain_visible_fraction": (
                _round(terrain.disk.visible_fraction, 4) if terrain else None
            ),
            "terrain_horizon_elevation_deg": (
                _round(terrain.disk.horizon_elevation_deg, 4) if terrain else None
            ),
            "terrain_truncated": terrain.disk.truncated.tolist() if terrain else None,
            "line_of_sight": (
                classify_line_of_sight(
                    timeline.astronomical.disk.visible_fraction,
                    terrain.disk.visible_fraction if terrain else None,
                ).tolist()
                if is_earth
                else None
            ),
            "astronomical": self._summary(timeline.astronomical, epochs, step_s, end),
            "terrain": self._summary(terrain, epochs, step_s, end) if terrain else None,
            "evidence": evidence_dict(timeline.evidence, timeline.limitations),
        }

    def site_timeline(
        self,
        site: dict[str, Any],
        start_utc: datetime,
        end_utc: datetime,
        step_s: float,
        *,
        cache: bool = True,
    ) -> dict[str, Any]:
        key = ("timeline", site["id"], start_utc, end_utc, step_s)
        if (hit := self._cached(key)) is not None:
            return hit
        with self._heavy:  # bound peak memory; see _MAX_CONCURRENT_TIMELINES
            if (hit := self._cached(key)) is not None:  # computed while we waited
                return hit
            return self._site_timeline(site, start_utc, end_utc, step_s, key, cache)

    def _site_timeline(
        self,
        site: dict[str, Any],
        start_utc: datetime,
        end_utc: datetime,
        step_s: float,
        key: tuple[Any, ...],
        cache: bool,
    ) -> dict[str, Any]:
        started = time.perf_counter()
        lat, lon = site["latitude_deg"], site["longitude_deg"]
        if abs(lat) == 90.0:  # noqa: PLR2004
            raise InvalidRequestError(
                "Local north and east are undefined at latitude exactly ±90°: azimuth and "
                "elevation cannot be reported for this site.",
                "topocentric_frame_undefined",
                ["path", "site_id"],
            )
        epochs, ets, end_et = self._grid(start_utc, end_utc, step_s)
        mask, reason = self._mask(lat, lon)
        try:
            observer = ObserverSite(
                SelenographicCoordinate(lat, lon, mask.surface_height_m if mask else None),
                observer_height_m=mask.observer_height_m if mask else 0.0,
            )
            context = self.spice()
            source = self.masks.dem_source(mask) if mask else None
            timelines = {
                body: body_timeline(
                    body_geometry(context, body, observer, ets),
                    mask,
                    dem_source=source,
                    window_end_et_s=end_et,
                    terrain_unavailable_reason=reason,
                )
                for body in (Body.SUN, Body.EARTH)
            }
        except (CoordinateError, GeometryError) as exc:
            raise InvalidRequestError(str(exc), "geometry_error") from None
        except ApiError:
            raise
        result = {
            "site": site,
            "observer": {
                "latitude_deg": observer.coordinate.latitude_deg,
                "longitude_deg": observer.coordinate.longitude_deg,
                "frame": "MOON_ME",
                "reference_radius_m": observer.reference_radius_m,
                "surface_height_m": observer.coordinate.height_m,
                "observer_height_m": observer.observer_height_m,
                "radius_m": observer.radius_m,
            },
            "start_utc": start_utc,
            "end_utc": end_utc,
            "step_s": step_s,
            "sample_count": len(epochs),
            "max_samples": MAX_SAMPLES,
            "epochs_utc": list(epochs),
            "terrain_horizon_available": mask is not None,
            "horizon": self._horizon_out(mask, reason),
            "sun": self._body_out(timelines[Body.SUN], epochs, step_s, end_utc),
            "earth": self._body_out(timelines[Body.EARTH], epochs, step_s, end_utc),
            "computed_at_utc": datetime.now(UTC),
            "compute_s": round(time.perf_counter() - started, 3),
            "software": {
                "service_version": __version__,
                "components": {c.name: c.version for c in scientific_runtime()},
            },
        }
        if cache:
            self._store(key, result)
        return result
