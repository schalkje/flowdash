## 1. Data-model rename on `BaseNode` (REQ-1, REQ-8)

- [ ] 1.1 In `dashboard/js/nodeBase.js` constructor: replace `this._preValidationError = nodeData.preValidationError ?? false` (line 38) with `this._preValidationState = nodeData.preValidationState ?? { state: 'na' }`. Same for post (line 39).
- [ ] 1.2 Replace the `preValidationError` getter/setter pair (lines 216-224) with a `preValidationState` pair. Setter validates `value.state` against the 8-state enum, treats `value.message` as optional string, skips re-render when `{state,message}` is structurally equal to the prior value. Mirror for `postValidationState` (lines 226-234).
- [ ] 1.3 Replace `clearValidationErrors()` (lines 236-239) with `clearValidationStates()` that sets both sides to `{ state: 'na' }`.
- [ ] 1.4 Add `hasActiveValidationState()` helper on `BaseNode` returning `(pre.state !== 'na') || (post.state !== 'na')`. Single source of truth for the render gate.
- [ ] 1.5 Update `_renderValidationIndicators()` (lines 241-254) to pass `preState`/`postState` (the full objects) to the renderer instead of legacy `preError`/`postError`.
- [ ] 1.6 Update the four render-gate call sites to use `hasActiveValidationState()`:
  - `nodeBase.js:559` (in `resize()`)
  - `nodeBaseContainer.js:677`
  - `nodeRect.js:74`
  - `nodeCircle.js:45`
- [ ] 1.7 Export the state enum from `nodeBase.js` (`VALIDATION_STATES` Object.freeze list) so consumers can import the canonical set.

## 2. Public API rename on `Dashboard` (REQ-7)

- [ ] 2.1 In `dashboard/js/dashboard.js:2464`: rename `setValidationErrorById(nodeId, side, value)` to `setValidationStateById(nodeId, side, valueObj)`. Validate `valueObj.state`; `console.warn` and no-op on unknown/missing state.
- [ ] 2.2 In `dashboard/js/dashboard.js:2484`: rename `clearValidationErrorById` to `clearValidationStateById`. Sets the named side (or both) to `{ state: 'na' }`.
- [ ] 2.3 Add `setValidationIndicatorMode(mode)` method. Validates against the 8-mode allowed set (3 minimal + 4 loud + 'none'). Writes both `settings.validationIndicator.style` (legacy slot) and `settings.validationIndicatorMode` (new canonical slot). Re-renders all nodes.
- [ ] 2.4 Refactor existing `setValidationIndicatorStyle(style)` (line 2498) into a thin wrapper over `setValidationIndicatorMode`.
- [ ] 2.5 Confirm `setValidationIndicatorSize(size)` (line 2518) is unchanged.

## 3. Renderer: state vocabulary + minimal modes (REQ-4, REQ-5, REQ-6)

