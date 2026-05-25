## 1. Settings + defaults (REQ-2, REQ-3)

- [x] 1.1 In `dashboard/js/configManager.js:54–58`: rename `validationIndicatorMode: 'minimal-bar'` → `validationMode: 'bar'`. Update the inline comment listing allowed values to the short baseline set (`'bar' | 'circle' | 'corner' | 'none'`).
- [x] 1.2 In `dashboard/js/configManager.js`: add `validationLoudError: 'none'` immediately below `validationMode`. Inline comment listing allowed values: `'pulse' | 'siren' | 'tape' | 'police' | 'none'`.
- [x] 1.3 In `dashboard/js/configManager.js:60`: **remove** the `validationIndicator.style` legacy seed entirely (along with the surrounding `validationIndicator: { ... }` block if it now becomes empty — confirm no other settings live in it before deleting). If other settings remain in that block, leave them and only delete the `style` line.

## 2. Resolution helpers (REQ-3, REQ-11)

- [x] 2.1 In `dashboard/js/nodeBase.js:283–305`: replace the single `const mode = ...` resolution with two helpers, both reading from `node.data` first then dashboard `settings`:
  - `resolveValidationMode()` → `this.data?.validationMode ?? settings.validationMode ?? 'bar'`
  - `resolveValidationLoudError()` → `this.data?.validationLoudError ?? settings.validationLoudError ?? 'none'`
- [x] 2.2 Update `_renderValidationIndicators()` to pass both resolved values into `renderValidationIndicators(nodeG, opts)` as `opts.validationMode` and `opts.validationLoudError` (instead of the single `opts.style`).

## 3. Renderer enum + composition helper (REQ-2, REQ-4, REQ-5, REQ-11)

- [x] 3.1 In `dashboard/js/validationIndicators.js:24–33`: rename the `VALIDATION_STYLES` enum values to short names. End-state list: `'none', 'bar', 'circle', 'corner', 'pulse', 'siren', 'tape', 'police'`. Update the leading comment block on line 23 to reflect the new vocabulary and the split into baseline vs. loud subsets.
- [x] 3.2 Add two exported frozen subsets next to `VALIDATION_STYLES`:
  - `VALIDATION_BASELINE_STYLES = Object.freeze(['none', 'bar', 'circle', 'corner'])`
  - `VALIDATION_LOUD_STYLES = Object.freeze(['none', 'pulse', 'siren', 'tape', 'police'])`
  - The setters in step 5 use these for validation.
- [x] 3.3 Add `export function resolveEffectiveStyleForSide(validationMode, validationLoudError, state)`:
  - Returns `null` if `state === 'na'`.
  - Returns `validationLoudError` if `state === 'error'` AND `validationLoudError !== 'none'`.
  - Returns `validationMode` if `validationMode !== 'none'`.
  - Otherwise returns `null`.
  - Pure function. No DOM, no side effects.
