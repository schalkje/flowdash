# Design

Codifies the design decisions for issue #17. The proposal is the primary spec; this file resolves implementation-shaping decisions and records the rationale behind the design picks that survived the refinement interrogation.

## Context

`#15` shipped a single `validationIndicatorMode` enum that mixes two visual concerns: an always-on baseline indicator (the minimal styles) and an error-only loud overlay (the loud styles). Operators on the Data Process Monitor dashboard need to combine the two — quiet baseline everywhere, animated overlay on the error side — and the bundled enum cannot express that.

During refinement, two implementation directions surfaced:

- **(A) Per-side mode override**: add `preValidationIndicatorMode` / `postValidationIndicatorMode` sibling fields on each node, with a 3-arg setter. Maximum flexibility; significant new surface area.
- **(B) Combined / two-axis attributes**: split the single enum into `validationMode` (baseline) and `validationLoudError` (overlay), with the renderer composing them per side. Smaller surface area; the headline use case falls out naturally.

The user picked (B). The decisions below codify that direction.

## Goals / Non-Goals

**Goals:**

- Operators can express "quiet baseline everywhere, loud red nose on the error side only" with two simple settings.
- The two attributes are orthogonal and independent — each side resolves each attribute independently using the established dashboard-wide + per-node-override pattern.
- The public surface is one vocabulary across API, internal enum, tests, and debug logs (no translation layer).
- The change is a clean break on a freshly shipped capability — no shim, no deprecation period, migration via docs cookbook.

**Non-Goals:**

- Per-side mode override (direction A). Composition of the two new attributes covers the headline case; per-side override can be revisited if a mixed-baseline use case emerges.
- Loud overlay on non-error states (e.g. `warning`). Strictly tied to `'error'` by design.
- Per-node form of the new setters (e.g. `setValidationMode(mode, nodeId)`). Mirrors the existing 1-arg `setValidationIndicatorMode` shape.
- A backward-compat shim for the renamed attribute, renamed setters, removed legacy alias, or the renamed value vocabulary.
- Changing the geometry, color palette, animation timing, or accessibility plumbing of any individual style — those are owned by #15's spec and unchanged here.

## Decisions

### D1. Two orthogonal attributes (direction B), not per-side override (direction A)

**Decision:** Split `validationIndicatorMode` into `validationMode` (always-on baseline) and `validationLoudError` (error-only overlay). Render rule composes both per side.

**Why not (A):** Per-side overrides require sibling fields on every node (`preValidationIndicatorMode` / `postValidationIndicatorMode`), a new 3-arg setter, and a new data-model surface. The headline use case — "quiet circle, loud pulse on error" — is expressible in (B) with a one-line setting. (A) is strictly more general but pays for generality with surface area. If a future use case genuinely needs mixed baselines per side (e.g. `bar` on pre + `circle` on post), (A) can be added on top of (B) without conflict.

### D2. Loud overlay REPLACES baseline on the error side; no layering

**Decision:** When the loud overlay fires (`state === 'error'` AND `validationLoudError !== 'none'`), it is rendered _instead of_ the baseline for that side, not on top of it.

**Why:** Layering both would produce visual noise — a circle inside a pulse-halo doesn't read clearly, and the loud styles are designed to dominate. The headline operator intent is "loud thing on error, quiet thing otherwise," which is replacement semantics, not layering. The other side continues to render its baseline because its state is not `'error'`.

### D3. Loud overlay is strictly tied to `state === 'error'`

**Decision:** `validationLoudError` fires only when the side's state is exactly `'error'`. `'warning'`, `'busy'`, and the other 5 visible states render via the baseline `validationMode` only.

