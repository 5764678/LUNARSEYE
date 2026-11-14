"""Wire contract v1: dataset registry joined with local acquisition status."""

from __future__ import annotations

from datetime import datetime

from lunaris_api.schemas import Model


class DatasetFile(Model):
    name: str
    role: str
    url: str
    present: bool
    size_bytes: int | None
    sha256: str | None


class DatasetLocal(Model):
    """``remote_window``: read over HTTP byte ranges; nothing is stored whole."""

    status: str
    files_present: int
    files_expected: int
    bytes_on_disk: int
    acquired_at_utc: datetime | None
    manifest_changed: bool


class Dataset(Model):
    id: str
    title: str
    summary: str
    category: str
    evidence_kind: str
    provider: str
    source_page: str
    citation: str | None
    usage: str | None
    required_by: list[str]
    notes: list[str]
    files: list[DatasetFile]
    local: DatasetLocal
    acquire_command: str | None


class DatasetList(Model):
    datasets: list[Dataset]
    count: int
