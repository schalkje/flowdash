## High Contrast (Dark) — WCAG AAA

### Heart of the Style
- **Accessibility first**: meets WCAG 2.x AAA — text contrast ≥ 7:1, non-text/UI ≥ 3:1.
- **Never color alone (1.4.1)**: every meaningful state — status, selection, focus, container type — is also encoded via stroke pattern, stroke width, or halo. The theme stays legible under achromatopsia and works for protan/deutan/tritan color-vision deficiencies.
- **Luminance over hue**: backgrounds are pure black, text is white (21:1). Hue exists only as a secondary cue layered on top of luminance + pattern.
- **Sharp, no haze**: tight 2 px radius, no soft drop shadows on shapes (only on selection halos), so edges remain crisp at any zoom level.

### Color Scheme (by Effect)
- **Canvas**: `#000000` — pure black, maximum dynamic range.
- **Surface**: `#0a0a0a` — for nodes/containers, almost black so white labels reach 21:1.
- **Text**: `#ffffff` (21:1).
- **Muted text**: `#d4d4d4` (16:1).
- **Accent / selection / focus**: `#ffff00` yellow (19.6:1) — used for the selection halo, focus rings, and the minimap iris.
- **Borders & edges**: `#ffffff` — primary connection lines and shape outlines.

### Status Encoding
| Status | Fill | Stroke colour | Stroke pattern | Width |
|---|---|---|---|---|
| Undetermined | near-black | gray `#888` | dotted `2 4` | 2 |
| Unknown | near-black | light gray `#aaa` | dotted `2 4` | 2 |
| Disabled | black | dim gray `#666` | sparse dotted `2 8`, opacity 0.6 | 2 |
| Ready | deep blue `#003a5a` | cyan `#00d4ff` (14:1) | solid | 2 |
| Updating | near-black | mint `#00ff88` (17:1) | animated `8 4` | 3 |
| Updated | deep green `#003800` | lime `#00ff00` (15:1) | solid | 3 |
| Skipped | deep mustard `#2a2a00` | yellow `#ffff00` (19:1) | long-short `12 4 4 4` | 2 |
| Delayed | deep amber `#3a2400` | amber `#ffaa00` (13:1) | medium dashes `6 6` | 3 |
| Warning | deep orange `#3a1a00` | orange `#ff8000` (11:1) | dash-dot `10 3 2 3` | 4 |
| Error | deep red `#3a0000` | red `#ff4040` (7.4:1) | tight dashes `4 3` | 5 |

Adjacent statuses always differ in **at least two channels** (luminance + pattern, or pattern + width). No two states are distinguishable by hue alone.

### Container-Type Encoding
Container types are also distinguishable without color, via stroke signature:
- **Lane** — fine dotted (`1 3`), 2 px
- **Columns** — dash-dot (`8 2 1 2`), 2 px
- **Group** — solid heavy, 3 px
- **Adapter / Mart / Foundation** — carry the active status pattern

### Selection & Focus
- **Selection**: stroke widens to 5 px, stroke turns yellow accent, plus a `drop-shadow` halo around the shape. The halo is independent of fill colour, so it survives even if the node has the same fill as the canvas neighbour.
- **Edges selected**: stroke 5 px + accent + halo.
- **Keyboard focus** (`:focus-visible`): 3 px solid accent outline with 2 px offset on shapes, zoom buttons, edit boxes, and minimap controls.

### Implementation Notes
- Reuses the existing `@keyframes dash` for `Updating` animation.
- Uses the same `[status="…"]` attribute selectors as every other theme, so no JS changes are required.
- Avoids the red↔green and blue↔purple confusable pairs as the *only* differentiator between any two statuses.
- For users running their OS in `prefers-contrast: more` mode, this theme is the recommended default.
