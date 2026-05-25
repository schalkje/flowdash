# Capability: validation-indicator-modes

Delta spec for issue #17. Splits the single `validationIndicatorMode` attribute into orthogonal `validationMode` (baseline) and `validationLoudError` (error-only overlay), shortens the value vocabulary, and removes the pre-#15 `validationIndicator.style` legacy alias.

Requirements from #15 that are **unchanged** (and therefore not repeated below): state vocabulary; message exposure via `<title>`; per-node validation-state setters on `BaseNode`; theme variable contract.

## MODIFIED Requirements

### Requirement: Dashboard-wide indicator attributes

`data.settings` SHALL carry two orthogonal validation-indicator attributes:

- **`validationMode`** — always-on baseline indicator. Allowed values: `'bar'`, `'circle'`, `'corner'`, `'none'`. Default: `'bar'`.
- **`validationLoudError`** — error-only overlay applied when a side's state is exactly `'error'`. Allowed values: `'pulse'`, `'siren'`, `'tape'`, `'police'`, `'none'`. Default: `'none'`.

Both settings MUST be merged into the live settings tree by `ConfigManager` like every other setting. Cross-axis values MUST be rejected — `validationMode` cannot hold a loud value, and `validationLoudError` cannot hold a baseline value. The setters defined in the Public API surface requirement MUST validate input against their respective allowed sets and produce `console.warn` (and no state change) on invalid input.

#### Scenario: Default settings produce baseline-only behavior

- **WHEN** a dashboard is constructed with no `validationMode` or `validationLoudError` configuration
- **THEN** `settings.validationMode` resolves to `'bar'` AND `settings.validationLoudError` resolves to `'none'`
- **AND** every node side renders a state-colored bar AND no loud overlay DOM is ever emitted

#### Scenario: Cross-axis value is rejected with a warning

- **WHEN** code calls `Dashboard.setValidationMode('pulse')` (a loud value passed to the baseline setter)
- **THEN** `console.warn` is emitted AND `settings.validationMode` is unchanged AND no re-render is triggered

### Requirement: Per-node attribute overrides

A node MAY carry either or both of `data.validationMode` and `data.validationLoudError` on `nodeData`. When present, the per-node value SHALL win over the dashboard default for that node on every render. The two attributes MUST resolve independently — a node may override `validationMode` without overriding `validationLoudError`, and vice versa.

Per-node values MUST be read on every render call; mutating `node.data.validationMode` or `node.data.validationLoudError` then calling `_renderValidationIndicators()` SHALL pick up the change. No per-node setters are added — consumers set via direct assignment then re-render.

#### Scenario: Per-node validationMode wins over dashboard default

- **GIVEN** `settings.validationMode === 'bar'` (dashboard-wide) and `node-42` has `data.validationMode = 'circle'`
- **WHEN** the dashboard renders
- **THEN** `node-42` renders with `'circle'` baseline AND all other nodes render with `'bar'` baseline

#### Scenario: Per-node validationLoudError resolves independently of validationMode override

- **GIVEN** `node-42` has `data.validationLoudError = 'siren'` set and no `data.validationMode` set; `settings.validationMode === 'circle'` and `settings.validationLoudError === 'none'`
- **WHEN** `node-42` renders with a side in `state: 'error'`
- **THEN** that side renders `'siren'` (per-node loud wins) AND `node-42`'s baseline resolution falls back to dashboard-wide `'circle'` for non-error sides

### Requirement: Baseline modes render the full state vocabulary

The baseline modes (`validationMode` values `'bar'`, `'circle'`, `'corner'`) MUST render the side's validation state for every visible state per the rules below:

- A side SHALL render a DOM indicator when its state is **not** `'na'` AND the loud overlay is not active for that side.
- The indicator's color MUST resolve via `var(--fd-validation-state-<state>, <fallback>)`. Fallback hex values per the state→color table in #15's `proposal.md`.
- For state `'busy'`, the indicator SHALL animate (sub-second pulse, ~1.4s loop). Animation MUST be suppressed when `shouldAnimate()` in `validationIndicators.js` returns false (which honors `prefers-reduced-motion: reduce`).
- For state `'na'`, no DOM SHALL be emitted for that side (no transparent placeholder, no empty `<g>`).

