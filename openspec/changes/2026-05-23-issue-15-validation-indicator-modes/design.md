# Design

Codifies the design decisions for issue #15. The issue body is the primary spec; this file resolves implementation-shaping decisions discovered while reading the current code.

## D1. Identifier strategy: `mode` is the canonical axis; `style` becomes an alias

The issue describes `validationIndicatorMode` as the new setting. The current code uses `settings.validationIndicator.style`. Decision: introduce `data.settings.validationIndicatorMode` as the canonical setting and keep `settings.validationIndicator.style` (and `setValidationIndicatorStyle`) as a thin alias that reads/writes the same slot. `setValidationIndicatorMode(mode)` is the new public method. Reason: keeps the `02_validation-errors` demo working without rewriting its style switcher control while still giving the new demo a clean axis.

## D2. Per-node mode resolution

`node.validationIndicatorMode` (a string, optional) on `nodeData` wins over `data.settings.validationIndicatorMode`. Resolution happens inside `_renderValidationIndicators()` so per-node overrides take effect on every re-render (resize, state change, settings change). No setter is added — set via `node.data.validationIndicatorMode = X` then `node._renderValidationIndicators()`. Per-node setters can be added later if a demo needs them; out of scope here.

## D3. State→color is renderer-side, not theme-side

The renderer reads `var(--fd-validation-state-<name>, <fallback>)` and uses the resolved color for fill/stroke. Themes declare the seven variables. The renderer does NOT introspect `currentColor` or computed styles — colors come exclusively from those CSS custom properties. This keeps the renderer pure: a theme can change the look without renderer code changes.

## D4. `busy` animation is mode-specific

Each minimal mode renders the `busy` state with a different animation:

- `minimal-bar` — opacity pulse on the bar (1.0 → 0.4 → 1.0, 1.4s).
- `minimal-circle` — radius pulse (4px → 5px → 4px, 1.4s).
- `minimal-corner` — opacity pulse on the chevron (same envelope as bar).

Animations are applied via a CSS class (`validation-indicator--busy`) so themes can override timing and easing. The renderer adds an SVG `<animate>` only when `shouldAnimate()` returns true (which already wraps `prefers-reduced-motion: reduce`). When suppressed, the static state is rendered with no `<animate>` child.

## D5. `<title>` insertion semantics

For minimal modes, `<title>` is inserted on the indicator's top-level `<g>` (the side group), so all sub-shapes inherit it. Insertion happens only when `state ∈ {'error', 'warning'}` AND `message` is a non-empty string. For `na`, no DOM is emitted at all (no empty group, no `<title>` element). Behavior matches the existing loud-styles `<title>` flow.

## D6. Render gate

The four render sites that today check `if (this._preValidationError || this._postValidationError)` (nodeBase.js:559, nodeBaseContainer.js:677, nodeRect.js:74, nodeCircle.js:45) change to a small helper:

```js
hasActiveValidationState() {
  return (
    (this._preValidationState && this._preValidationState.state !== 'na') ||
    (this._postValidationState && this._postValidationState.state !== 'na')
  );
}
```

Defined on `BaseNode` so all four sites call the same method. Reduces drift and makes the "not `'na'`" rule live in one place.

## D7. Connection-point geometry for `minimal-circle`

`computeConnectionPoints(x, y, width, height)` in `utilPath.js:8` returns world-space points keyed by side. Inside a node's render pass, the node `<g>` is already translated to the node's origin (its top-left or center depending on node type). Decision: feed `(0, 0, width, height)` to `computeConnectionPoints` to get **local-frame** connection points relative to the node's `<g>` origin. The minimal-circle indicator paints at those local coordinates. This matches the convention `drawSide()` already uses for the loud styles (`anchorX: -w/2` / `w/2`, `cy: 0` — local frame centered at node center).

Wait — for rectangular nodes the node `<g>` is translated to the rect's top-left, not center, while the loud-styles draw at `(-w/2, 0)` / `(w/2, 0)`. So which is it? Empirically the loud styles render correctly because they sit on the _zone container_ `<g>`, which is centered at the rect. For minimal modes we use the same parent `<g>` (the node's element) — so the same local frame applies. Confirm at implementation time by checking the actual transform on `node.element` for each node type; if asymmetric, normalize by adding an explicit `transform="translate(w/2, h/2)"` wrapper on the validation layer so all modes share one origin convention.

## D8. Minimal-mode placement details

- **`minimal-bar`** — left bar at `x = -w/2 + 1` (1px inset from edge), `y = -0.3h` to `+0.3h` (60% of edge height, centered). Right bar at `x = w/2 - 1`. Width: 3px (fixed).
- **`minimal-circle`** — left at `(-w/2, 0)`, right at `(w/2, 0)`. Radius: 4px (fixed). Filled, no stroke.
- **`minimal-corner`** — top-left chevron: path `M -w/2,-h/2 L -w/2+6,-h/2 L -w/2,-h/2+6 Z`. Top-right: `M w/2,-h/2 L w/2-6,-h/2 L w/2,-h/2+6 Z`. Filled, no stroke, no animation when state ≠ `busy`.

All fixed pixel values. Independent of `VALIDATION_SIZES`.

## D9. Constructor default and migration

`BaseNode` constructor:

```js
this._preValidationState = nodeData.preValidationState ?? { state: 'na' };
this._postValidationState = nodeData.postValidationState ?? { state: 'na' };
```

`nodeData.preValidationError` / `postValidationError` are **not** read. A consumer passing the legacy field will silently produce `{ state: 'na' }` (no error). This is the documented clean break; the demo migration is the canary that catches stale call sites. No `console.warn` on encountering legacy field — adding one would defeat the "clean break" intent (would require keeping a check).

## D10. `setValidationStateById` value validation

Accepts:

- `{ state: <one of 8> }` — message defaults to undefined.
- `{ state: <one of 8>, message: <string> }` — message kept verbatim.
- Anything else (unknown state, missing state, non-string message): `console.warn` and reject (no state change). Reason: the state vocabulary is fixed and small; typos shouldn't silently render `'na'`.

## D11. Loud-styles → state filter

The loud renderer paths (pulse-halo, siren, tape, police) receive the full `{ state, message? }` and short-circuit to render-nothing when `state !== 'error'`. Implementation: `renderValidationIndicators` builds a derived `preErr` / `postErr` for each loud mode where `preErr = preState.state === 'error' ? (preState.message || true) : false` to preserve the existing truthy/string contract of `drawSide`. This keeps the loud-styles `drawSide` / `drawPulseHalo` / etc. functions unchanged.

## D12. Per-theme `busy` keyframe

Themes that want to customize the busy animation can override `--fd-validation-busy-duration` / `--fd-validation-busy-easing` custom properties. The renderer-side keyframe uses fixed names (`fd-validation-pulse-opacity`, `fd-validation-pulse-radius`) declared once in `dashboard.css` (not per-theme) so the keyframe definition is shared.

## D13. Test approach

Playwright drives the new demo page at `/14_status/03_validation-minimal/validation-minimal.html` which renders the full 8×3 matrix. The tests assert DOM presence/absence per cell, attribute-driven (`[data-validation-state="..."]` set by the renderer), with one round-trip on theme-switch to confirm the CSS variable lookup resolves.

## D14. Out of scope

- Cascading validation state to children / up to parents.
- Persisting validation state across sessions.
- Validation execution (running validators).
- Side-panel surfacing of validation state.
- Performance optimization for 800+ node × 2 animated indicator dashboards — revisited only if perf surfaces during implementation.
- Programmatic introspection (`Dashboard.getValidationState(id, side)` getter) — can be added by a follow-up if downstream needs it.
