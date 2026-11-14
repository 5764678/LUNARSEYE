from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from lunaris_api.errors import NotFoundError
from lunaris_api.schemas import ErrorEnvelope
from lunaris_api.schemas_datasets import Dataset, DatasetList
from lunaris_api.services.analysis import AnalysisService
from lunaris_data.manifest import DatasetManifest
from lunaris_data.registry import UnknownDatasetError
from lunaris_data.store import DatasetLocalState, inspect_dataset

ERRORS: dict[int | str, dict[str, Any]] = {code: {"model": ErrorEnvelope} for code in (404, 500)}
router = APIRouter(prefix="/v1", tags=["datasets"])


def _summary(manifest: DatasetManifest, state: DatasetLocalState) -> dict[str, Any]:
    local = {f.name: f for f in state.files}
    remote = manifest.is_remote_window
    return {
        "id": manifest.id,
        "title": manifest.title,
        "summary": manifest.summary,
        "category": manifest.category.value,
        "evidence_kind": manifest.evidence_kind.value,
        "provider": manifest.provider,
        "source_page": str(manifest.source_page),
        "citation": manifest.citation,
        "usage": manifest.usage,
        "required_by": list(manifest.required_by),
        "notes": list(manifest.notes),
        "files": [
            {
                "name": spec.name,
                "role": spec.role.value,
                "url": str(spec.url),
                "present": local[spec.name].present,
                "size_bytes": local[spec.name].size_bytes
                if local[spec.name].present
                else spec.size_bytes,
                "sha256": local[spec.name].recorded_sha256 or spec.sha256,
            }
            for spec in manifest.files
        ],
        "local": {
            "status": "remote_window" if remote else state.status.value,
            "files_present": state.files_present,
            "files_expected": len(manifest.files),
            "bytes_on_disk": state.bytes_on_disk,
            "acquired_at_utc": state.record.acquired_at_utc if state.record else None,
            "manifest_changed": state.manifest_changed,
        },
        "acquire_command": None if remote else f"uv run lunaris-data acquire {manifest.id}",
    }


@router.get("/datasets", response_model=DatasetList, responses=ERRORS, operation_id="listDatasets")
def list_datasets(request: Request) -> dict[str, Any]:
    """Every registered dataset with its source, citation and local acquisition status."""
    analysis: AnalysisService = request.app.state.analysis
    items = [_summary(m, inspect_dataset(m, analysis.layout)) for m in analysis.registry]
    return {"datasets": items, "count": len(items)}


@router.get(
    "/datasets/{dataset_id}", response_model=Dataset, responses=ERRORS, operation_id="getDataset"
)
def get_dataset(request: Request, dataset_id: str) -> dict[str, Any]:
    analysis: AnalysisService = request.app.state.analysis
    try:
        manifest = analysis.registry.get(dataset_id)
    except UnknownDatasetError:
        raise NotFoundError(f"Dataset {dataset_id!r} is not registered.") from None
    return _summary(manifest, inspect_dataset(manifest, analysis.layout))
