# lunareyes-data

Dataset manifests, reproducible acquisition, integrity verification and
preprocessing for the NASA products LUNAREYES uses. Large datasets and SPICE kernels
are **never committed**; this package fetches them and records provenance.

```bash
uv run lunareyes-data list                      # registry + local status
uv run lunareyes-data show lola-ldem-75s-240m   # full manifest
uv run lunareyes-data acquire naif-generic-kernels-lunar
uv run lunareyes-data verify naif-generic-kernels-lunar
uv run lunareyes-data build-web-texture         # after acquiring nasa-svs-cgi-moon-kit
```

| Subpackage | Responsibility |
| --- | --- |
| `manifests/` | One JSON manifest per dataset: source URLs, citation, CRS, resolution, verification status |
| `registry` | Loads and validates manifests |
| `store` | Local data layout (`data/raw`, `data/kernels`, …), acquisition records, status |
| `ingestion/` | Streaming download with SHA-256, atomic writes, acquisition records |
| `validation/` | Integrity re-verification against acquisition records |
| `catalogs/` | The 27-site PGDA product 78 candidate catalogue, with its sources and limitations |
| `readers/` | Readers for acquired products (LOLA PDS3 `LDEM`) |
| `remote/` | Windowed reads of remote DEMs over HTTP byte ranges (PGDA 20 m), with a local window cache |
| `preprocessing/` | Derived, documented artefacts (the web globe texture) |

Every acquired dataset directory contains `acquisition.json`: source URL, final
URL after redirects, HTTP validators, byte size, SHA-256, retrieval time and tool
version. A file without that record is reported as **untracked** — LUNAREYES will not
treat data of unknown provenance as acquired.

The PGDA 20 m DEM (`pgda-lola-20mpp-80s`, 2.7 GB) is never acquired whole, so it has a
manifest but no `acquire` step; it is read in windows through `remote/`.

This package is frozen: it is unchanged from the prototype at `8edfb32`.
