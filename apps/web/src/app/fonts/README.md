# Fonts

IBM Plex Sans (400, 500, 600) and IBM Plex Mono (400, 600), as published by IBM in the
`@ibm/plex-sans` and `@ibm/plex-mono` packages (`fonts/complete/woff2`). The files are the
unmodified official builds, not subsets, so the licence's Reserved Font Name clause does not
come into play; `OFL.txt` is the licence text IBM ships with them.

They are vendored (rather than fetched by `next/font/google`) so builds work offline and the
page never depends on a third-party font host. They include the glyphs this UI relies on that
common Latin-only subsets drop: ≤ ≥ → − … ° ×. Plex digits are tabular by default.

Loaded in `../layout.tsx` with `next/font/local` and exposed as `--font-plex-sans` and
`--font-plex-mono`; `../tokens.css` maps those onto `--font-sans` and `--font-mono`.
