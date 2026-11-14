"""Compare: pure summary rules, then the demo-trio fixture through ASGI.

The fixture (handoff §2): over 2027, Peak near Shackleton leads on slope, sunlight and Earth
visibility but is the roughest; Malapert massif is smoothest; under the landing profile
Malapert is first. The ASGI tests need Postgres and the acquired data and skip without them.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from lunaris_api.main import app
from lunaris_api.schemas_compare import CompareCell, CompareRow
from lunaris_api.services.compare import COLUMNS, DIRECTED_COLUMNS
from lunaris_api.services.compare_summary import summarize

YEAR_2027 = {"start_utc": "2027-01-01T00:00:00Z", "end_utc": "2028-01-01T00:00:00Z", "step_s": 3600}


def row(site_id: str, **values: float | None) -> CompareRow:
    cells = {
        c.key: CompareCell(value=values.get(c.key), unit=c.unit, reason=None) for c in COLUMNS
    }
    return CompareRow(
        site_id=site_id, name=site_id.upper(), origin="user", latitude_deg=-85, longitude_deg=0, cells=cells
    )


def test_directions_are_declared_and_undirected_columns_are_not_ranked() -> None:
    directed = {c.key for c in DIRECTED_COLUMNS if c.better}
    assert "slope_p95_deg" in directed and "surface_height_m" not in directed
    summary = summarize([row("a", surface_height_m=1.0), row("b", surface_height_m=9.0)], DIRECTED_COLUMNS)
    assert summary.leaders and all(not lead.site_ids for lead in summary.leaders)
    assert "no site can be ranked" in summary.verdict


def test_a_site_best_on_everything_dominates_and_is_named_in_the_verdict() -> None:
    a = row("a", slope_p95_deg=2.0, sun_illuminated_fraction=0.9)
    b = row("b", slope_p95_deg=5.0, sun_illuminated_fraction=0.5)
    summary = summarize([a, b], DIRECTED_COLUMNS)
    assert summary.sites[1].dominated_by == ["a"]
    assert summary.sites[0].dominated_by == []
    assert summary.verdict.startswith("A is best or tied on every directed metric")


def test_trade_off_means_nobody_dominates() -> None:
    a = row("a", slope_p95_deg=2.0, sun_illuminated_fraction=0.5)
    b = row("b", slope_p95_deg=5.0, sun_illuminated_fraction=0.9)
    summary = summarize([a, b], DIRECTED_COLUMNS)
    assert all(not s.dominated_by for s in summary.sites)
    assert summary.verdict.startswith("No single site is best on every directed metric.")


def test_ties_all_lead_and_nulls_never_win_or_lose() -> None:
    rows = [
        row("a", slope_p95_deg=3.0),
        row("b", slope_p95_deg=3.0),
        row("c", slope_p95_deg=None),
    ]
    leaders = {lead.key: lead for lead in summarize(rows, DIRECTED_COLUMNS).leaders}
    assert leaders["slope_p95_deg"].site_ids == ["a", "b"]
    assert leaders["slope_p95_deg"].compared_sites == 2


def test_no_score_without_a_profile_and_weights_are_shown_with_one() -> None:
    rows = [
        row("a", slope_at_site_deg=1, slope_p95_deg=1, roughness_rms_m=1),
        row("b", slope_at_site_deg=3, slope_p95_deg=3, roughness_rms_m=3),
    ]
    assert summarize(rows, DIRECTED_COLUMNS).score is None
    score = summarize(rows, DIRECTED_COLUMNS, profile="landing").score
    assert score is not None and score.evidence.kind == "assumption"
    assert sum(score.weights.values()) == pytest.approx(1.0)
    assert [(s.site_id, s.score) for s in score.scores] == [("a", pytest.approx(1.0)), ("b", 0.0)]


def test_a_missing_weighted_cell_means_no_score_not_zero() -> None:
    rows = [
        row("a", slope_at_site_deg=1, slope_p95_deg=1, roughness_rms_m=1),
        row("b", slope_at_site_deg=3, slope_p95_deg=3, roughness_rms_m=None),
    ]
    score = summarize(rows, DIRECTED_COLUMNS, profile="landing").score
    assert score is not None
    b = next(s for s in score.scores if s.site_id == "b")
    assert b.score is None and "roughness" in (b.reason or "")


# ── through ASGI ─────────────────────────────────────────────────────────────────────────
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


def demo_ids(client: TestClient) -> dict[str, str]:
    sites = client.get("/v1/sites").json()["sites"][:3]
    return {s["name"]: s["id"] for s in sites}


def test_demo_trio_over_2027_matches_the_known_fixture(client: TestClient) -> None:
    ids = demo_ids(client)
    assert set(ids) == {"Connecting ridge", "Malapert massif", "Peak near Shackleton"}
    response = client.get(
        "/v1/compare", params={"site_ids": ",".join(ids.values()), "profile": "landing", **YEAR_2027}
    )
    assert response.status_code == 200, response.text
    body = response.json()
    by_name = {r["name"]: r["cells"] for r in body["rows"]}
    assert all(c["value"] is not None for cells in by_name.values() for c in cells.values())
    leaders = {lead["key"]: lead["site_ids"] for lead in body["summary"]["leaders"]}
    peak = ids["Peak near Shackleton"]
    for key in (
        "slope_at_site_deg",
        "slope_p95_deg",
        "sun_mean_visible_disk_fraction",
        "sun_illuminated_fraction",
        "sun_longest_hidden_s",
        "earth_visible_fraction",
        "earth_longest_outage_s",
    ):
        assert leaders[key] == [peak], key
    assert leaders["roughness_rms_m"] == [ids["Malapert massif"]]
    assert body["summary"]["score"]["scores"][0]["name"] == "Malapert massif"
    assert body["summary"]["score"]["evidence"]["kind"] == "assumption"
    assert "trade-off: worst on roughness" in body["summary"]["verdict"]
    assert every_numeric_cell_has_evidence(body)


def every_numeric_cell_has_evidence(body: dict) -> bool:
    return all(
        c["evidence"] is not None
        for r in body["rows"]
        for c in r["cells"].values()
        if c["value"] is not None
    )


def test_compare_rejects_bad_requests_with_the_error_envelope(client: TestClient) -> None:
    ids = demo_ids(client)
    first = next(iter(ids.values()))
    bad_id = client.get("/v1/compare", params={"site_ids": "nope", **YEAR_2027})
    assert bad_id.status_code == 422 and bad_id.json()["error"]["code"] == "validation_error"
    unknown = client.get(
        "/v1/compare", params={"site_ids": "00000000-0000-0000-0000-000000000000", **YEAR_2027}
    )
    assert unknown.status_code == 404
    empty = client.get("/v1/compare", params={"site_ids": ",", **YEAR_2027})
    assert empty.status_code == 422 and "site_count" in empty.text
    capped = client.get(
        "/v1/compare",
        params={"site_ids": first, "start_utc": "2027-01-01T00:00:00Z",
                "end_utc": "2028-01-01T00:00:00Z", "step_s": 60},
    )
    assert capped.status_code == 422 and "sample_cap_exceeded" in capped.text
    assert "request_id" in capped.json()["error"]



def test_datasets_list_reports_status_and_hashes(client: TestClient) -> None:
    body = client.get("/v1/datasets").json()
    by_id = {d["id"]: d for d in body["datasets"]}
    assert body["count"] == len(by_id) >= 4
    assert by_id["pgda-lola-20mpp-80s"]["local"]["status"] == "remote_window"
    ldem = by_id["lola-ldem-75s-240m"]
    assert all(f["sha256"] and len(f["sha256"]) == 64 for f in ldem["files"] if f["present"])
    missing = client.get("/v1/datasets/nope")
    assert missing.status_code == 404 and missing.json()["error"]["code"] == "not_found"