- [ ] 3.1 In `dashboard/js/validationIndicators.js`: add `export const VALIDATION_STATES = Object.freeze(['unknown','ready','busy','error','warning','disabled','ok','na'])`.
- [ ] 3.2 Extend `VALIDATION_STYLES` with `'minimal-bar'`, `'minimal-circle'`, `'minimal-corner'`. (Treat `VALIDATION_STYLES` as the union: keep the name, add the new entries.)
- [ ] 3.3 Change `renderValidationIndicators(nodeG, opts)` signature from `opts.preError`/`opts.postError` to `opts.preState`/`opts.postState` (each `{ state, message? }`). Compute `hasAny = (preState.state !== 'na') || (postState.state !== 'na')`; early-return when false.
- [ ] 3.4 For loud styles: derive `preErr = preState.state === 'error' ? (preState.message || true) : false` (and post). Pass through to the existing `drawSide` / `drawPulseHalo` / `drawSiren` / `drawIndustrialTape` / `drawPoliceLine` unchanged. This preserves today's binary-on-error behavior.
- [ ] 3.5 Add `drawMinimalBar(g, side, state, message, w, h)` — 3px × 0.6h vertical bar, 1px inset, fill = `var(--fd-validation-state-<state>, <fallback>)`. When state is `'busy'`, add `class="validation-indicator--busy"` and an SVG `<animate attributeName="opacity" values="1;0.4;1" dur="1.4s" repeatCount="indefinite">` gated by `shouldAnimate()`.
- [ ] 3.6 Add `drawMinimalCircle(g, side, state, message, w, h)` — `<circle r=4>` at `(±w/2, 0)`. For `'busy'`, `<animate attributeName="r" values="4;5;4" dur="1.4s">` gated by `shouldAnimate()`.
- [ ] 3.7 Add `drawMinimalCorner(g, side, state, message, w, h)` — `<path>` for the 6×6px right-triangle chevron on top-left (pre) or top-right (post). For `'busy'`, opacity pulse same as bar.
- [ ] 3.8 In all three minimal drawers: insert `<title>` child only when state ∈ `{'error', 'warning'}` AND `message` is a non-empty string.
- [ ] 3.9 Rename the existing `shouldAnimate` helper if needed; today it's named `prefersReducedMotion` (returns boolean, true when motion is reduced). Add a thin `shouldAnimate(opts)` export that returns `opts.animate !== false && !prefersReducedMotion()` matching the inline logic at line 81. Required so callers outside this file (and the test harness) can mock it.
- [ ] 3.10 Add `data-validation-state="<state>"` and `data-validation-mode="<mode>"` attributes on the side group `<g>` so tests can query precisely.

## 4. Wire `validationIndicatorMode` setting (REQ-2, REQ-3)

- [ ] 4.1 In `dashboard/js/configManager.js:53`: add `validationIndicatorMode: 'minimal-bar'` at the top-level of `DEFAULT_SETTINGS`. Retain the existing `validationIndicator: { style, size, glyph, animate }` nested settings for back-compat.
- [ ] 4.2 In `BaseNode._renderValidationIndicators()`: resolve effective mode as `node.data.validationIndicatorMode ?? settings.validationIndicatorMode ?? settings.validationIndicator?.style ?? 'minimal-bar'`. Pass to `renderValidationIndicators(...)` as `opts.style`.

## 5. Theming (REQ-9)

- [ ] 5.1 In each of the 10 theme files (`dashboard/themes/{brutalism,cyberpunk,dark,flat,glassmorphism,high-contrast-dark,high-contrast-light,light,neumorphism,retro}/flowdash.css`) declare the 7 state variables on the theme's host selector. Color choices follow each theme's aesthetic; use the fallback hex set only where a theme has no obviously-better choice.
- [ ] 5.2 In `dashboard/flowdash.css` (or equivalent top-level stylesheet) declare a default block of the 7 variables matching the fallback hex set, so a no-theme load still renders correctly.
- [ ] 5.3 Add `.validation-indicator--busy { /* keyframe binding for var-driven duration */ }` plus the `@keyframes` once in the same top-level stylesheet (not per-theme).

## 6. Migrate `02_validation-errors` demo (REQ-10)

- [ ] 6.1 In `14_status/02_validation-errors/js/graphData.js`: change each of the 8 setters (lines 40, 53, 60, 61, 73, 105, 141, 142) from `preValidationError: <string|true>` to `preValidationState: { state: 'error', message: <string> }` (or just `{ state: 'error' }` for bare `true`). Same for `postValidationError`.
- [ ] 6.2 In `14_status/02_validation-errors/validation-errors.html:297-298`: change reads of `node.preValidationError` / `node.postValidationError` to `node.preValidationState.state !== 'na'` and `.state !== 'na'`.
- [ ] 6.3 In the same file's switcher (lines 223, 235, 245, 320, 330): update method names `setValidationErrorById` → `setValidationStateById` and the value argument shape to `{ state: next ? 'error' : 'na' }`. Mirror for the post toggle. Update the API-help copy at lines 186-188 to reflect the new method name.

