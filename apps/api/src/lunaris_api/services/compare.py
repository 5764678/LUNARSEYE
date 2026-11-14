"""Site comparison: one row per site, one evidence record per cell.

Cells come from services that already exist:

* surface height and horizon summary: the site timeline's terrain horizon mask
  (LOLA ``LDEM_75S_240M``);
* slope at site, footprint slope p95, roughness: the PGDA 20 m terrain analysis;
* Sun and Earth numbers: the terrain-horizon timeline (never the flat horizon).

A cell that cannot be computed is ``null`` with a reason, never 0. Rows are computed in
parallel (the unit of work and of caching is one site); the summary is a pure function of
the rows and never touches the profile before scoring. Row caching is the timeline's and
terrain service's own in-process cache.
"""

from __future__ import annotations

import math
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from typing import Any

from lunaris_api.errors import ApiError, InvalidRequestError
from lunaris_api.schemas_compare import CompareCell, CompareColumn, CompareRow, Profile
from lunaris_api.services.analysis import MAX_SAMPLES, AnalysisService
from lunaris_api.services.compare_summary import summarize, with_directions
from lunaris_api.services.terrain import DEFAULT_FOOTPRINT_RADIUS_M, TerrainService
from lunaris_science.geometry import sample_count

MAX_COMPARE_SITES = 10
MAX_WORKERS = 4
ILLUMINATION_UNAVAILABLE = "terrain illumination not available"

COLUMNS = [
    CompareColumn(
        key="surface_height_m",
        label="Height",
        unit="m",
        description="LDEM_75S_240M height at the site above the 1 737 400 m sphere.",
    ),
    CompareColumn(
        key="slope_at_site_deg",
        label="Slope at site",
        unit="deg",
        description="Horn slope on PGDA 20 m, with its baseline.",
    ),
    CompareColumn(
        key="slope_p95_deg",
        label="Slope p95 (footprint)",
        unit="deg",
        description="95th-percentile Horn slope over the footprint.",
    ),
    CompareColumn(
        key="roughness_rms_m",
        label="Roughness",
        unit="m",
        description="Plane-fit RMS over the footprint diameter (baseline).",
    ),
    CompareColumn(
        key="horizon_min_deg",
        label="Horizon min",
        unit="deg",
        description="Lowest terrain-horizon elevation over 360° of azimuth.",
    ),
    CompareColumn(
        key="horizon_max_deg",
        label="Horizon max",
        unit="deg",
        description="Highest terrain-horizon elevation over 360° of azimuth.",
    ),
    CompareColumn(
        key="horizon_truncated_azimuths",
        label="Truncated azimuths",
        unit="count",
        description="Azimuths whose 200 km ray left LDEM coverage (lower bounds).",
    ),
    CompareColumn(
        key="sun_mean_visible_disk_fraction",
        label="Sun: mean visible disk",
        unit="fraction",
        description="Time-averaged visible solar-disk fraction over the terrain horizon.",
    ),
    CompareColumn(
        key="sun_illuminated_fraction",
        label="Sun: illuminated",
        unit="fraction",
        description="Share of samples with any part of the solar disk visible.",
    ),
    CompareColumn(
        key="sun_longest_hidden_s",
        label="Sun: longest darkness",
        unit="s",
        description="Longest continuous period with the solar disk hidden.",
    ),
    CompareColumn(
        key="earth_visible_fraction",
        label="Earth: visible",
        unit="fraction",
        description="Share of samples with Earth's centre in geometric view.",
    ),
    CompareColumn(
        key="earth_longest_outage_s",
        label="Earth: longest outage",
        unit="s",
        description="Longest continuous period without Earth in view.",
    ),
]
DIRECTED_COLUMNS = with_directions(COLUMNS)
UNITS = {c.key: c.unit for c in COLUMNS}


def _null(key: str, reason: str) -> CompareCell:
    return CompareCell(value=None, unit=UNITS[key], reason=reason)


def _fail(keys: list[str], reason: str) -> dict[str, CompareCell]:
    return {k: _null(k, reason) for k in keys}


