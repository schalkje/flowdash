# 14_status / 03 — Validation Minimal modes

Exercises the three baseline validation-indicator modes against the full 8-state vocabulary, plus the loud-error overlay that composes on top:

- `bar` — 3px-wide vertical bar on the left (pre) / right (post) edge, 60% of edge height.
- `circle` — 4px-radius filled circle on the inbound/outbound connection point.
- `corner` — 6×6px right-triangle chevron seated on the top corner of the rect.
- Loud overlay: `pulse` / `siren` / `tape` / `police` — fires only when a side is in `state: 'error'`; replaces the baseline on that side.

The page renders one interactive dashboard (driven by the baseline mode picker, the loud-error
picker, and the state picker above the canvas) plus a matrix of three sibling dashboards — one per
baseline mode — each showing the eight states in vocabulary order: `unknown`, `ready`, `busy`,
`error`, `warning`, `disabled`, `ok`, `na`.

States with `'error'` or `'warning'` carry a sample `message` so the hover tooltip (SVG `<title>`)
can be exercised. The `'na'` cell renders no DOM for the indicator side — the rect has nothing on
its right edge.

See `/dashboard/documentation/validation-indicators.md` for the API surface and theme-variable
contract.
