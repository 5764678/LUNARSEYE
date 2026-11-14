"""Timelines baked to disk (scripts/prewarm.py) are served instead of recomputed.

Why it exists: on the 0.1-CPU free Render instance a cold timeline took ~11 s and queued
behind others, which produced 502s. Needs Postgres + the acquired data; skipped without.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from lunaris_api.main import app
from lunaris_api.schemas import SiteTimeline

START = datetime(2027, 1, 1, tzinfo=UTC)
END = datetime(2027, 1, 31, tzinfo=UTC)


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    try:
        with TestClient(app) as test_client:
            if test_client.get("/health").status_code != 200:
                pytest.skip("science data not ready")
            yield test_client
    except Exception as exc:  # noqa: BLE001 - no database in this environment
        if "OperationalError" in type(exc).__name__:
            pytest.skip(f"Postgres not reachable: {exc}")
        raise


def as_json(result: dict) -> str:
    return SiteTimeline.model_validate(result).model_dump_json()


def test_a_baked_timeline_equals_a_fresh_one_and_is_not_recomputed(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    analysis = app.state.analysis
    monkeypatch.setattr(analysis, "timeline_dir", tmp_path)
    site = client.get("/v1/sites").json()["sites"][2]

    fresh = analysis.site_timeline(site, START, END, 3600.0, cache=False, persist=True)
    assert len(list(tmp_path.glob("*.json"))) == 1

    def boom(*_a: object, **_k: object) -> None:
        raise AssertionError("recomputed instead of reading the baked file")

    monkeypatch.setattr(analysis, "_site_timeline", boom)
    baked = analysis.site_timeline(site, START, END, 3600.0, cache=False)
    assert as_json(baked) == as_json(fresh)
    # the caller's current site record wins over whatever was stored
    renamed = {**site, "name": "Renamed"}
    assert analysis.site_timeline(renamed, START, END, 3600.0, cache=False)["site"]["name"] == (
        "Renamed"
    )


def test_runtime_requests_never_write_to_disk(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    analysis = app.state.analysis
    monkeypatch.setattr(analysis, "timeline_dir", tmp_path)
    site = client.get("/v1/sites").json()["sites"][2]
    analysis.site_timeline(site, START, END, 7200.0, cache=False)  # persist defaults to False
    assert list(tmp_path.glob("*.json")) == []


def test_a_different_window_or_step_is_a_different_file(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    analysis = app.state.analysis
    monkeypatch.setattr(analysis, "timeline_dir", tmp_path)
    site = client.get("/v1/sites").json()["sites"][2]
    a = analysis._disk_path(site, START, END, 3600.0)
    assert a != analysis._disk_path(site, START, END, 7200.0)
    assert a != analysis._disk_path(site, START, datetime(2027, 2, 1, tzinfo=UTC), 3600.0)
    assert a != analysis._disk_path({**site, "latitude_deg": site["latitude_deg"] + 0.001}, START, END, 3600.0)
