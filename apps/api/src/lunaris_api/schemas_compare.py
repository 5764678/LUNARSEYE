"""Wire contract v1: site comparison (table, leaders, dominance, verdict, profile score)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from lunaris_api.schemas import Evidence, Model

Better = Literal["higher", "lower"]
Profile = Literal["power", "comms", "landing"]


class CompareColumn(Model):
    key: str
    label: str
    unit: str
    description: str
    better: Better | None = None
    better_rationale: str | None = None


class CompareCell(Model):
    """One number with its evidence. ``value`` is null (with ``reason``) when it cannot be
    computed: never 0."""

    value: float | None
    unit: str
    reason: str | None = None
    baseline_m: float | None = None
    evidence: Evidence | None = None
    limitations: list[str] = []


class CompareRow(Model):
    site_id: str
    name: str
    origin: str
    latitude_deg: float
    longitude_deg: float
    cells: dict[str, CompareCell]


class ColumnLeaders(Model):
    key: str
    better: Better
    site_ids: list[str]
    value: float | None
    compared_sites: int


class SiteStanding(Model):
    site_id: str
    name: str
    leads: list[str]
    trails: list[str]
    directed_compared: int
    dominated_by: list[str]
    dominance: str


class ScoreEntry(Model):
    site_id: str
    name: str
    score: float | None
    reason: str | None = None


class ProfileScore(Model):
    profile: Profile
    weights: dict[str, float]
    normalisation: str
    scores: list[ScoreEntry]
    evidence: Evidence


class ComparisonSummary(Model):
    leaders: list[ColumnLeaders]
    sites: list[SiteStanding]
    verdict: str
    method: str
    score: ProfileScore | None = None


class SiteComparison(Model):
    start_utc: datetime
    end_utc: datetime
    step_s: float
    sample_count: int
    footprint_radius_m: float
    columns: list[CompareColumn]
    rows: list[CompareRow]
    assumptions: list[str]
    summary: ComparisonSummary
