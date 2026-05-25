# 14_status / 05 — Validation Minimal modes (pre side)

Mirror of `03_validation-minimal` driving the **pre (left) side** of each node
instead of the post side. Same three baseline modes (`bar`, `circle`,
`corner`) and same loud-error overlay (`pulse`, `siren`, `tape`, `police`),
just attached to the inbound edge rather than the outbound edge.

Useful for:

- Confirming the indicator geometry mirrors correctly across the left/right
  axis. The pre-side `bar` sits 1 px inside the left edge; the pre-side
  `circle` lands on the inbound connection point; the pre-side `corner`
  chevron seats on the top-left.
- Catching one-sided regressions where a renderer change to post happens to
  break pre (or vice versa).

The page renders one interactive dashboard (driven by the baseline mode
picker, the loud-error picker, and the pre-state picker above the canvas)
plus a matrix of three sibling dashboards — one per baseline mode — each
showing the eight states in vocabulary order: `unknown`, `ready`, `busy`,
`error`, `warning`, `disabled`, `ok`, `na`.

States with `'error'` or `'warning'` carry a sample `message` so the hover
tooltip (SVG `<title>`) can be exercised. The `'na'` cell renders no DOM for
the pre side — the rect has nothing on its left edge.

See `/dashboard/documentation/validation-indicators.md` for the API surface
and theme-variable contract.