def _finite(value: float | None) -> float | None:
    return value if value is not None and math.isfinite(value) else None


def _timeline_cells(tl: dict[str, Any], start: datetime, end: datetime, step_s: float) -> dict[str, CompareCell]:
    horizon, sun, earth = tl["horizon"], tl["sun"], tl["earth"]
    period = (
        f"Period {start.isoformat()} to {end.isoformat()} at {step_s:g} s steps "
        f"({tl['sample_count']} samples); published values use other periods."
    )
    out: dict[str, CompareCell] = {}
    horizon_keys = [
        "surface_height_m",
        "horizon_min_deg",
        "horizon_max_deg",
        "horizon_truncated_azimuths",
    ]
    light_keys = [
        "sun_mean_visible_disk_fraction",
        "sun_illuminated_fraction",
        "sun_longest_hidden_s",
        "earth_visible_fraction",
        "earth_longest_outage_s",
    ]
    if not horizon["available"] or sun["terrain"] is None or earth["terrain"] is None:
        reason = horizon.get("unavailable_reason") or ILLUMINATION_UNAVAILABLE
        return _fail(horizon_keys + light_keys, f"terrain horizon not available: {reason}")

    h_ev = horizon["evidence"]
    h_lim = list(h_ev["limitations"])
    out["surface_height_m"] = CompareCell(
        value=horizon["surface_height_m"],
        unit="m",
        evidence=_evidence(h_ev, "LDEM_75S_240M height at the site (bilinear), above the sphere."),
        limitations=h_lim,
    )
    for key, value in (
        ("horizon_min_deg", horizon["min_elevation_deg"]),
        ("horizon_max_deg", horizon["max_elevation_deg"]),
        ("horizon_truncated_azimuths", float(horizon["truncated_count"])),
    ):
        out[key] = CompareCell(
            value=value, unit=UNITS[key], evidence=_evidence(h_ev), limitations=h_lim
        )

    s_t, e_t = sun["terrain"], earth["terrain"]
    for key, value, body, cens in (
        ("sun_mean_visible_disk_fraction", s_t["mean_visible_disk_fraction"], sun, False),
        ("sun_illuminated_fraction", s_t["visible_time_fraction"], sun, False),
        ("sun_longest_hidden_s", s_t["longest_hidden_s"], sun, s_t["longest_hidden_censored"]),
        ("earth_visible_fraction", e_t["visible_time_fraction"], earth, False),
        ("earth_longest_outage_s", e_t["longest_hidden_s"], earth, e_t["longest_hidden_censored"]),
    ):
        limits = [period, *body["evidence"]["limitations"]]
        if cens:
            limits.append("Longest run touches the window edge: a lower bound.")
        out[key] = CompareCell(
            value=value, unit=UNITS[key], evidence=_evidence(body["evidence"]), limitations=limits
        )
    return out


def _evidence(ev: dict[str, Any], statement: str | None = None) -> dict[str, Any]:
    keep = {k: ev[k] for k in ("kind", "statement", "sources", "method", "assumptions")}
    keep["limitations"] = []  # limitations are carried on the cell, not duplicated
    if statement:
        keep["statement"] = statement
    return keep


def _terrain_cells(t: dict[str, Any]) -> dict[str, CompareCell]:
    fp, ev = t["footprint"], t["evidence"]
    ev_out = {
        "kind": ev["kind"],
        "statement": f"Slope and roughness computed from a window of {t['dem']['title']}.",
        "sources": ev["sources"],
        "method": ev["method"],
        "assumptions": ev["assumptions"],
        "limitations": [],
    }
    lim = list(ev["limitations"])
    rows = (
        ("slope_at_site_deg", t["slope_at_site"]["slope_deg"], t["slope_at_site"]["baseline_m"]),
        ("slope_p95_deg", fp["slope_p95_deg"], fp["slope_baseline_m"]),
        ("roughness_rms_m", fp["roughness_rms_m"], fp["roughness_baseline_m"]),
    )
    out = {}
    for key, value, baseline in rows:
        finite = _finite(value)
        out[key] = CompareCell(
            value=finite,
            unit=UNITS[key],
            baseline_m=baseline,
            reason=None if finite is not None else "DEM has no value next to the site",
            evidence=ev_out,
            limitations=lim,
        )
    return out


