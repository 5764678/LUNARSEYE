"""The committed OpenAPI document (source of the generated web types) must equal what the
app serves. Needs no database or data: the schema is built from the route definitions.

If this fails: start the API, run ``npm run contracts:generate``, commit the result.
"""

from __future__ import annotations

import json
from pathlib import Path

from lunaris_api.main import app

COMMITTED = Path(__file__).parents[2] / "apps/web/src/shared/api/openapi.json"


def test_committed_openapi_matches_the_app() -> None:
    assert json.loads(COMMITTED.read_text()) == json.loads(json.dumps(app.openapi()))


def test_every_route_has_an_operation_id_and_errors_use_the_envelope() -> None:
    schema = app.openapi()
    for path, methods in schema["paths"].items():
        for method, op in methods.items():
            assert op.get("operationId"), f"{method.upper()} {path} has no operationId"
            for code, response in op["responses"].items():
                if code.startswith("2") or code == "422" and path == "/health":
                    continue
                ref = response["content"]["application/json"]["schema"]["$ref"]
                expected = "Health" if path == "/health" and code == "503" else "ErrorEnvelope"
                assert ref.endswith("/" + expected), f"{method.upper()} {path} {code}: {ref}"