Geometry (unchanged from #15, only value names shorten):

- **`'bar'`** — 3px wide vertical bar, 60% of the node-edge height, centered vertically, 1px inset from the edge. Left edge = pre, right edge = post.
- **`'circle'`** — filled circle, radius 4px, centered exactly on the inbound (left) and outbound (right) connection points (via `computeConnectionPoints()`).
- **`'corner'`** — 6×6px right-triangle chevron seated on the corner (top-left = pre, top-right = post); hypotenuse along the corner, chevron outside the rect.

Baseline-mode sizes MUST be fixed pixel values, independent of the existing `VALIDATION_SIZES` token system (which continues to apply only to loud overlay styles).

#### Scenario: Baseline circle renders for an OK state

- **GIVEN** `validationMode === 'circle'`, `validationLoudError === 'none'`, and a side with `state: 'ok'`
- **WHEN** the node renders
- **THEN** the side emits an SVG `<circle>` with radius 4px, centered on the connection point, filled with the resolved `--fd-validation-state-ok` color

#### Scenario: 'na' state suppresses baseline DOM

- **GIVEN** any baseline mode and a side with `state: 'na'`
- **WHEN** the node renders
- **THEN** no DOM element is emitted for that side

### Requirement: Loud overlay renders only on `error`

The loud overlay (`validationLoudError` values `'pulse'`, `'siren'`, `'tape'`, `'police'`) MUST render only when a side's state is exactly `'error'`. The render rules are:

- A side SHALL render the loud treatment when its state is `'error'` AND the resolved `validationLoudError !== 'none'`. On the error side, the loud overlay MUST **replace** the baseline — it is not layered on top.
- For all other 7 states (`unknown`, `ready`, `busy`, `warning`, `disabled`, `ok`, `na`), the loud overlay SHALL render nothing on that side. The baseline `validationMode` (if not `'none'`) drives the render for those states.
- When `validationLoudError === 'none'`, the loud overlay SHALL never render — the baseline drives every side at every state.

Loud-overlay geometry, colors, and animations are unchanged from #15. The four loud styles MUST continue to honor `VALIDATION_SIZES`. The renamed `'pulse'` (and `'siren'`, if it animates) MUST continue to honor `prefers-reduced-motion` via the existing `shouldAnimate()` helper.

#### Scenario: Loud overlay fires on error side and replaces baseline

- **GIVEN** `validationMode === 'circle'` and `validationLoudError === 'pulse'`; a node with `preState = { state: 'ok' }` and `postState = { state: 'error' }`
- **WHEN** the node renders
- **THEN** the pre side emits a state-colored circle AND the post side emits an animated pulse-halo treatment with no underlying circle

#### Scenario: Loud overlay does NOT fire on warning

- **GIVEN** `validationMode === 'circle'` and `validationLoudError === 'pulse'`; a side with `state: 'warning'`
- **WHEN** the node renders
- **THEN** that side renders a warning-colored circle AND no pulse-halo DOM is emitted

#### Scenario: Disabling the loud overlay keeps baseline driving error sides

- **GIVEN** `validationMode === 'circle'` and `validationLoudError === 'none'`; a side with `state: 'error'`
- **WHEN** the node renders
- **THEN** that side renders an error-colored circle (baseline) AND no loud DOM is emitted

### Requirement: Public API surface on Dashboard

`Dashboard` SHALL expose the following methods (in addition to the validation-state setters retained unchanged from #15):

- `setValidationMode(mode)` — switches the dashboard-wide baseline mode live; re-renders all nodes. MUST validate `mode` against the allowed baseline set (`'bar' | 'circle' | 'corner' | 'none'`); invalid values MUST produce `console.warn` and no change. 1-arg only — no per-node form.
- `setValidationLoudError(value)` — switches the dashboard-wide loud overlay live; re-renders all nodes. MUST validate `value` against the allowed loud set (`'pulse' | 'siren' | 'tape' | 'police' | 'none'`); invalid values MUST produce `console.warn` and no change. 1-arg only — no per-node form.
- `setValidationIndicatorSize(size)` — unchanged from #15; applies to loud overlay styles only.

The methods `setValidationIndicatorMode(mode)` (renamed) and `setValidationIndicatorStyle(style)` (pre-#15 legacy alias) MUST be removed in this change. Direct calls to them MUST fail at runtime.

#### Scenario: setValidationMode re-renders all nodes

- **WHEN** `Dashboard.setValidationMode('corner')` is called
- **THEN** `settings.validationMode === 'corner'` AND every node without a per-node `validationMode` adopts `'corner'` on the next render

#### Scenario: setValidationLoudError re-renders all nodes

- **WHEN** `Dashboard.setValidationLoudError('siren')` is called
- **THEN** `settings.validationLoudError === 'siren'` AND every node without a per-node override adopts `'siren'` on the next render

#### Scenario: setValidationIndicatorMode no longer exists

- **WHEN** code calls `Dashboard.setValidationIndicatorMode('pulse-halo')`
- **THEN** the call fails at runtime (method undefined)

### Requirement: Demo coverage

- The migrated `14_status/02_validation-errors/` demo SHALL use `validationMode = 'circle'` + `validationLoudError = 'pulse'` (the headline composition). It MUST render the same loud-on-error behavior as before from the user's POV — error sides still show the animated pulse — and additionally MUST show a quiet circle on the healthy side (previously empty).
- The extended `14_status/03_validation-minimal/` demo SHALL gain a `validationLoudError` toggle and a showcase row demonstrating the headline use case: `validationMode = 'circle'` + `validationLoudError = 'pulse'` yielding quiet circle on healthy sides and animated pulse on error sides.
- The migrated `14_status/04_validation-grid/` demo SHALL exercise the new attribute split — grid axes updated to span either `validationMode` × `validationLoudError`, or two separate grids (one per attribute), as appropriate to the page's existing matrix structure.

#### Scenario: 02_validation-errors demo shows quiet baseline + loud overlay simultaneously

- **WHEN** `14_status/02_validation-errors/validation-errors.html` is loaded in a browser
- **THEN** sides in `state: 'error'` render the animated pulse-halo treatment AND sides in `state: 'ok'` (previously empty) render a quiet circle

#### Scenario: 03_validation-minimal demo exposes the new loud-error toggle

- **WHEN** `14_status/03_validation-minimal/validation-minimal.html` is loaded
- **THEN** a `validationLoudError` dropdown is present alongside the existing mode switcher AND a showcase row demonstrates the headline composition (quiet circle + animated pulse on error)

## ADDED Requirements

### Requirement: Per-side render rule composing both attributes

The renderer SHALL compute the effective style independently for each side (pre and post) using a single pure helper. For each side, given the resolved `validationMode` (baseline), the resolved `validationLoudError` (overlay), and the side's `state`, the rule is:

1. If `state === 'na'` → emit no DOM for this side (preserves the `'na'` contract).
2. Else if `state === 'error'` AND `validationLoudError !== 'none'` → render the loud overlay style for this side.
3. Else if `validationMode !== 'none'` → render the baseline style for this side, colored per the state palette.
4. Else → emit no DOM for this side.

The two sides MUST render fully independently. The helper SHALL be exported from `validationIndicators.js` as `resolveEffectiveStyleForSide(validationMode, validationLoudError, state)` and SHALL return the style name to render or `null` for "emit nothing." The helper MUST be pure (no DOM, no side effects) and SHALL be called once per side per render.

#### Scenario: Asymmetric rendering — circle on ok side, pulse on error side

- **GIVEN** `validationMode === 'circle'`, `validationLoudError === 'pulse'`; a node with `preState = { state: 'ok' }` and `postState = { state: 'error' }`
- **WHEN** the node renders
- **THEN** the pre side emits a circle AND the post side emits a pulse AND neither side affects the other

#### Scenario: Both sides in error render loud independently

- **GIVEN** `validationMode === 'circle'`, `validationLoudError === 'pulse'`; a node with both `preState` and `postState` in `state: 'error'`
- **WHEN** the node renders
- **THEN** both sides emit a pulse overlay (loud fires per side; not just one)

#### Scenario: 'na' on one side, error on the other

- **GIVEN** `validationMode === 'bar'`, `validationLoudError === 'pulse'`; a node with `preState = { state: 'na' }` and `postState = { state: 'error' }`
- **WHEN** the node renders
- **THEN** the pre side emits no DOM AND the post side emits a pulse overlay

#### Scenario: Resolver helper is pure

- **WHEN** `resolveEffectiveStyleForSide('circle', 'pulse', 'error')` is called
- **THEN** it returns `'pulse'` AND produces no DOM AND has no side effects

- **WHEN** `resolveEffectiveStyleForSide('none', 'none', 'ok')` is called
- **THEN** it returns `null`

- **WHEN** `resolveEffectiveStyleForSide('circle', 'pulse', 'na')` is called
- **THEN** it returns `null`

## REMOVED Requirements

### Requirement: Legacy validationIndicator.style alias and setValidationIndicatorStyle setter

**Reason:** Pre-#15 cruft superseded by the new two-attribute split. Maintaining a one-vocabulary public surface (per design decision D5) requires removing duplicate paths into the same setting slot. #15 retained the legacy alias as a back-compat wrapper for the `02_validation-errors` demo's style switcher; #17 migrates that demo to the new attributes, so the alias has no remaining caller.

**Migration:**

- `data.settings.validationIndicator.style = '<value>'` → `data.settings.validationMode = '<short-name>'` (for baseline values) OR `data.settings.validationLoudError = '<short-name>'` (for loud values), per the migration cookbook in `dashboard/documentation/validation-indicators.md`.
- `Dashboard.setValidationIndicatorStyle('<value>')` → `Dashboard.setValidationMode('<short-name>')` OR `Dashboard.setValidationLoudError('<short-name>')`, depending on whether the value was baseline or loud.
- The seed in `dashboard/js/configManager.js:60` is removed entirely.

After this change, the project has exactly one vocabulary for validation indicator configuration: `validationMode` + `validationLoudError`.

#### Scenario: Legacy setter no longer exists

- **WHEN** code calls `Dashboard.setValidationIndicatorStyle('pulse-halo')`
- **THEN** the call fails at runtime (method undefined)

#### Scenario: Legacy settings slot no longer exists in defaults

- **WHEN** a dashboard is constructed with no overrides
- **THEN** `settings.validationIndicator.style` is `undefined` (the slot is not seeded)