- [x] 3.4 Change `renderValidationIndicators(nodeG, opts)` signature in `validationIndicators.js:145–183`: replace `opts.style` with `opts.validationMode` and `opts.validationLoudError`. Inside, call `resolveEffectiveStyleForSide(...)` once for the pre side and once for the post side, then dispatch each call to `drawSide()` with the resolved style. When the resolver returns `null` for a side, skip the `drawSide()` call for that side (no DOM emitted).
- [x] 3.5 Rename all internal references to long-form style values throughout `validationIndicators.js`: `'pulse-halo' → 'pulse'`, `'rotating-siren' → 'siren'`, `'industrial-tape' → 'tape'`, `'police-line' → 'police'`, `'minimal-bar' → 'bar'`, `'minimal-circle' → 'circle'`, `'minimal-corner' → 'corner'`. Includes any switch/case statements in `drawSide()`, any `[data-validation-mode="..."]` attribute writes (step 3.7), and any debug log strings. **One vocabulary across the file.**
- [x] 3.6 Confirm `shouldAnimate()` at lines 80, 89 is unchanged and continues to gate `<animate>` emission for the renamed `'pulse'` (and `'siren'` if it animates). No new accessibility plumbing.
- [x] 3.7 Update `data-validation-mode="<value>"` attributes (added in #15) to emit the short value names — required for test query consistency.

## 4. Public API: rename + add + remove (REQ-7)

- [x] 4.1 In `dashboard/js/dashboard.js:2517–2537`: rename `setValidationIndicatorMode(mode)` → `setValidationMode(mode)`. Validate `mode` against `VALIDATION_BASELINE_STYLES`; `console.warn` and no-op on cross-axis values (e.g. someone passing `'pulse'`) or unknown values. Writes `settings.validationMode`. Triggers re-render of all nodes.
- [x] 4.2 Add `setValidationLoudError(value)` immediately after `setValidationMode`. Same shape: validates against `VALIDATION_LOUD_STYLES`; `console.warn` and no-op on invalid; writes `settings.validationLoudError`; re-renders.
- [x] 4.3 **Remove** `Dashboard.setValidationIndicatorStyle(...)` entirely. No deprecation shim, no console warning — direct calls fail at runtime, per the clean-break intent (design decision D10).
- [x] 4.4 Confirm `setValidationIndicatorSize(size)` is unchanged (loud-overlay size only).

## 5. Demo migration: `02_validation-errors` (REQ-10)

- [x] 5.1 In `14_status/02_validation-errors/js/graphData.js:17`: change `validationIndicatorMode: 'pulse-halo'` to `validationMode: 'circle'` + `validationLoudError: 'pulse'`. This makes the demo simultaneously exercise the headline use case (quiet circle on healthy sides, animated pulse on error sides) — visually richer than before but preserves the original loud-on-error contract.
- [x] 5.2 If the same file or any other file under `14_status/02_validation-errors/` calls `Dashboard.setValidationIndicatorStyle(...)` or `Dashboard.setValidationIndicatorMode(...)`, update to `setValidationMode(...)` and/or `setValidationLoudError(...)` with the appropriate split.
- [ ] 5.3 Smoke-test in a browser: error sides still show animated pulse (matches old behavior); healthy sides now show a quiet circle (new — additive improvement).

## 6. Demo migration: `03_validation-minimal` (REQ-10)

- [x] 6.1 In `14_status/03_validation-minimal/js/graphData.js:43,66`: rename `validationIndicatorMode` references to `validationMode` and shorten value names per the mapping table.
- [x] 6.2 Extend `14_status/03_validation-minimal/validation-minimal.html`:
  - Add a `validationLoudError` dropdown switcher next to the existing mode switcher. Options: `'none', 'pulse', 'siren', 'tape', 'police'`. Wired to `Dashboard.setValidationLoudError(value)`.
  - Add a showcase row (or a single highlighted node group) demonstrating the headline composition: `validationMode = 'circle'` + `validationLoudError = 'pulse'`. Label it clearly so an operator browsing the demo sees the intended use case at a glance.
- [ ] 6.3 If the demo's existing 8×3 state×mode matrix view exists, augment with a second matrix or a toggle showing the same matrix with `validationLoudError = 'pulse'` active so the visual difference between "baseline only" and "baseline + loud overlay on error" is immediately obvious.

## 7. Demo migration: `04_validation-grid` (REQ-10)

- [x] 7.1 In `14_status/04_validation-grid/validation-grid.html:290`: update the `validationIndicatorMode: mode` assignment to the new attribute split. Two implementation options — implementer picks based on the page's existing matrix structure:
  - **Option A** (recommended if the grid axes are already `mode × state`): expand axes to `(validationMode, validationLoudError) × state` — 4×5 grid of (baseline, loud) pairs against 8 states.
  - **Option B**: split into two side-by-side grids — one varying `validationMode` over states, the other varying `validationLoudError` over states.
- [x] 7.2 Update any controls (dropdowns, buttons) on the page to use the new attribute names and short values.
- [ ] 7.3 Smoke-test in a browser: every grid cell renders the expected indicator combination.

## 8. Test migration (REQ-11 and all)

- [x] 8.1 `git mv tests/validation-indicator-modes.spec.js tests/validation-modes.spec.js` (preserves git history).
- [x] 8.2 In the renamed spec file: rename all `validationIndicatorMode` references to `validationMode` (lines 13, 155, 160 currently; grep for all occurrences). Shorten long value names (`'minimal-corner'` → `'corner'`, etc.). Rename `data.validationIndicatorMode` and `setValidationIndicatorMode(...)` to the new attribute / setter names.
- [x] 8.3 Add new specs covering the composition behaviors per REQ-11:
  - (a) Default settings: `validationMode === 'bar'` + `validationLoudError === 'none'` → every node side renders a bar; loud overlay never fires.
  - (b) `validationMode: 'circle'` + `validationLoudError: 'pulse'`: a node with `preState = ok` + `postState = error` renders a circle on pre and a pulse on post.
  - (c) Switching post state to `ok`: pulse DOM disappears, circle appears on post.
  - (d) Switching pre state to `error`: pre side gets a pulse (loud fires per side independently).
  - (e) `validationLoudError: 'none'`: any side entering error still renders the baseline (no loud DOM ever).
  - (f) `validationMode: 'none'` + `validationLoudError: 'pulse'`: healthy sides emit no DOM; error sides render pulse only.
  - (g) `validationMode: 'circle'` + `validationLoudError: 'none'`: every side renders a circle; loud never fires.
  - (h) State `'warning'` with `validationLoudError = 'pulse'`: loud does NOT fire (strictly error-only).
  - (i) State `'na'` with any combination: no DOM emitted for that side.
  - (j) Per-node `node.data.validationMode = 'corner'` wins over dashboard `'bar'`; same independently for `validationLoudError`.
  - (k) `setValidationMode('corner')` re-renders dashboard-wide.
  - (l) `setValidationLoudError('siren')` re-renders dashboard-wide.
  - (m) `setValidationMode('pulse')` (cross-axis value) → `console.warn` is emitted, settings unchanged.
  - (n) `setValidationLoudError('bar')` (cross-axis value) → `console.warn` is emitted, settings unchanged.
  - (o) `Dashboard.setValidationIndicatorStyle` is undefined (removed).
  - (p) `prefers-reduced-motion: reduce`: `'pulse'` overlay on an error side emits no `<animate>` child (or whatever suppression form `shouldAnimate()` uses).

## 9. Documentation (REQ-2, REQ-3, REQ-5, REQ-7, removed alias)

- [x] 9.1 In `dashboard/documentation/settings.md:301–345, 475–485`: replace the `validationIndicatorMode` entry and the `validationIndicator.style` legacy-alias entry with two new entries — one for `validationMode` (allowed values, per-level precedence, default `'bar'`) and one for `validationLoudError` (same shape, default `'none'`).
- [x] 9.2 In `dashboard/documentation/validation-indicators.md:51–130`: rewrite the modes section to document the two attributes:
  - Allowed value sets (baseline vs. loud).
  - Per-side render rule (the four-step decision from REQ-11).
  - The headline composition recipe: `validationMode: 'circle'` + `validationLoudError: 'pulse'`.
  - That `validationLoudError` is strictly error-only (not warning).
- [x] 9.3 In `dashboard/documentation/validation-indicators.md:160, 252`: update the public-API examples to use `setValidationMode` and `setValidationLoudError`. Remove references to `setValidationIndicatorStyle` and `validationIndicator.style`.
- [x] 9.4 Add a **Migration cookbook** subsection at the bottom of `validation-indicators.md` with a table mapping every #15 value to its #17 split equivalent:

  | Old (#15)                                    | New (#17)                                                                                                                                                         |
  | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `validationIndicatorMode: 'minimal-bar'`     | `validationMode: 'bar'`                                                                                                                                           |
  | `validationIndicatorMode: 'minimal-circle'`  | `validationMode: 'circle'`                                                                                                                                        |
  | `validationIndicatorMode: 'minimal-corner'`  | `validationMode: 'corner'`                                                                                                                                        |
  | `validationIndicatorMode: 'pulse-halo'`      | `validationMode: 'circle'` + `validationLoudError: 'pulse'` (recommended) or `validationMode: 'none'` + `validationLoudError: 'pulse'` (literal pre-#15 behavior) |
  | `validationIndicatorMode: 'rotating-siren'`  | `validationLoudError: 'siren'` (same baseline choice as above)                                                                                                    |
  | `validationIndicatorMode: 'industrial-tape'` | `validationLoudError: 'tape'`                                                                                                                                     |
  | `validationIndicatorMode: 'police-line'`     | `validationLoudError: 'police'`                                                                                                                                   |
  | `validationIndicatorMode: 'none'`            | `validationMode: 'none'` + `validationLoudError: 'none'`                                                                                                          |
  | `setValidationIndicatorMode(mode)`           | `setValidationMode(mode)` or `setValidationLoudError(mode)` per the axis                                                                                          |
  | `setValidationIndicatorStyle(style)`         | `setValidationLoudError(style)` (alias removed entirely)                                                                                                          |
  | `settings.validationIndicator.style = X`     | `settings.validationMode = X` or `settings.validationLoudError = X` (legacy alias removed)                                                                        |

- [x] 9.5 Optional cleanup: in `dashboard/themes/<name>/flowdash.css` (10 files), update comment text mentioning long-form names (e.g. `/* loud-style tokens (pulse-halo / siren / tape / police) */` → `/* loud-style tokens (pulse / siren / tape / police) */`). Not blocking — comment hygiene only.

## 10. Verify

- [x] 10.1 Run `npm test` from repo root. Cross-check failures against the baseline (memory `project_test_baseline.md`: 5 expected + 68 unexpected on dashboard+integration+groups+nodes+edges specs). Any NEW failures are regressions and must be addressed.
- [ ] 10.2 Manually load each migrated demo in a browser and confirm behavior:
  - `/14_status/02_validation-errors/validation-errors.html` — error sides still show animated pulse; healthy sides now show a quiet circle.
  - `/14_status/03_validation-minimal/validation-minimal.html` — `validationLoudError` toggle works; showcase row demonstrates the headline composition.
  - `/14_status/04_validation-grid/validation-grid.html` — grid cells render the expected combinations.
- [x] 10.3 `grep -rn "validationIndicatorMode\|validationIndicator\.style\|setValidationIndicatorMode\|setValidationIndicatorStyle\|minimal-bar\|minimal-circle\|minimal-corner\|pulse-halo\|rotating-siren\|industrial-tape\|police-line"` against the repo (excluding `node_modules`, `openspec/changes/archive`, and the migration cookbook in docs). Zero matches expected outside the cookbook and the archive folder.

## 11. Release

- [ ] 11.1 From `/dashboard/`: `npm version minor` to bump to 1.7.0. (Per `CLAUDE.md`: version bumps are explicit at release time, not during normal development.)
- [ ] 11.2 `npm run build` and confirm the bundle banner picks up the new version.
