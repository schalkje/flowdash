> Source: GitHub Issue [#17](https://github.com/schalkje/flowdash/issues/17) — "Split validationIndicatorMode into validationMode + validationLoudError overlay"

## Why

`#15` shipped a single `validationIndicatorMode` enum that bundles two unrelated concerns — the always-on baseline indicator (minimal styles) and the loud "red nose" overlay reserved for `state === 'error'` (loud styles). The bundling forces a choice: pick a loud value for a node and the baseline is erased on every side that isn't currently in error; pick a minimal value and you lose the dramatic error treatment. The headline operator request from the Data Process Monitor dashboard — "quiet dot on the healthy side, animated pulse on the error side" — has no expressible shape in the current API.

This change splits the single enum into two orthogonal attributes: **`validationMode`** for the always-on baseline and **`validationLoudError`** for the error-only overlay. The two compose per side, so the same node can show a circle on its OK side and a pulse on its error side simultaneously. While renaming, the public value vocabulary also drops the verbose `minimal-` / `-halo` / `rotating-` / `industrial-` / `-line` prefixes that #15 used internally and the pre-#15 `validationIndicator.style` legacy alias gets removed for a clean, single-vocabulary surface.

## What Changes

**`validationMode` — always-on baseline indicator (renamed from `validationIndicatorMode`).** **BREAKING**

- Renames `data.settings.validationIndicatorMode` → `data.settings.validationMode`. Per-node override stays at `node.validationMode` (was `node.validationIndicatorMode`).
- Value vocabulary shortens: `'minimal-bar' → 'bar'`, `'minimal-circle' → 'circle'`, `'minimal-corner' → 'corner'`, `'none'` unchanged.
- Default: `'bar'` (was `'minimal-bar'`).
- Behavior unchanged: the baseline renders for every state ≠ `'na'`; renders nothing for `'na'`.

**`validationLoudError` — new error-only overlay attribute.**

- New `data.settings.validationLoudError` with optional `node.validationLoudError` override.
- Value vocabulary: `'none' | 'pulse' | 'siren' | 'tape' | 'police'`. Mapping from #15's loud names: `'pulse-halo' → 'pulse'`, `'rotating-siren' → 'siren'`, `'industrial-tape' → 'tape'`, `'police-line' → 'police'`.
- Default: `'none'`.
- Render rule (per side): fires only when the side's `state === 'error'` AND `validationLoudError !== 'none'`. Replaces the baseline on the error side for that render; the other side continues to render its baseline.

**Per-side render rule** (applied independently to pre and post):

1. If `state === 'na'` → emit no DOM.
2. Else if `state === 'error'` AND `validationLoudError !== 'none'` → render the loud style.
3. Else if `validationMode !== 'none'` → render the baseline style.
4. Else → emit no DOM.

**Public API.** **BREAKING**

- `Dashboard.setValidationIndicatorMode(mode)` → `Dashboard.setValidationMode(mode)`.
- New `Dashboard.setValidationLoudError(value)` with the same shape.
- Both setters stay dashboard-wide, **1-arg only** — no per-node form; per-node changes go through `node.<attr> = ...` then re-render.
- `Dashboard.setValidationIndicatorStyle(...)` (pre-#15 legacy alias) is **removed**.

**Legacy alias removal.** **BREAKING**

- `data.settings.validationIndicator.style` (pre-#15 alias, seeded in `configManager.js:60`, documented in `settings.md:319,485` and `validation-indicators.md:252`) is removed entirely. No shim.

**Internal `VALIDATION_STYLES` enum rename.** Renames to the short public value names so public API, internal enum, debug logs, and tests share one vocabulary. No translation layer at the boundary.

**Composition matrix.** The two attributes are orthogonal; every combination is meaningful:

| `validationMode` | `validationLoudError` | Effect                                                                          |
| ---------------- | --------------------- | ------------------------------------------------------------------------------- |
| `'bar'`          | `'none'`              | Today's default — always-on minimal bar; no loud overlay.                       |
| `'circle'`       | `'pulse'`             | **Headline use case** — quiet circle on healthy sides, animated pulse on error. |
| `'none'`         | `'pulse'`             | Pre-#15 behavior — nothing on healthy sides, loud pulse on error.               |
| `'circle'`       | `'none'`              | Circles everywhere; loud overlay never fires.                                   |
| `'none'`         | `'none'`              | No indicators rendered at all.                                                  |

**Loud overlay is strictly error-only.** `'warning'`, `'busy'`, and the other non-error states never trigger the loud overlay — they're rendered by the baseline `validationMode` in their state-colored form. A future `validationLoudWarning` could be added if demand appears; out of scope here.

**Accessibility unchanged.** The renamed `'pulse'` (and `'siren'`, if it animates) continues to honor `prefers-reduced-motion` via the existing `shouldAnimate()` helper in `validationIndicators.js:80,89`. No new accessibility plumbing.

**Themes unchanged.** Themes use only `--fd-validation-*` and `--fd-validation-state-*` CSS variables (the style names appear only inside comments). No theme CSS edits required; comment-text updates are optional cleanup.

**Demo migrations.** All four known call sites migrate to the new attributes:

- `14_status/02_validation-errors/js/graphData.js:17` — currently `validationIndicatorMode: 'pulse-halo'`; becomes `validationMode: 'circle'` + `validationLoudError: 'pulse'`.
- `14_status/03_validation-minimal/js/graphData.js:43,66` — minimal modes migrate to short names; page extended with a `validationLoudError` toggle and a showcase row for the headline use case.
- `14_status/04_validation-grid/validation-grid.html:290` — grid axes updated to exercise the new attribute split.
- `tests/validation-indicator-modes.spec.js` (lines 13, 155, 160 and throughout) — renamed to `tests/validation-modes.spec.js`; assertions updated to new attribute and value names.

**Documentation.**

- `dashboard/documentation/settings.md:301–345, 475–485` — replaces the `validationIndicatorMode` and legacy `validationIndicator.style` entries with `validationMode` + `validationLoudError`.
- `dashboard/documentation/validation-indicators.md:51–130, 160, 252` — updates the modes table to the two new attributes, the per-side render rule, the headline recipe, and a migration cookbook (old long value → new short value, `validationIndicatorMode` → `validationMode`, `setValidationIndicatorMode` → `setValidationMode`, legacy `style` alias → removed).

## Capabilities

### New Capabilities

None — this change refines the existing capability introduced in #15.

### Modified Capabilities

- `validation-indicator-modes`: split the single `validationIndicatorMode` attribute into orthogonal `validationMode` (baseline) and `validationLoudError` (error-only overlay), shorten the value vocabulary, remove the pre-#15 `validationIndicator.style` legacy alias, and replace the public-API setters accordingly. The capability's state vocabulary, themeable color palette, `<title>` message surfacing, and `prefers-reduced-motion` behavior are unchanged.

## Impact

- **Affected code (`dashboard/js/`)**:
  - `configManager.js:54–60` — rename `validationIndicatorMode: 'minimal-bar'` → `validationMode: 'bar'`; add `validationLoudError: 'none'`; remove the `validationIndicator.style` legacy seed.
  - `nodeBase.js:283–305` — replace the single-mode resolution with two parallel helpers (`resolveValidationMode()` + `resolveValidationLoudError()`); pass both into the renderer.
  - `validationIndicators.js:24–33, 145–183` — rename `VALIDATION_STYLES` enum values to short names; change `renderValidationIndicators(nodeG, opts)` signature to accept both attributes; add `resolveEffectiveStyleForSide(validationMode, validationLoudError, state)` helper; apply once per side before invoking `drawSide()`.
  - `dashboard.js:2517–2537` — rename `setValidationIndicatorMode` → `setValidationMode`; add `setValidationLoudError`; remove `setValidationIndicatorStyle`. Both new setters write to `settings.<name>` and trigger re-render.
- **Themes (`dashboard/themes/<name>/flowdash.css`, 10 files)** — no CSS changes required (style names appear only in comments). Comment-text updates optional.
- **Demos**:
  - `14_status/02_validation-errors/` — migrated; renders identically (loud-on-error, now expressed compositionally).
  - `14_status/03_validation-minimal/` — extended with `validationLoudError` toggle and showcase row.
  - `14_status/04_validation-grid/` — grid axes updated for the new attribute split.
- **Documentation** — `dashboard/documentation/settings.md` and `dashboard/documentation/validation-indicators.md` updated per the in-scope list, including a migration cookbook mapping every old `validationIndicatorMode` value to its new `(validationMode, validationLoudError)` pair.
- **Tests** — `tests/validation-indicator-modes.spec.js` renamed to `tests/validation-modes.spec.js`; assertions migrated; new specs cover: defaults produce baseline-only behavior; loud overlay fires only on `error`; per-node override wins over dashboard-wide for both attributes independently; `'na'` suppresses rendering regardless of either attribute; API renames exist and re-render; legacy `setValidationIndicatorStyle` / `validationIndicator.style` paths no longer exist; `prefers-reduced-motion` suppresses the loud animation.
- **Versioning** — minor bump (recommend 1.7.0). This is a breaking change for any consumer that ships code referencing `validationIndicatorMode`, the long-form style values, `setValidationIndicatorMode`, or the legacy `validationIndicator.style` alias. #15 just shipped, so the consumer surface is small and a migration cookbook in docs suffices.
- **Bundle size** — neutral or marginally smaller (legacy alias removed; render helper is a few lines).
- **Migration cookbook** (referenced from docs):

  | Old (#15)                                             | New (#17)                                                                                                                                                                                                 |
  | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `settings.validationIndicatorMode = 'minimal-bar'`    | `settings.validationMode = 'bar'`                                                                                                                                                                         |
  | `settings.validationIndicatorMode = 'pulse-halo'`     | `settings.validationMode = 'circle'` + `settings.validationLoudError = 'pulse'` (recommended) or `settings.validationMode = 'none'` + `settings.validationLoudError = 'pulse'` (literal pre-#15 behavior) |
  | `node.validationIndicatorMode = 'minimal-corner'`     | `node.validationMode = 'corner'`                                                                                                                                                                          |
  | `Dashboard.setValidationIndicatorMode('police-line')` | `Dashboard.setValidationMode('circle')` + `Dashboard.setValidationLoudError('police')`                                                                                                                    |
  | `Dashboard.setValidationIndicatorStyle('pulse-halo')` | `Dashboard.setValidationLoudError('pulse')` (alias removed entirely)                                                                                                                                      |
  | `settings.validationIndicator.style = 'minimal-bar'`  | `settings.validationMode = 'bar'` (legacy alias removed)                                                                                                                                                  |