class CompareService:
    def __init__(self, analysis: AnalysisService, terrain: TerrainService) -> None:
        self._analysis = analysis
        self._terrain = terrain

    def compare(
        self,
        sites: list[dict[str, Any]],
        start_utc: datetime,
        end_utc: datetime,
        step_s: float,
        *,
        footprint_radius_m: float = DEFAULT_FOOTPRINT_RADIUS_M,
        profile: Profile | None = None,
    ) -> dict[str, Any]:
        if not 1 <= len(sites) <= MAX_COMPARE_SITES:
            raise InvalidRequestError(
                f"give 1 to {MAX_COMPARE_SITES} distinct site ids", "site_count", ["query", "site_ids"]
            )
        for name, value in (("start_utc", start_utc), ("end_utc", end_utc)):
            if value.tzinfo is None or value.utcoffset() != timedelta(0):
                raise InvalidRequestError(
                    f"{name} must carry an explicit UTC offset", "utc_required", ["query", name]
                )
        if end_utc <= start_utc:
            raise InvalidRequestError(
                "end_utc must be after start_utc", "window_order", ["query", "end_utc"]
            )
        count = sample_count(start_utc, end_utc, step_s)
        if count > MAX_SAMPLES:
            raise InvalidRequestError(
                f"the window and step give {count} samples; at most {MAX_SAMPLES} are allowed. "
                "Increase step_s or shorten the window.",
                "sample_cap_exceeded",
                ["query", "step_s"],
            )

        def row(site: dict[str, Any]) -> dict[str, Any]:
            return self._row(site, start_utc, end_utc, step_s, footprint_radius_m)

        with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, len(sites))) as pool:
            rows = list(pool.map(row, sites))
        typed = [CompareRow.model_validate(r) for r in rows]
        summary = summarize(typed, DIRECTED_COLUMNS, profile=profile)
        return {
            "start_utc": start_utc,
            "end_utc": end_utc,
            "step_s": step_s,
            "sample_count": count,
            "footprint_radius_m": footprint_radius_m,
            "columns": [c.model_dump() for c in DIRECTED_COLUMNS],
            "rows": rows,
            "assumptions": [
                "Observer eye 2 m above the surface for horizon and timelines.",
                f"Footprint radius {footprint_radius_m:g} m for slope p95 and roughness.",
                "Sun and Earth numbers use the terrain horizon only; Earth visibility is "
                "geometric line of sight, not a radio link.",
            ],
            "summary": summary.model_dump(),
        }

    def _row(
        self,
        site: dict[str, Any],
        start: datetime,
        end: datetime,
        step_s: float,
        footprint_radius_m: float,
    ) -> dict[str, Any]:
        cells: dict[str, CompareCell] = {}
        attempts: list[tuple[list[str], Callable[[], dict[str, CompareCell]]]] = [
            (
                [c.key for c in COLUMNS if c.key.startswith(("surface", "horizon", "sun", "earth"))],
                lambda: _timeline_cells(
                    self._analysis.site_timeline(site, start, end, step_s), start, end, step_s
                ),
            ),
            (
                ["slope_at_site_deg", "slope_p95_deg", "roughness_rms_m"],
                lambda: _terrain_cells(
                    self._terrain.site_terrain(site, footprint_radius_m=footprint_radius_m)
                ),
            ),
        ]
        for keys, compute in attempts:
            try:
                cells.update(compute())
            except ApiError as exc:
                cells.update(_fail(keys, exc.message))
        return {
            "site_id": site["id"],
            "name": site["name"],
            "origin": site["origin"],
            "latitude_deg": site["latitude_deg"],
            "longitude_deg": site["longitude_deg"],
            "cells": {k: cells[k].model_dump() for k in UNITS},
        }
