# Capability: validation-indicator-modes

Per-node validation state vocabulary with multiple visual modes (3 minimal + 4 loud + 'none'), themeable colors, and an optional message surfaced as an SVG tooltip.

## Requirements

### REQ-1 — State vocabulary

Every `BaseNode` carries two validation-state fields, `preValidationState` and `postValidationState`. Each is an object of shape:

```
{ state: 'unknown' | 'ready' | 'busy' | 'error' | 'warning' | 'disabled' | 'ok' | 'na',
  message?: string }
```

Default on construction is `{ state: 'na' }`, which renders nothing for that side.

The state vocabulary is **independent** of `NodeStatus`. A node may be `NodeStatus.UPDATED` while `postValidationState.state === 'busy'`. No derivation, cascade, or coupling between the two vocabularies.

### REQ-2 — Dashboard-wide indicator mode

`data.settings.validationIndicatorMode` selects the visual treatment. Allowed values:

- Minimal: `'minimal-bar'`, `'minimal-circle'`, `'minimal-corner'`
- Loud: `'pulse-halo'`, `'rotating-siren'`, `'industrial-tape'`, `'police-line'`
- Off: `'none'`

Default: `'minimal-bar'`. The setting is merged into the live settings tree by `ConfigManager` like every other setting.

### REQ-3 — Per-node mode override

A node may carry `data.validationIndicatorMode` to override the dashboard default. When present, the per-node value wins for that node on every render. Per-node value is read on every render call; mutating `node.data.validationIndicatorMode` then calling `_renderValidationIndicators()` picks up the change.

### REQ-4 — Minimal modes render the full state vocabulary

For modes `minimal-bar`, `minimal-circle`, `minimal-corner`:

- A side renders a DOM indicator when its state is **not** `'na'`.
- The indicator's color resolves via `var(--fd-validation-state-<state>, <fallback>)`. Fallback hex values per the state→color table in `proposal.md`.
- For state `'busy'`, the indicator animates (sub-second pulse, ~1.4s loop). Animation is suppressed when the existing `shouldAnimate()` helper in `validationIndicators.js` returns false (which honors `prefers-reduced-motion: reduce`).
- For state `'na'`, no DOM is emitted for that side (no transparent placeholder, no empty `<g>`).

Geometry:

- **`minimal-bar`** — 3px wide vertical bar, 60% of the node-edge height, centered vertically, 1px inset from the edge. Left edge = pre, right edge = post.
- **`minimal-circle`** — filled circle, radius 4px, centered exactly on the inbound (left) and outbound (right) connection points (via `computeConnectionPoints()`).
- **`minimal-corner`** — 6×6px right-triangle chevron seated on the corner (top-left = pre, top-right = post); hypotenuse along the corner, chevron outside the rect.

Minimal-mode sizes are **fixed pixel values**, independent of the existing `VALIDATION_SIZES` token system (which continues to apply only to loud styles).

### REQ-5 — Loud styles render only on `error`

For modes `pulse-halo`, `rotating-siren`, `industrial-tape`, `police-line`:

- A side renders the existing loud treatment when its state is `'error'`. Behavior identical to today's truthy-rendering path.
- For all other 7 states (`unknown`, `ready`, `busy`, `warning`, `disabled`, `ok`, `na`), the loud styles render nothing on that side.

Loud-style geometry, colors, and animations are unchanged. The four loud styles continue to honor `VALIDATION_SIZES`.

### REQ-6 — Message exposure

When a side's state is `'error'` or `'warning'` and `message` is a non-empty string, the rendered indicator includes an SVG `<title>` child containing the message text. Browsers expose this as a hover tooltip.

For all other states, `message` is ignored (no `<title>` is emitted).

### REQ-7 — Public API surface on `Dashboard`

- `setValidationStateById(nodeId, side, valueObj)` — `side ∈ {'pre','post'}`, `valueObj = { state, message? }`. Logs `console.warn` and is a no-op when `state` is missing or unrecognized, when `side` is invalid, or when the node id does not resolve.
- `clearValidationStateById(nodeId, side?)` — sets the named side (or both if omitted) to `{ state: 'na' }`. No-op when the node does not resolve.
- `setValidationIndicatorMode(mode)` — switches the dashboard-wide mode live; re-renders all nodes. `mode` validated against the allowed set; invalid values produce `console.warn` and no change.
- `setValidationIndicatorStyle(style)` — back-compat thin wrapper over `setValidationIndicatorMode` covering only the four loud styles. Retained so the `02_validation-errors` demo's existing style switcher keeps working.
- `setValidationIndicatorSize(size)` — unchanged; applies to loud styles only.

The legacy methods `setValidationErrorById` and `clearValidationErrorById` are **removed** in this change. Direct calls to them fail at runtime.

### REQ-8 — Per-node setters on `BaseNode`

- `node.preValidationState` getter returns the current `{ state, message? }` object (read-only from caller's perspective — mutating the returned object does not trigger a re-render).
- `node.preValidationState =` setter accepts `{ state, message? }`. Validates `state`. Skips re-render when the new value is structurally equal to the current value (`state` and `message` both unchanged).
- Identical pair for `postValidationState`.
- `node.clearValidationStates()` sets both sides to `{ state: 'na' }`.

Legacy `preValidationError` / `postValidationError` getters/setters and `clearValidationErrors()` are **removed**.

### REQ-9 — Theme variables

Every theme under `dashboard/themes/<name>/flowdash.css` declares the following CSS custom properties on `:root` (or equivalent host selector):

```
--fd-validation-state-error: <theme color>;
--fd-validation-state-warning: <theme color>;
--fd-validation-state-ok: <theme color>;
--fd-validation-state-busy: <theme color>;
--fd-validation-state-ready: <theme color>;
--fd-validation-state-unknown: <theme color>;
--fd-validation-state-disabled: <theme color>;
```

Ten themes total (brutalism, cyberpunk, dark, flat, glassmorphism, high-contrast-dark, high-contrast-light, light, neumorphism, retro). The renderer falls back to the documented hex values when a theme omits a variable.

### REQ-10 — Demo coverage

- **Existing** `14_status/02_validation-errors/` migrates to the new API (`{ state: 'error', message }` for the 8 setters and the 2 read sites). Renders **identically** to before for the user.
- **New** `14_status/03_validation-minimal/validation-minimal.html` renders a 3-mode × 8-state matrix plus interactive controls to set per-node state and per-node mode. Sibling to `02_validation-errors`.