## 7. Build new `03_validation-minimal` demo (REQ-10)

- [ ] 7.1 Create directory `14_status/03_validation-minimal/`.
- [ ] 7.2 Add `js/graphData.js` with a small fixture: a row of 8 nodes (one per state, in vocab order), wired through a simple container. Include `validationIndicator` defaults; do NOT set `validationIndicatorMode` (so the dashboard-default applies and the mode switcher can drive it).
- [ ] 7.3 Add `validation-minimal.html` modeled on `02_validation-errors`. Controls:
  - Mode switcher: dropdown for `data.settings.validationIndicatorMode` covering the 3 minimal modes (driving `setValidationIndicatorMode`).
  - State switcher: per-node dropdown (8 options) wired to `setValidationStateById`.
  - Per-node mode override: per-node dropdown wired to `node.data.validationIndicatorMode = X; node._renderValidationIndicators()`.
  - Matrix view: an 8×3 grid showing each state in each mode side-by-side (rendered as a small sub-dashboard or as 24 mini-dashboards — implementer's call).
- [ ] 7.4 Add a `README.md` in the demo folder summarizing what's exercised.

## 8. Documentation (REQ-1 → REQ-10)

- [ ] 8.1 Update `dashboard/documentation/validation-indicators.md`:
  - Top-level: replace the boolean/string field shape with the `{ state, message? }` object shape and the 8-state enum.
  - Modes section: document the three minimal modes (geometry, fixed sizes, color resolution via CSS variables).
  - Settings section: document `data.settings.validationIndicatorMode` and `node.validationIndicatorMode`.
  - API section: rewrite to use `setValidationStateById` / `clearValidationStateById` / `setValidationIndicatorMode`.
  - Theme contract section: list the 7 CSS variables themes must define.
  - Migration cookbook: a fenced-code block showing the before/after for the common patterns (`preValidationError: true`, `preValidationError: 'msg'`, `setValidationErrorById(id, 'pre', true)`).

## 9. Tests (REQ-1, REQ-4, REQ-5, REQ-6)

- [ ] 9.1 Add Playwright spec `tests/validation-indicator-modes.spec.js`. Drive the new `/14_status/03_validation-minimal/validation-minimal.html` demo. Cover:
  - (a) For each minimal mode × each of 7 visible states: the side group `<g>` carries `data-validation-state="<state>"` and a child shape (rect / circle / path) with the expected fill resolving to a non-empty color.
  - (b) State `'na'` produces no DOM for that side (no `g.validation-indicator[data-side="pre"]`).
  - (c) State `'busy'` produces a `<g>` with class `validation-indicator--busy` and either an `<animate>` child (when motion enabled) or no `<animate>` child (when emulated `prefers-reduced-motion: reduce`).
  - (d) `state ∈ {'error','warning'}` with `message: 'X'` produces a `<title>` child with text `'X'`. Other states with `message` set produce no `<title>`.
  - (e) Switching `setValidationIndicatorMode('minimal-circle')` re-renders all nodes' indicators with circles; round-trips back to `minimal-bar`.
  - (f) Per-node `node.data.validationIndicatorMode = 'minimal-corner'` overrides the dashboard default for that node only.
- [ ] 9.2 Smoke-test `02_validation-errors`: assert the loud-styles spec (if one exists; otherwise add a minimal one) still renders error+message correctly after migration.

## 10. Verify

- [ ] 10.1 Run `npm test` from repo root. Cross-check failures against the baseline (memory `project_test_baseline.md`: 5 expected + 68 unexpected). Any NEW failures are regressions and must be addressed.
- [ ] 10.2 Manually load `/14_status/02_validation-errors/validation-errors.html` and `/14_status/03_validation-minimal/validation-minimal.html`; visually confirm both pages render the expected indicators and the matrix view.

## 11. Release

- [ ] 11.1 From `/dashboard/`: `npm version minor` to bump to 1.6.0.
- [ ] 11.2 `npm run build` and confirm the bundle banner picks up the new version.