**Why:** The attribute name says so. Warning is rendered by the baseline in its themed warning color (yellow per #15's palette), which is the correct treatment for non-blocking issues. A future `validationLoudWarning` could be added if demand appears, but speculating on it now would muddy the per-side render rule.

### D4. Clean break + short value names + legacy alias removal — one coherent breaking change

**Decision:** Rename `validationIndicatorMode` → `validationMode`, rename `setValidationIndicatorMode` → `setValidationMode`, drop the `minimal-` / `-halo` / `rotating-` / `industrial-` / `-line` prefixes from value names, and remove the pre-#15 `validationIndicator.style` legacy alias (plus its `Dashboard.setValidationIndicatorStyle()` setter). All in one change.

**Why:** #15 only just shipped (closed 2026-05-23, 2 days ago). The consumer surface is tiny, so a clean rename costs less than maintaining a shim. Bundling the legacy `style` alias cleanup into the same breaking change avoids a second migration round later. The migration cookbook in `validation-indicators.md` (added by this change) is the single source of truth for downstream migrators.

### D5. Internal `VALIDATION_STYLES` enum renames to match public API — single vocabulary, no translation layer

**Decision:** Rename the internal `VALIDATION_STYLES` enum values in `validationIndicators.js:24–33` to the short names. The enum, public API, debug logs, tests, and migration cookbook all share one vocabulary.

**Why:** A boundary translation (`'pulse' → 'pulse-halo'` internally) would add a helper and a constant mapping that exist only to hide the rename from internal callers. Renaming end-to-end is the same diff size but produces one mental model. Future contributors don't have to remember two names for the same thing.

### D6. Public setters stay 1-arg, dashboard-wide only

**Decision:** `Dashboard.setValidationMode(mode)` and `Dashboard.setValidationLoudError(value)` accept exactly one argument. No per-node form.

**Why:** Matches the existing 1-arg shape of `setValidationIndicatorMode(mode)`. Per-node changes go through `node.validationMode = ...` / `node.validationLoudError = ...` followed by a manual re-render — the same path #15 documented for per-node mode overrides. A per-node setter could be added in a follow-up if a demo needs it, but no current demo does.

### D7. `validationLoudError` default is `'none'`, not a sensible-loud value

**Decision:** The dashboard-wide default for `validationLoudError` is `'none'`. The baseline (`validationMode = 'bar'`) is the only thing visible out of the box.

**Why:** Two reasons:

1. **Upgrade behavior:** A consumer migrating from #15 who previously set `validationIndicatorMode: 'minimal-bar'` should see _no behavior change_ — that's `validationMode: 'bar'` + `validationLoudError: 'none'`. Defaulting the loud overlay to a real value would silently start rendering pulses on error for every dashboard.
2. **Opt-in to the combined behavior:** Operators who want the headline use case set `validationLoudError = 'pulse'` (one line, dashboard-wide). This is the right shape — combined behavior should be an explicit choice, not a default.

### D8. Resolution chain mirrors `validationMode` (the established convention)

**Decision:** Both attributes resolve via the same three-step chain:

```
node.<attr> ?? settings.<attr> ?? <hardcoded default>
```

…for both `validationMode` and `validationLoudError`. Per-node wins over dashboard-wide; hardcoded default kicks in only when both are unset.

**Why:** Confirmed by the user as the project's convention (see [[project-settings-pattern]]). Following it keeps the resolution helper in `_renderValidationIndicators()` symmetric and lets future contributors add new settings by copying the pattern without rediscovering the convention.

### D9. Themes need NO CSS edits

**Decision:** No CSS class or selector changes in any theme file. Optional cleanup: update comment text in `dashboard/themes/<name>/flowdash.css` to use short names.

**Why:** Grepping confirmed that the long style names (`pulse-halo`, `rotating-siren`, etc.) appear only inside CSS _comments_ in theme files — never as class selectors or variable names. Themes use `--fd-validation-*` and `--fd-validation-state-*` CSS custom properties, which carry no style-name suffix. Updating comment text is documentation hygiene, not a behavior change.

### D10. Migration cookbook in docs is the only migration mechanism

**Decision:** No runtime shim, no codemod script, no `console.warn` on encountering the old attribute names. The migration mechanism is a table in `dashboard/documentation/validation-indicators.md` mapping every old `validationIndicatorMode` value to its new `(validationMode, validationLoudError)` pair (plus the corresponding setter renames and the legacy `style` alias removal).

**Why:** Consistent with the "clean break" intent established for #15 (and re-confirmed for #17). A `console.warn` requires preserving a check on the old field, which dilutes the rename. With the consumer surface still small, a docs cookbook is sufficient — the user owns the project and the only known consumer (the Data Process Monitor dashboard).

### D11. Render-rule helper is one pure function, applied per side

**Decision:** Introduce `resolveEffectiveStyleForSide(validationMode, validationLoudError, state)` in `validationIndicators.js`. Pure, three-arg, returns the style to render (or `null` for "emit nothing"). Called once per side before `drawSide()`.

**Why:** Keeps the per-side rule in one place. Easy to unit-test (one function, four input cases). Removes the temptation to scatter `if (state === 'error' && loud !== 'none')` checks across the render path.

### D12. `validationLoudError` value enum is restricted (not the full `VALIDATION_STYLES` set)

**Decision:** `validationLoudError` accepts only `'none' | 'pulse' | 'siren' | 'tape' | 'police'`. The baseline-style values (`'bar'`, `'circle'`, `'corner'`) are NOT valid here. Similarly, `validationMode` accepts only `'none' | 'bar' | 'circle' | 'corner'` — the loud values are NOT valid as baselines.

**Why:** Enforces the semantic split at the API. A loud style as a baseline would render nothing for non-error sides (because loud styles short-circuit on non-error), producing a confusing "invisible baseline" footgun. A minimal style as a loud overlay is meaningless — minimal styles already render every state, so there's no reason to gate them on error. The setter validates and rejects (with `console.warn`) cross-axis values.

## Risks / Trade-offs

- **[R1] Upgrade silently changes behavior for consumers who set `validationIndicatorMode` to a loud value in #15** → Migration cookbook lists the exact replacement: `validationMode: 'none'` + `validationLoudError: '<mapped>'` for literal pre-#15 behavior, OR `validationMode: 'circle'` + `validationLoudError: '<mapped>'` for the recommended combined behavior. The breaking nature of the rename surfaces the upgrade at build time (references to `validationIndicatorMode` fail to resolve), so silent runtime regressions are not possible.
- **[R2] Renaming `tests/validation-indicator-modes.spec.js` may lose `git log` history in some viewers** → Use `git mv` so git tracks the rename. Most viewers (including GitHub) follow renames; the risk is low and worth taking for naming consistency.
- **[R3] Demo `04_validation-grid` may need axis rethink** → Today it's a mode × state grid. Under the new model the axes could become `(validationMode × validationLoudError)` for a 4×5 grid, or two separate grids (one per attribute). Decision deferred to implementation time once the demo's current shape can be reviewed in code.
- **[R4] Internal enum rename may break ad-hoc consumer code that imports `VALIDATION_STYLES`** → The enum is exported from `validationIndicators.js`. Consumers importing it (none known) will see renamed values. Acceptable under the "clean break" framing; mentioned in the migration cookbook.
- **[R5] `setValidationMode` and `setValidationLoudError` not symmetric with `setValidationStateById` (which is per-node)** → Intentional. State-by-id is a per-node operation by definition (you're setting the state of _that_ node). Mode/loud-error are dashboard-wide configuration. The asymmetry reflects different responsibilities, not API drift.

## Migration Plan

1. **Code rename** in dependency order: `configManager.js` (settings + default) → `nodeBase.js` (resolution helpers) → `validationIndicators.js` (enum + renderer + helper) → `dashboard.js` (public setters).
2. **Test migration**: `git mv tests/validation-indicator-modes.spec.js tests/validation-modes.spec.js`; update assertions; add new specs per the acceptance criteria.
3. **Demo migrations** in any order (they're independent): `02_validation-errors`, `03_validation-minimal`, `04_validation-grid`.
4. **Docs migration**: `settings.md` and `validation-indicators.md`, including the migration cookbook table.
5. **Local verification**: `npm test` (Playwright) passes — both renamed specs and new specs land green; the three migrated demos render correctly in a browser.
6. **Version bump**: `cd dashboard && npm version minor` (1.6.x → 1.7.0) before the release build, per `CLAUDE.md`'s explicit-version-bump policy. No bump during normal development; only at release.
7. **Rollback**: revert the merge commit if downstream consumers report issues. Because there's no schema migration and no persistent state, rollback is purely a code revert.

## Open Questions

None — the three blocking design questions (legacy alias removal, internal enum rename scope, setter shape) were resolved during the refinement interrogation. Two implementation-time clarifications remain (R3 grid axis, R4 enum import) but those are implementation choices, not design questions.
