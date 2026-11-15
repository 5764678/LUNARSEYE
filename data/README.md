# data/ — local scientific data store

This directory is the default `LUNAREYES_DATA_DIR`. **Nothing acquired here is committed.**
Datasets are fetched reproducibly with `uv run lunareyes-data acquire <dataset-id>`, and every
acquired dataset gets an `acquisition.json` provenance record (URL, size, SHA-256, retrieval
time, tool version).

| Directory | Contents | Committed? |
| --- | --- | --- |
| `raw/<dataset-id>/` | Source products exactly as distributed (e.g. LOLA GDR `.LBL` + `.IMG`) | no |
| `processed/<dataset-id>/` | LUNAREYES-derived artefacts (horizon masks, globe texture, cached PGDA windows), each with its own provenance | no |
| `kernels/<dataset-id>/` | NAIF SPICE kernels | no |
| `state/` | Reserved for local application state; currently unused (the API uses Postgres) | no |
| `fixtures/` | Small, documented test fixtures and validation references | **yes** |

Each dataset's source, citation, size and checksums are in its manifest under
`packages/data/src/lunareyes_data/manifests/`.
