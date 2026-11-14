"""Compare: pure summary rules, then the demo-trio fixture through ASGI.

The fixture (handoff §2): over 2027, Peak near Shackleton leads on slope, sunlight and Earth
visibility but is the roughest; Malapert massif is smoothest. The mission recommendation
names Peak near Shackleton for the default mission and Malapert, narrowly, when only landing
safety matters. The ASGI tests need Postgres and the acquired data and skip without them.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from lunaris_api.main import app
from lunaris_api.schemas_compare import (
    CompareCell,
    CompareRow,
    Mission,
    MissionLimits,
    Recommendation,
)
from lunaris_api.services.compare import COLUMNS, DIRECTED_COLUMNS
from lunaris_api.services.compare_recommend import (
    CENSORED_NOTE,
    NEED_COLUMNS,
    column_weights,
    recommend,
)
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


# ── mission recommendation ───────────────────────────────────────────────────────────────
DAY = 86_400.0


def site(site_id: str, *, sun: float, earth: float, slope: float, **extra: float | None) -> CompareRow:
    """A full row from three dials: sunlight, Earth visibility (fractions) and slope (deg)."""
    values: dict[str, float | None] = {
        "sun_mean_visible_disk_fraction": sun,
        "sun_illuminated_fraction": sun,
        "sun_longest_hidden_s": (1 - sun) * 20 * DAY,
        "sun_longest_visible_s": sun * 30 * DAY,
        "earth_visible_fraction": earth,
        "earth_longest_outage_s": (1 - earth) * 20 * DAY,
        "slope_at_site_deg": slope,
        "slope_p95_deg": slope + 1,
        "roughness_rms_m": 0.3,
    }
    return row(site_id, **{**values, **extra})


SUNNY = dict(sun=0.9, earth=0.5, slope=9.0)  # best light, steepest
FLAT = dict(sun=0.3, earth=0.5, slope=1.0)  # gentlest, darkest


def pick(rows: list[CompareRow], mission: Mission | None = None) -> Recommendation:
    return recommend(rows, DIRECTED_COLUMNS, mission or Mission())


def test_a_trade_off_still_gets_a_named_recommendation() -> None:
    rows = [site("sunny", **SUNNY), site("flat", **FLAT)]
    summary = summarize(rows, DIRECTED_COLUMNS)
    assert summary.verdict.startswith("No single site is best on every directed metric.")
    rec = summary.recommendation
    assert rec.site_id == "sunny" and rec.confidence == "clear"
    assert rec.headline.startswith("SUNNY is the best fit for this mission")
    assert rec.runner_up_site_id == "flat" and rec.margin == pytest.approx(
        rec.ranking[0].score - rec.ranking[1].score
    )
    assert [e.status for e in rec.ranking] == ["recommended", "ranked"]
    assert any("Sunlight and power" in r and "best of the 2" in r for r in rec.reasons)
    assert any("Landing safety" in t and "behind FLAT" in t for t in rec.tradeoffs)


def test_the_mission_answers_decide_the_pick() -> None:
    rows = [site("sunny", **SUNNY), site("flat", **FLAT)]
    solar = pick(rows, Mission(power="high", comms="none", landing="low"))
    nuclear = pick(rows, Mission(power="none", comms="none", landing="high"))
    assert solar.site_id == "sunny" and nuclear.site_id == "flat"


def test_weights_follow_the_priorities_and_are_shown_as_assumptions() -> None:
    mission = Mission(power="high", comms="low", landing="medium")
    rec = pick([site("a", **SUNNY), site("b", **FLAT)], mission)
    assert {n.need: n.weight for n in rec.needs} == pytest.approx(
        {"power": 4 / 7, "comms": 1 / 7, "landing": 2 / 7}
    )
    assert sum(column_weights(mission).values()) == pytest.approx(1.0)
    assert sum(s.weight for s in rec.scales) == pytest.approx(1.0)
    assert {s.key for s in rec.scales} == {k for cols in NEED_COLUMNS.values() for k in cols}
    assert rec.evidence.kind == "assumption"
    assert any("weight" in a and "scale" in a for a in rec.evidence.assumptions)


def test_a_score_does_not_depend_on_which_other_sites_are_compared() -> None:
    a, b = site("a", **SUNNY), site("b", **FLAT)
    outlier = site("c", sun=0.01, earth=0.0, slope=30.0)
    two = {e.site_id: e.score for e in pick([a, b]).ranking}
    three = {e.site_id: e.score for e in pick([a, b, outlier]).ranking}
    assert three["a"] == two["a"] and three["b"] == two["b"]
    assert pick([a, b, outlier]).site_id == pick([a, b]).site_id


def test_a_site_over_a_limit_is_excluded_with_the_reason_not_down_weighted() -> None:
    rows = [site("sunny", **SUNNY), site("flat", **FLAT)]
    rec = pick(rows, Mission(limits=MissionLimits(max_slope_deg=5)))
    assert rec.site_id == "flat" and rec.confidence == "only_option"
    assert "only compared site that meets the mission limits" in rec.headline
    out = next(e for e in rec.ranking if e.site_id == "sunny")
    assert out.status == "excluded" and out.score is None and out.rank is None
    assert out.reasons == [
        "slope at the site 9.0° is over the 5° limit",
        "footprint slope (p95) 10.0° is over the 5° limit",
    ]


def test_when_every_site_breaks_a_limit_the_nearest_miss_is_named() -> None:
    rows = [site("far", sun=0.2, earth=0.5, slope=2.0), site("near", sun=0.8, earth=0.5, slope=2.0)]
    rec = pick(rows, Mission(limits=MissionLimits(max_darkness_d=1)))
    assert rec.site_id is None and rec.confidence == "none"
    assert rec.headline.startswith("No compared site meets the mission limits. Closest is NEAR")
    assert [e.site_id for e in rec.ranking] == ["near", "far"]


def test_a_limit_on_a_missing_value_excludes_the_site() -> None:
    rows = [site("a", **SUNNY), site("b", **FLAT, sun_longest_visible_s=None)]
    rec = pick(rows, Mission(limits=MissionLimits(min_sunlit_d=5)))
    b = next(e for e in rec.ranking if e.site_id == "b")
    assert b.status == "excluded" and "cannot be checked" in b.reasons[0]


def test_a_limit_met_only_as_a_lower_bound_is_flagged() -> None:
    a, b = site("a", **SUNNY), site("b", **FLAT)
    a.cells["sun_longest_hidden_s"].limitations = [CENSORED_NOTE]
    rec = pick([a, b], Mission(limits=MissionLimits(max_darkness_d=15)))
    assert rec.site_id == "a"
    assert len(rec.caveats) == 1 and "lower bound" in rec.caveats[0]


def test_a_missing_weighted_value_means_no_score_not_zero() -> None:
    rows = [site("a", **FLAT), site("b", **SUNNY, roughness_rms_m=None)]
    b = next(e for e in pick(rows).ranking if e.site_id == "b")
    assert b.status == "unscored" and b.score is None and "roughness" in b.reasons[0]
    assert "landing" not in b.need_scores and "power" in b.need_scores
    # With landing safety not needed, the missing roughness no longer matters.
    rec = pick(rows, Mission(landing="none"))
    assert rec.site_id == "b" and all(e.score is not None for e in rec.ranking)


def test_equal_sites_are_reported_as_a_tie() -> None:
    rec = pick([site("a", **SUNNY), site("b", **SUNNY), site("c", **FLAT)])
    assert rec.confidence == "tie" and rec.margin == 0
    assert rec.headline.startswith("A and B score the same")
    assert [e.rank for e in rec.ranking] == [1, 1, 3]


def test_no_need_weighted_means_no_pick() -> None:
    rec = pick([site("a", **SUNNY), site("b", **FLAT)], Mission(power="none", comms="none", landing="none"))
    assert rec.site_id is None and rec.confidence == "none"
    assert "Raise at least one priority" in rec.headline


def test_one_site_is_scored_but_not_called_a_recommendation() -> None:
    rec = pick([site("a", **SUNNY)])
    assert rec.confidence == "only_option" and rec.headline.startswith("Only one site is selected")
    assert rec.robustness is None


def test_robustness_reports_the_priority_change_that_flips_the_pick() -> None:
    rows = [site("sunny", **SUNNY), site("flat", **FLAT)]
    stable = pick(rows, Mission(power="high", comms="none", landing="none")).robustness
    assert stable is not None and stable.flips == [] and stable.statement.startswith("Stable")
    edge = pick(rows, Mission(power="low", comms="none", landing="medium"))
    assert edge.site_id == "flat" and edge.robustness is not None
    assert edge.robustness.held < edge.robustness.tested
    flips = {f.change: f.name for f in edge.robustness.flips}
    assert flips["Sunlight and power set to important"] == "SUNNY"


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
    site_ids = ",".join(ids.values())
    response = client.get("/v1/compare", params={"site_ids": site_ids, **YEAR_2027})
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
    assert "trade-off: worst on roughness" in body["summary"]["verdict"]

    # Default mission (every need important): a named pick despite the trade-off.
    rec = body["summary"]["recommendation"]
    assert rec["name"] == "Peak near Shackleton" and rec["confidence"] == "clear"
    assert [(e["name"], round(e["score"], 3)) for e in rec["ranking"]] == [
        ("Peak near Shackleton", 0.713),
        ("Connecting ridge", 0.582),
        ("Malapert massif", 0.504),
    ]
    assert rec["robustness"]["held"] == rec["robustness"]["tested"] == 6
    assert rec["evidence"]["kind"] == "assumption"

    # Only landing safety matters: Malapert (smoothest) edges ahead, and it is called narrow.
    landing = client.get(
        "/v1/compare",
        params={"site_ids": site_ids, "power": "none", "comms": "none", "landing": "high", **YEAR_2027},
    ).json()["summary"]["recommendation"]
    assert landing["name"] == "Malapert massif" and landing["confidence"] == "narrow"
    assert [round(e["score"], 3) for e in landing["ranking"]] == [0.705, 0.692, 0.638]

    # A slope limit excludes sites with the reason instead of down-weighting them.
    limited = client.get(
        "/v1/compare", params={"site_ids": site_ids, "max_slope_deg": 5, **YEAR_2027}
    ).json()["summary"]["recommendation"]
    assert limited["name"] == "Peak near Shackleton" and limited["confidence"] == "only_option"
    assert {e["name"] for e in limited["ranking"] if e["status"] == "excluded"} == {
        "Connecting ridge",
        "Malapert massif",
    }
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
    priority = client.get(
        "/v1/compare", params={"site_ids": first, "power": "maximum", **YEAR_2027}
    )
    assert priority.status_code == 422 and priority.json()["error"]["code"] == "validation_error"
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


def test_compare_caches_small_rows_not_30_mib_timelines(client: TestClient) -> None:
    """Measured: a cached full-year timeline is ~30 MiB, so a 10-site compare must not
    leave 10 of them in memory (that OOM-kills a small instance)."""
    ids = list(demo_ids(client).values())
    params = {"site_ids": ",".join(ids), **YEAR_2027}
    first = client.get("/v1/compare", params=params)
    assert first.status_code == 200
    assert not any(key[0] == "timeline" for key in app.state.analysis._cache)
    assert len(app.state.compare._rows) >= len(ids)
    second = client.get("/v1/compare", params=params)
    assert second.json() == first.json()
