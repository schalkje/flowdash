## High Contrast (Light) — WCAG AAA

### Heart of the Style

- **Accessibility first**: meets WCAG 2.x AAA — text contrast ≥ 7:1, non-text/UI ≥ 3:1.
- **Never color alone (1.4.1)**: status, selection, focus, and container type are all encoded redundantly via stroke pattern, stroke width, and halo. The theme remains legible under achromatopsia and works for protan/deutan/tritan deficiencies.
- **Maximum legibility on bright surfaces**: pure white canvas, pure black text (21:1).
- **Sharp edges, no haze**: 2 px radius, no soft drop shadows on shapes (only on selection halos), so node boundaries stay crisp at any zoom.

### Color Scheme (by Effect)

- **Canvas**: `#ffffff` — pure white.
- **Surface**: `#ffffff` — nodes and containers. Black labels on top reach 21:1.
- **Text**: `#000000` (21:1).
- **Muted text**: `#2a2a2a` (14:1).
- **Accent / selection / focus**: `#000080` navy (13.5:1) — selection halo, focus rings, minimap iris.
- **Borders & edges**: `#000000` — primary connection lines and shape outlines.

### Status Encoding

| Status       | Fill (light tint)     | Stroke colour                 | Stroke pattern        | Width |
| ------------ | --------------------- | ----------------------------- | --------------------- | ----- |
| Undetermined | `#e8e8e8`             | gray `#555`                   | dotted `2 4`          | 2     |
| Unknown      | `#e8e8e8`             | dark gray `#404040`           | dotted `2 4`          | 2     |
| Disabled     | `#f4f4f4`             | `#777`, opacity 0.6           | sparse dotted `2 8`   | 2     |
| Ready        | pale blue `#cce5ff`   | navy `#000080` (13.5:1)       | solid                 | 2     |
| Updating     | pale cyan `#e6f7ff`   | deep teal `#004d40` (11:1)    | animated `8 4`        | 3     |
| Updated      | pale green `#ccffcc`  | dark green `#005500` (9.4:1)  | solid                 | 3     |
| Skipped      | pale yellow `#ffffcc` | dark olive `#5a5a00` (9:1)    | long-short `12 4 4 4` | 2     |
| Delayed      | pale amber `#ffe0b3`  | dark amber `#7a4500` (6.7:1)  | medium dashes `6 6`   | 3     |
| Warning      | pale orange `#ffd6a5` | dark orange `#7a3300` (8.5:1) | dash-dot `10 3 2 3`   | 4     |
| Error        | pale red `#ffcccc`    | dark red `#a30000` (7.5:1)    | tight dashes `4 3`    | 5     |

Adjacent statuses always differ in **at least two channels** (luminance + pattern, or pattern + width). No two states are distinguishable by hue alone.

### Container-Type Encoding

- **Lane** — fine dotted (`1 3`), 2 px
- **Columns** — dash-dot (`8 2 1 2`), 2 px
- **Group** — solid heavy, 3 px
- **Adapter / Mart / Foundation** — carry the active status pattern

### Selection & Focus

- **Selection**: stroke widens to 5 px, turns navy, plus a `drop-shadow` halo around the shape — independent of fill colour.
- **Edges selected**: stroke 5 px + accent + halo.
- **Keyboard focus** (`:focus-visible`): 3 px solid accent outline with 2 px offset on shapes, zoom buttons, edit boxes, and minimap controls.

### Implementation Notes

- Reuses the existing `@keyframes dash` for `Updating`.
- Uses the same `[status="…"]` attribute selectors as every other theme — no JS changes required.
- Avoids the red↔green and blue↔purple confusable pairs as the _only_ differentiator between any two statuses.
- Stroke-pattern + stroke-width carry the semantic load; hue is layered on top as a secondary cue for users who can perceive it.
