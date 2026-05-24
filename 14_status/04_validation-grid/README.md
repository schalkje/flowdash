# 14_status / 04 — Validation grid

A compact pixel-grid showing **every state × every mode** in one screen:

- Rows: the 8-state validation vocabulary (`unknown`, `ready`, `busy`, `error`,
  `warning`, `disabled`, `ok`, `na`).
- Columns: the 7 indicator modes — 3 minimal (`minimal-bar`, `minimal-circle`,
  `minimal-corner`) + 4 loud (`pulse-halo`, `rotating-siren`,
  `industrial-tape`, `police-line`).
- One extra row right under `error`: **`error (red nose)`** — re-renders the
  same error condition in each loud style, highlighting how the visual
  register shifts when the mode flips from minimal to loud.

Each cell renders by calling `renderValidationIndicators()` directly on a
small reference rect — no per-cell dashboard. Loud-style cells under
non-`error` rows are deliberately blank (dashed background), visualizing the
design constraint that loud modes are error-only.

The theme picker drives the `--fd-validation-state-*` palette live across the
whole grid.
