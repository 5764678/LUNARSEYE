"""API errors. Every non-2xx response uses the envelope
``{"error": {code, message, details, request_id}}``."""

from __future__ import annotations

from typing import Any


class ApiError(Exception):
    status_code = 500
    code = "internal_error"

    def __init__(self, message: str, details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or []


class NotFoundError(ApiError):
    status_code = 404
    code = "not_found"


class InvalidRequestError(ApiError):
    status_code = 422
    code = "validation_error"

    def __init__(self, message: str, error_type: str, location: list[str] | None = None) -> None:
        super().__init__(
            message, [{"location": location or ["query"], "message": message, "type": error_type}]
        )


class OutOfCoverageError(ApiError):
    status_code = 422
    code = "out_of_coverage"


class DatasetUnavailableError(ApiError):
    status_code = 503
    code = "dataset_unavailable"


class KernelsUnavailableError(ApiError):
    status_code = 503
    code = "kernels_unavailable"
