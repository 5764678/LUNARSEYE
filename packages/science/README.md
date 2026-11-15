# lunareyes-science

The scientific core of LUNAREYES. Pure, deterministic, unit-explicit code.

**Rules for this package** (originally set out in `docs/ARCHITECTURE.md`, which is not in this repository):

- No web framework imports, no network access, no implicit file I/O. Data loading
  lives in `lunareyes-data`; HTTP lives in `lunareyes-api`.
- Every public function documents its units and reference frame.
- Every result that leaves this package is accompanied by an
  `lunareyes_science.provenance.Evidence` record stating whether it is an
  observation, a derived product, a model output, a calculation, an assumption,
  or a placeholder.

## Contents

| Module | Status | Purpose |
| --- | --- | --- |
| `constants` | implemented | Reference constants with units and citations |
| `frames` | implemented | Body-fixed lunar frame identifiers (`MOON_ME`, `MOON_PA`) |
| `coordinates` | implemented | Selenographic coordinate validation, normalization, spherical ↔ Cartesian |
| `provenance` | implemented | Evidence / source-reference model |
| `runtime` | implemented | Scientific toolchain version report (reproducibility) |
| `horizon_mask` | implemented | `HorizonMask` type (contract C1) |
| `terrain` | implemented | Polar stereographic projection, DEM grids, terrain horizon, slope and roughness analysis, south-pole scene heightmap |
| `geometry` | implemented | Sun/Earth positions and local az/el via SPICE, validated against JPL Horizons |
| `illumination` | implemented | Visible disc fraction, illumination timelines and windows, terrain-aware and flat-horizon |
| `visibility` | implemented | Geometric Earth line of sight (not a radio link) |
| `energy` | planned | Solar energy estimation |
| `scoring` | planned | Constraints, scoring and site comparison |

Planned modules contain only a docstring describing their responsibility. They
intentionally expose no functions until they are implemented and validated.

This package is frozen: it is unchanged from the prototype at `8edfb32`. Its docstrings
cite `docs/` files (`SCIENCE.md`, `DECISIONS.md`, `ARCHITECTURE.md`, `TASKS.md`) that are
not in this repository.
