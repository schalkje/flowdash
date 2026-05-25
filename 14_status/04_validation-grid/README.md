# 14_status / 04 — Validation grid

A compact pixel-grid showing **every state × every indicator style** in one screen:

- Rows: the 8-state validation vocabulary (`unknown`, `ready`, `busy`, `error`,
  `warning`, `disabled`, `ok`, `na`).
- Columns: 3 baseline `validationMode` values (`bar`, `circle`, `corner`) + 4
  loud `validationLoudError` values (`pulse`, `siren`, `tape`, `police`).
  Baseline columns set `validationMode: <col>` + `validationLoudError: 'none'`;
  loud columns set `validationMode: 'none'` + `validationLoudError: <col>` so
  each column exercises exactly one axis in isolation.
- One extra row right under `error`: **`error (red nose)`** — re-renders the
  same error condition under each loud overlay, highlighting how the visual
  register shifts when the loud axis is engaged.

Each cell renders by instantiating a `RectangularNode` with per-node
`validationMode` and `validationLoudError` overrides, so the actual code path
that dashboards use in the wild is exercised. Loud-overlay cells under
non-`error` rows are deliberately blank (dashed background), visualizing the
design constraint that the loud overlay is error-only.

The active theme is driven by the **global** switcher in the top-left of the
page (injected by `themeManager.js`). The grid rebuilds on every
`flowdash:themechange` event so fresh SVGs pick up the new
`--fd-validation-state-*` palette — relying on `var()` cascade alone is
brittle for SVG presentation attributes that were created under the previous
theme.

A **loud-overlay size** selector (`normal` · `large` · `big` · `huge` · `gigantic`,
matching the `VALIDATION_SIZES` scale 1×–8×) drives the size of the four loud
overlays in the `error` row and the `error (red nose)` callout row. The three
baseline modes ignore the size — they are fixed pixel size by design.
