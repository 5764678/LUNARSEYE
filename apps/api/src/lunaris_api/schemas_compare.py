"""Wire contract v1: site comparison (table, leaders, dominance, verdict, mission recommendation)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from lunaris_api.schemas import Evidence, Model

Better = Literal["higher", "lower"]
Need = Literal["power", "comms", "landing"]
Priority = Literal["none", "low", "medium", "high"]
SiteStatus = Literal["recommended", "ranked", "excluded", "unscored"]
Confidence = Literal["clear", "moderate", "narrow", "tie", "only_option", "none"]


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


class MissionLimits(Model):
    """Hard requirements. A site that breaks one is excluded, never down-weighted."""

    max_slope_deg: float | None = None
    max_darkness_d: float | None = None
    max_earth_outage_d: float | None = None
    min_sunlit_d: float | None = None


class Mission(Model):
    """The answers to the mission questions: how much each need matters, and the limits."""

    power: Priority = "medium"
    comms: Priority = "medium"
    landing: Priority = "medium"
    limits: MissionLimits = MissionLimits()


class NeedInfo(Model):
    need: Need
    label: str
    priority: Priority
    weight: float  # share of the score, 0..1; the shares sum to 1


class ScaleInfo(Model):
    """Fixed reference scale of one scored measure: ``worst`` scores 0, ``best`` scores 1."""

    key: str
    label: str
    need: Need
    weight: float  # share of the score, 0..1
    worst: float
    best: float
    unit: str
    rationale: str


class RankedSite(Model):
    site_id: str
    name: str
    status: SiteStatus
    rank: int | None = None
    score: float | None = None
    need_scores: dict[str, float] = {}  # 0..1 per need, where every measure has a value
    reasons: list[str] = []  # why the site is excluded or has no score


class RobustnessFlip(Model):
    change: str
    site_id: str
    name: str


class Robustness(Model):
    tested: int
    held: int
    flips: list[RobustnessFlip]
    statement: str


class Recommendation(Model):
    mission: Mission
    site_id: str | None
    name: str | None
    runner_up_site_id: str | None = None
    margin: float | None = None
    confidence: Confidence
    headline: str
    reasons: list[str]
    tradeoffs: list[str]
    caveats: list[str]
    robustness: Robustness | None = None
    needs: list[NeedInfo]
    scales: list[ScaleInfo]
    ranking: list[RankedSite]
    method: str
    evidence: Evidence


class ComparisonSummary(Model):
    leaders: list[ColumnLeaders]
    sites: list[SiteStanding]
    verdict: str
    method: str
    recommendation: Recommendation


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
