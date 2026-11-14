"""Phase 1 end-to-end checks through ASGI: catalogue → timeline → evidence → errors.

Needs Postgres (``LUNARIS_DATABASE_URL``) and the acquired kernels + LDEM_75S_240M;
skipped when either is missing.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from lunaris_api import db
from lunaris_api.main import app

PEAK = str(db.catalog_site_uuid("pgda78-site07"))
YEAR_2027 = {"start_utc": "2027-01-01T00:00:00Z", "end_utc": "2028-01-01T00:00:00Z", "step_s": 3600}


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    try:
        with TestClient(app) as test_client:
            health = test_client.get("/health")
            if health.status_code != 200:
                pytest.skip(f"science data not ready: {health.json()['checks']}")
            yield test_client
    except Exception as exc:  # noqa: BLE001 - no database in this environment
        if "OperationalError" in type(exc).__name__:
            pytest.skip(f"Postgres not reachable: {exc}")
        raise


def test_catalogue_is_seeded_with_cited_sites(client: TestClient) -> None:
    body = client.get("/v1/sites").json()
    assert body["count"] == 27
    assert [s["name"] for s in body["sites"][:3]] == [
        "Connecting ridge",
        "Malapert massif",
        "Peak near Shackleton",
    ]
    assert all(s["origin"] == "catalog" and s["frame"] == "MOON_ME" for s in body["sites"])
    evidence = body["coordinate_evidence"]
    assert evidence["kind"] == "derived_product"
    assert "NOT a selected landing point" in evidence["statement"]


def test_timeline_reports_terrain_and_flat_horizons_with_evidence(client: TestClient) -> None:
    response = client.get(f"/v1/sites/{PEAK}/timeline", params=YEAR_2027)
    assert response.status_code == 200
    body = response.json()
    assert body["sample_count"] == 8761 == len(body["epochs_utc"])
    assert body["terrain_horizon_available"] is True
    assert len(body["horizon"]["azimuth_deg"]) == 1440
    sun, earth = body["sun"], body["earth"]
    # A peak: the terrain horizon dips below 0°, so terrain sunlight exceeds the flat value.
    assert sun["terrain"]["mean_visible_disk_fraction"] == pytest.approx(0.8414, abs=5e-4)
    assert sun["astronomical"]["mean_visible_disk_fraction"] == pytest.approx(0.5148, abs=5e-4)
    assert earth["terrain"]["visible_time_fraction"] == pytest.approx(0.6061, abs=5e-4)
    assert set(earth["line_of_sight"]) <= {"clear", "terrain_obstructed", "below_geometric_horizon"}
    assert sun["geometry_evidence"]["kind"] == "model"
    assert sun["evidence"]["kind"] == "calculation" and sun["evidence"]["method"]
    assert body["horizon"]["evidence"]["kind"] == "calculation"
    for evidence in (sun["geometry_evidence"], sun["evidence"], body["horizon"]["evidence"]):
        assert evidence["sources"] and all(len(s["sha256"]) == 64 for s in evidence["sources"])
    assert any("radio link" in text for text in earth["evidence"]["limitations"])


def test_sun_direction_matches_the_documented_epoch(client: TestClient) -> None:
    epoch = "2026-11-04T00:00:00Z"
    body = client.get("/v1/ephemeris/sun", params={"start_utc": epoch, "end_utc": epoch}).json()
    assert body["direction_moon_me"][0] == pytest.approx([-0.3648, -0.9307, -0.0260], abs=1e-4)
    assert body["subsolar_longitude_deg"][0] == pytest.approx(248.5975, abs=1e-3)
    assert body["aberration_correction"] == "CN+S"


def test_errors_use_the_envelope_and_echo_the_request_id(client: TestClient) -> None:
    missing = client.get(
        "/v1/sites/00000000-0000-0000-0000-000000000000/timeline",
        params=YEAR_2027,
        headers={"X-Request-ID": "t-1"},
    )
    assert missing.status_code == 404
    assert missing.headers["X-Request-ID"] == "t-1"
    assert missing.json()["error"] == {
        "code": "not_found",
        "message": "No site with id 00000000-0000-0000-0000-000000000000.",
        "details": [],
        "request_id": "t-1",
    }
    capped = client.get(f"/v1/sites/{PEAK}/timeline", params={**YEAR_2027, "step_s": 60})
    assert capped.status_code == 422
    assert capped.json()["error"]["details"][0]["type"] == "sample_cap_exceeded"
    naive = client.get(
        f"/v1/sites/{PEAK}/timeline", params={**YEAR_2027, "start_utc": "2027-01-01T00:00:00"}
    )
    assert naive.status_code == 422
    assert naive.json()["error"]["details"][0]["type"] == "utc_required"


def test_terrain_scene_is_a_square_heightmap_with_evidence(client: TestClient) -> None:
    body = client.get("/v1/terrain/scene", params={"grid_size": 64}).json()
    assert len(body["heights_m"]) == 64 * 64
    assert body["half_extent_m"] == 125_000.0
    assert body["height_min_m"] < 0 < body["height_max_m"]
    assert body["evidence"]["kind"] == "derived_product"
    assert len(body["evidence"]["sources"][0]["sha256"]) == 64
    assert any("illustration" in text for text in body["evidence"]["limitations"])
    assert client.get("/v1/terrain/scene", params={"grid_size": 1}).status_code == 422


def test_site_terrain_values_carry_baselines_and_user_thresholds(client: TestClient) -> None:
    response = client.get(f"/v1/sites/{PEAK}/terrain", params={"max_slope_deg": 4})
    if response.status_code == 503:  # PGDA not reachable and no cached window
        pytest.skip(response.json()["error"]["message"])
    body = response.json()
    assert body["height_m"] == pytest.approx(1645.28, abs=0.05)
    assert body["slope_at_site"] == {"slope_deg": pytest.approx(3.6917, abs=1e-3), "baseline_m": 40.0}
    footprint = body["footprint"]
    assert footprint["slope_p95_deg"] == pytest.approx(4.855, abs=1e-3)
    assert footprint["roughness_rms_m"] == pytest.approx(0.5179, abs=1e-3)
    assert footprint["roughness_baseline_m"] == 100.0 and footprint["missing_cell_count"] == 0
    assert body["evidence"]["kind"] == "calculation"
    hazard = body["hazard"]
    assert hazard["slope_p95_exceeds"] is True and hazard["roughness_exceeds"] is None
    assert hazard["evidence"]["kind"] == "assumption"
    # No thresholds, no flag: LUNARIS ships no default "safe" slope.
    assert client.get(f"/v1/sites/{PEAK}/terrain").json()["hazard"] is None
