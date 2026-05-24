> Source: GitHub Issue [#15](https://github.com/schalkje/flowdash/issues/15) — "Validations"

## Why

Today validation state surfaces only as a tri-value field (`false` / `true` / error-message string) rendered as one of four loud styles (pulse-halo, rotating-siren, industrial-tape, police-line). The signal is binary (error/no-error) and the styles always dominate the canvas, so dashboard authors who want lightweight at-a-glance indicators of validation progress (not just failures) have no path. This change introduces an 8-state validation vocabulary plus three minimal indicator modes so authors can surface validation state per-node with low visual cost while leaving the loud styles available for blocking failures.

The data model also gets a clean break: `preValidationError` / `postValidationError` (boolean | string) become object-typed `preValidationState` / `postValidationState` (`{ state, message? }`). No deprecation shim — the legacy field is gone in this change, and the existing `02_validation-errors` demo migrates with it.

## What Changes

**Validation state vocabulary (new).** An independent enum on `BaseNode`, orthogonal to `NodeStatus`:

- `unknown`, `ready`, `busy`, `error`, `warning`, `disabled`, `ok`, `na`
- `na` is the default and renders nothing (preserves today's "unset" behavior).
- A node may be `NodeStatus.UPDATED` while `postValidationState.state === 'busy'` — the two systems do not derive from each other.

**Data-model rename on `BaseNode` (clean break, no shim).**

- `_preValidationError` / `_postValidationError` → `_preValidationState` / `_postValidationState`
- Setters/getters: `preValidationError` → `preValidationState`, same for post. Value shape: `{ state, message? }`.
- `clearValidationErrors()` → `clearValidationStates()` (sets both to `{ state: 'na' }`).
- Constructor accepts `nodeData.preValidationState` / `nodeData.postValidationState`; default `{ state: 'na' }`.
- Render-gate (`nodeBase.js:559`, `nodeBaseContainer.js:677`, `nodeRect.js:74`, `nodeCircle.js:45`) changes from "either is truthy" to "either is not `'na'`".

**Public API rename on `Dashboard` (clean break, no shim).**

- `setValidationErrorById(nodeId, side, value)` → `setValidationStateById(nodeId, side, { state, message? })`
- `clearValidationErrorById(nodeId, side?)` → `clearValidationStateById(nodeId, side?)` (sets to `{ state: 'na' }`)
- `setValidationIndicatorStyle(style)` retained for the four loud styles. A new sibling `setValidationIndicatorMode(mode)` covers the seven modes (three minimal + four loud + 'none'). Style is the legacy axis; mode is the new axis. They alias to the same `settings.validationIndicatorMode` slot internally — `setValidationIndicatorStyle` becomes a thin wrapper for backwards source compatibility on the demo page only.

**Three new minimal indicator modes.** Each renders the full 8-state vocabulary at low visual cost:

- **`minimal-bar`** — 3px-wide vertical bar on the left (pre) and right (post) edges; height = 60% of node-edge, centered vertically, 1px inset.
- **`minimal-circle`** — filled circle, radius 4px, centered exactly on the inbound (left) and outbound (right) connection points via `computeConnectionPoints()`.
- **`minimal-corner`** — 6×6px right-triangle chevron seated on the top-left (pre) and top-right (post) corners; hypotenuse along the corner, chevron outside the rect.

Minimal-mode sizes are **fixed pixel values**, independent of the `VALIDATION_SIZES` token system (which continues to apply only to the loud styles).

**State→color palette** with CSS custom properties (themeable):

| State      | Variable                         | Fallback hex                                       |
| ---------- | -------------------------------- | -------------------------------------------------- |
| `error`    | `--fd-validation-state-error`    | `#c8181d` (matches existing `--fd-validation-red`) |
| `warning`  | `--fd-validation-state-warning`  | `#f2c70b` (matches existing tape yellow)           |
| `ok`       | `--fd-validation-state-ok`       | `#1f8a3d`                                          |
| `busy`     | `--fd-validation-state-busy`     | `#2563eb` (animated)                               |
| `ready`    | `--fd-validation-state-ready`    | `#cbd5e1`                                          |
| `unknown`  | `--fd-validation-state-unknown`  | `#9ca3af`                                          |
| `disabled` | `--fd-validation-state-disabled` | `#4b5563`                                          |
| `na`       | —                                | (nothing renders)                                  |

Variables are declared in every theme file (10 themes total). Themes override per aesthetic; the renderer falls back to the hex values above.

**Settings API.**

- `data.settings.validationIndicatorMode` — dashboard-wide default. Default: `'minimal-bar'`. Values include the three minimal modes, the four loud styles, and `'none'`.
- `node.validationIndicatorMode` — per-node override; wins over the dashboard default. Resolved at render time.
- `data.settings.validationIndicator.style` retained as a legacy alias for the loud-styles demo; reads as `validationIndicatorMode` internally.

**Loud-styles compatibility.** The four existing loud styles (pulse-halo, rotating-siren, industrial-tape, police-line) continue to render but only when `state === 'error'`. For the other 6 visible states they render nothing — preserving today's binary "either show the loud thing on error, or don't" behavior under the new vocabulary.

**Busy animation.** Sub-second pulse (mode-appropriate shape) at ~1.4s loop. Always gated by the existing `shouldAnimate()` helper in `validationIndicators.js` which already honors `prefers-reduced-motion: reduce`. No new accessibility plumbing.

**Error-message surfacing.** When `state` is `'error'` or `'warning'` and `message` is non-empty, the indicator exposes the message as a native SVG `<title>` (tooltip on hover). Other states ignore `message`.

**Demo page.** New `14_status/03_validation-minimal/validation-minimal.html`, sibling to `02_validation-errors`. Exercises all 3 minimal modes × all 8 states with interactive controls and a matrix view showing every state across every mode.

**Existing demo migration.** `14_status/02_validation-errors/js/graphData.js` (8 setters) and `validation-errors.html:297-298` (2 reads) move to the new shape. Behavior identical from the user's POV — same loud rendering, same tooltips, now driven by `{ state: 'error', message }` instead of boolean/string.

## Capabilities

### New Capabilities

- `validation-indicator-modes`: per-node validation state vocabulary with three minimal visual modes (bar, circle, corner) and a themeable state→color palette, layered over the existing loud-styles surface so a single API renders both lightweight indicators and dramatic failure overlays.

### Modified Capabilities

None — the existing loud-styles surface (`pulse-halo`, `rotating-siren`, `industrial-tape`, `police-line`) is unchanged in appearance for `error` state; the rename of underlying data fields and public methods is a clean break covered entirely inside this change.

## Impact

- **Affected code (`dashboard/js/`)**:
  - `nodeBase.js` — data-model rename (`_preValidationError` → `_preValidationState` etc.), default `{ state: 'na' }`, render-gate change at line 559, setter rename, `clearValidationErrors` → `clearValidationStates`.
  - `nodeBaseContainer.js`, `nodeRect.js`, `nodeCircle.js` — three additional render-gate sites mirror the change.
  - `dashboard.js` — public API rename (`setValidationErrorById` → `setValidationStateById`, `clearValidationErrorById` → `clearValidationStateById`); new `setValidationIndicatorMode(mode)`; `setValidationIndicatorStyle` becomes a back-compat wrapper.
  - `validationIndicators.js` — new `VALIDATION_STATES` enum, new modes `minimal-bar` / `minimal-circle` / `minimal-corner` added to `VALIDATION_STYLES`, renamed signature `preState` / `postState` (`{state, message?}`), state→color lookup, `<title>` insertion for `error` / `warning` messages, `busy` animation reuse via `shouldAnimate()`.
  - `configManager.js` — add `validationIndicatorMode: 'minimal-bar'` to `DEFAULT_SETTINGS`; retain `validationIndicator.style` slot for back-compat.
- **Themes (`dashboard/themes/*/flowdash.css`, 10 files)** — declare `--fd-validation-state-{error,warning,ok,busy,ready,unknown,disabled}` with theme-appropriate colors; define keyframes for `busy` pulse.
- **Demos**:
  - `14_status/02_validation-errors/` — migrated; renders identically to before.
  - `14_status/03_validation-minimal/` — new demo page + fixture.
- **Documentation** — `dashboard/documentation/validation-indicators.md` updated to cover the state enum, object-typed field shape, three minimal modes, the rename, the theme-variable contract, and a migration cookbook for downstream consumers.
- **Tests** — new Playwright spec covering: (a) state→color rendering per mode, (b) `'na'` produces no DOM, (c) `'busy'` element has the animation class and is suppressed under `prefers-reduced-motion`, (d) `message` becomes an SVG `<title>`. Existing tests on `02_validation-errors` must still pass after migration.
- **Versioning** — minor bump (1.6.0). No code-only deprecation shims; the rename IS the breaking change for downstream consumers of `setValidationErrorById` / `preValidationError`.
- **Bundle size** — modest additive increase; no new external dependencies.
