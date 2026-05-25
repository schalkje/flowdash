# Validation Indicators

Status flags **what a node is currently doing** (Ready, Updating, Error, …).
Validation indicators flag **what is happening on the input or output contract**
of the node, in a vocabulary that is independent of status. They hang on the
left edge (pre-validation, input side) or the right edge (post-validation,
output side).

They are **orthogonal to status**. A node can be `Ready` and still carry a
post-validation `'busy'` while an out-of-band validator runs, or a
post-validation `'error'` after the run completed but produced wrong data.
Combining the two axes is the whole point: status tells you where the work
is, the validation indicator tells you whether the work is trustworthy.

## Data shape

Two per-node fields, default `{ state: 'na' }`:

```js
{
  id: 'load-customer-data',
  label: 'Load Customer Data',
  type: 'node',
  state: 'Ready',
  preValidationState: { state: 'na' },
  postValidationState: { state: 'error', message: 'duplicate primary keys' },
}
```

Each side is `{ state, message? }` where `state` is one of the eight enum
values below. `message` is optional and surfaces as an SVG `<title>` tooltip
when `state` is `'error'` or `'warning'`. For all other states `message` is
ignored.

### State vocabulary

| Value        | Meaning                                                                 | Renders                           |
| ------------ | ----------------------------------------------------------------------- | --------------------------------- |
| `'unknown'`  | The validator has not been run, or its result has not arrived yet       | Neutral indicator                 |
| `'ready'`    | The validator is configured and waiting for its input — not yet running | Light-neutral indicator           |
| `'busy'`     | A validator is currently running on this side                           | Animated indicator (~1.4s loop)   |
| `'error'`    | The validator ran and produced an error                                 | Error-color indicator + tooltip   |
| `'warning'`  | The validator ran and produced a warning (non-blocking)                 | Warning-color indicator + tooltip |
| `'disabled'` | The validator is explicitly turned off for this node                    | Dim indicator                     |
| `'ok'`       | The validator ran and produced a clean pass                             | Green indicator                   |
| `'na'`       | This side carries no validator — the default; no DOM is emitted         | Nothing                           |

The eight values are the entire vocabulary. `setValidationStateById` rejects
anything outside this set with a `console.warn`.

## Indicator styles

The library exposes **two orthogonal axes**, composed per side by the
renderer:

- **`validationMode`** — always-on baseline indicator. Renders for every
  state ≠ `'na'`. Three small lightweight styles: `'bar'`, `'circle'`,
  `'corner'`, plus `'none'`.
- **`validationLoudError`** — error-only loud overlay (a.k.a. **red nose**).
  Replaces the baseline on whichever side is in `state === 'error'`. Four
  dramatic styles: `'pulse'`, `'siren'`, `'tape'`, `'police'`, plus `'none'`.
  **Strictly tied to `'error'`** — `'warning'` and other states are rendered
  by the baseline.

Each axis is configurable at two levels:

- Dashboard-wide: `settings.validationMode` / `settings.validationLoudError`
- Per-node: `node.validationMode` / `node.validationLoudError` (wins over
  the dashboard default; the two axes resolve independently)

### Per-side render rule

For each side (`pre` and `post`), given the resolved `validationMode`,
the resolved `validationLoudError`, and the side's `state`:

1. If `state === 'na'` → emit no DOM for this side.
2. Else if `state === 'error'` AND `validationLoudError !== 'none'` →
   render the loud overlay style for this side.
3. Else if `validationMode !== 'none'` → render the baseline style for this
   side, colored per the state palette.
4. Else → emit no DOM for this side.

The two sides render fully independently — a node with `preState = { state: 'ok' }`
and `postState = { state: 'error' }` under `validationMode: 'circle'` +
`validationLoudError: 'pulse'` renders a quiet circle on the left and an
animated pulse on the right.

### Baseline modes (`validationMode`)

| Token      | Visual                                                                            | Tone                                              |
| ---------- | --------------------------------------------------------------------------------- | ------------------------------------------------- |
| `'bar'`    | 3 px-wide vertical bar, 60% of node-edge height, centered, 1 px inset from edge   | Default — minimal but legible                     |
| `'circle'` | 4 px-radius filled circle exactly on the inbound (left) / outbound (right) port   | Hugs the connection point — clean per-edge signal |
| `'corner'` | 6×6 px right-triangle chevron seated on the top corner (left = pre, right = post) | Almost invisible until you notice it              |
| `'none'`   | Disables the baseline                                                             | Useful with a loud overlay for pre-#15 behavior   |

All three baseline modes:

- Render the full eight-state vocabulary (`'na'` produces no DOM).
- Read state→color from `var(--fd-validation-state-<state>, <fallback>)`.
- Animate when `state === 'busy'` (a sub-second pulse, ~1.4s loop), gated by
  the existing `shouldAnimate()` helper which honours `prefers-reduced-motion`.
- Are **fixed pixel size** — independent of the `VALIDATION_SIZES` token system
  (which continues to apply only to the loud overlay styles).

### Loud overlay (`validationLoudError`) — a.k.a. "red nose" styles

These four overlay styles are collectively the **red nose** family: they
paint a dramatic, hard-to-miss treatment on the failing edge, designed for
"this contract is broken — look at me" alerting. The name comes from the
original red disc that anchored every loud treatment in the first
implementation. Pick one when you want the error-on-this-edge signal to
dominate the canvas; leave `validationLoudError: 'none'` (the default) when
the baseline's themed error color is enough. **Loud** and **red nose** are
used interchangeably throughout the docs and source.

| Token      | Visual                                                             | Renders when                       |
| ---------- | ------------------------------------------------------------------ | ---------------------------------- |
| `'pulse'`  | Red disc + expanding radial halo                                   | `state === 'error'` (else nothing) |
| `'siren'`  | Red disc + two rotating beam cones                                 | `state === 'error'` (else nothing) |
| `'tape'`   | Yellow-on-black diagonal-striped band wrapping the failing edge    | `state === 'error'` (else nothing) |
| `'police'` | Horizontal half-node yellow strap with repeating `PRE/POST FAILED` | `state === 'error'` (else nothing) |
| `'none'`   | Disables the overlay; baseline drives error sides too              | Default                            |

When a side is in `state === 'error'` AND `validationLoudError !== 'none'`,
the loud overlay **replaces** the baseline on that side. The other side
continues to render its baseline. The loud overlay never fires on
`'warning'`, `'busy'`, or any state other than `'error'`.

## Settings

```js
{
  // Always-on baseline. Default: 'bar'.
  validationMode: 'bar' | 'circle' | 'corner' | 'none',

  // Error-only loud overlay. Default: 'none'.
  validationLoudError: 'pulse' | 'siren' | 'tape' | 'police' | 'none',

  // Size + glyph + animate apply to the loud overlay only.
  validationIndicator: {
    size:  'normal',       // 'normal' (1×) | 'large' (1.5×) | 'big' (2×) | 'huge' (4×) | 'gigantic' (8×)
    glyph: '!',            // disc glyph for pulse / siren
    animate: true,         // when false, animations freeze; useful for screenshots & prerender
  },
}
```

Setting `validationMode: 'none'` disables the baseline; setting
`validationLoudError: 'none'` (the default) disables the overlay. With both
`'none'`, no validation indicators render at all. Per-node overrides via
`node.validationMode` and `node.validationLoudError` resolve independently.

### Headline composition

The "operator-friendly" composition that motivated this surface:

```js
settings.validationMode = 'circle';
settings.validationLoudError = 'pulse';
```

Sides not in error render a quiet themed circle. Sides in error render an
animated pulse halo. Both sides communicate their state at all times.

## API

### On a node

```js
node.preValidationState; // getter — returns { state, message? }
node.preValidationState = { state: 'busy' }; // setter — re-renders if changed
node.postValidationState = { state: 'error', message: 'duplicate keys' };
node.clearValidationStates(); // sets both sides to { state: 'na' }
node.hasActiveValidationState(); // true iff either side is not 'na'
```

The setter normalizes its argument: passing a bad object (`null`, missing
`state`, unknown `state` value) silently produces `{ state: 'na' }`. Use
`Dashboard.setValidationStateById` for the validated path with `console.warn`
diagnostics.

### On the dashboard

```js
dashboard.setValidationStateById(nodeId, 'pre', { state: 'busy' });
dashboard.setValidationStateById(nodeId, 'post', { state: 'error', message: 'duplicate keys' });
dashboard.clearValidationStateById(nodeId); // both sides
dashboard.clearValidationStateById(nodeId, 'pre'); // one side
dashboard.setValidationMode('circle'); // dashboard-wide baseline live swap
dashboard.setValidationLoudError('pulse'); // dashboard-wide loud overlay live swap
dashboard.setValidationIndicatorSize('big'); // loud overlay only
```

`setValidationMode` and `setValidationLoudError` validate input against their
respective allowed value sets (cross-axis values like
`setValidationMode('pulse')` are rejected with `console.warn`). Both setters
re-render every visible indicator on success.

## Theme integration

Every theme declares the eight-state palette as CSS custom properties (the
`'na'` state has no variable — nothing renders). Themes live at
`dashboard/themes/<name>/flowdash.css`:

```css
:root,
[data-theme='light'] {
  --fd-validation-state-error: #c8181d;
  --fd-validation-state-warning: #f2c70b;
  --fd-validation-state-ok: #1f8a3d;
  --fd-validation-state-busy: #2563eb;
  --fd-validation-state-ready: #cbd5e1;
  --fd-validation-state-unknown: #9ca3af;
  --fd-validation-state-disabled: #4b5563;
}
```

Mapping style → tokens:

| Style    | Tokens used                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bar`    | `--fd-validation-state-<state>` per the active side                                                                                                                |
| `circle` | `--fd-validation-state-<state>` per the active side                                                                                                                |
| `corner` | `--fd-validation-state-<state>` per the active side                                                                                                                |
| `pulse`  | `--fd-validation-red`, `--fd-validation-red-deep`, `--fd-validation-text-on-red`, `--fd-validation-glow` (loud overlay tokens; only used when `state === 'error'`) |
| `siren`  | `--fd-validation-red`, `--fd-validation-red-bright`, `--fd-validation-red-deep`, `--fd-validation-text-on-red`                                                     |
| `tape`   | `--fd-validation-tape-yellow`, `--fd-validation-tape-dark`, `--fd-validation-red`, `--fd-validation-text-on-red`                                                   |
| `police` | `--fd-validation-tape-yellow`, `--fd-validation-tape-dark`, `--fd-validation-red`                                                                                  |

The renderer paints `fill="var(--fd-validation-state-<state>, <fallback>)"` etc.
directly into the SVG; theme switches then propagate without re-rendering nodes.

## DOM contract

Each indicator-bearing node gains a single layer group, inserted last so it
renders on top of the node body and any children:

```html
<g class="node" id="…" status="Ready">
  …
  <g class="validation-indicators" data-validation-mode="circle" data-validation-loud-error="pulse">
    <g
      class="validation-indicator side-pre validation-indicator--busy"
      data-side="pre"
      data-validation-style="circle"
      data-validation-state="busy"
      >…</g
    >
    <g
      class="validation-indicator side-post"
      data-side="post"
      data-validation-style="pulse"
      data-validation-state="error"
    >
      <title>duplicate primary keys</title>
      <circle class="halo" … />
    </g>
  </g>
</g>
```

- The outer `<g class="validation-indicators">` is created/removed lazily.
  When both sides emit no DOM (both `'na'`, or both axes `'none'`) the
  group is absent entirely.
- `data-validation-mode` and `data-validation-loud-error` on the outer
  layer reflect the resolved axis values at render time.
- `data-validation-style` on each side group reflects the per-side
  resolved style — one of `bar` / `circle` / `corner` (baseline) or
  `pulse` / `siren` / `tape` / `police` (loud overlay).
- `data-validation-state` on each side group reflects the side's state.
  CSS may target it (e.g. `[data-validation-state='busy'] { … }`).
- Side groups with `state ∈ {'error', 'warning'}` and a non-empty `message`
  contain a child `<title>` element (SVG-native hover tooltip).

## Migration

Two clean-break renames have shipped on this surface. Both are **clean rename,
no shim** — stale call sites fail at runtime.

### From pre-issue-#15 (boolean/string validation field)

| Before                                                | After                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `preValidationError: true`                            | `preValidationState: { state: 'error' }`                                           |
| `preValidationError: 'duplicate keys'`                | `preValidationState: { state: 'error', message: 'duplicate keys' }`                |
| `postValidationError: false`                          | `postValidationState: { state: 'na' }` (or omit — `'na'` is the default)           |
| `node.preValidationError = true`                      | `node.preValidationState = { state: 'error' }`                                     |
| `node.clearValidationErrors()`                        | `node.clearValidationStates()`                                                     |
| `dashboard.setValidationErrorById(id, 'pre', true)`   | `dashboard.setValidationStateById(id, 'pre', { state: 'error' })`                  |
| `dashboard.setValidationErrorById(id, 'post', 'msg')` | `dashboard.setValidationStateById(id, 'post', { state: 'error', message: 'msg' })` |
| `dashboard.clearValidationErrorById(id)`              | `dashboard.clearValidationStateById(id)`                                           |

### From issue #15 (`validationIndicatorMode` enum) to issue #17 (two-axis split)

| Before (#15)                                             | After (#17)                                                                                                                                                                                                                  |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validationIndicatorMode: 'minimal-bar'`                 | `validationMode: 'bar'`                                                                                                                                                                                                      |
| `validationIndicatorMode: 'minimal-circle'`              | `validationMode: 'circle'`                                                                                                                                                                                                   |
| `validationIndicatorMode: 'minimal-corner'`              | `validationMode: 'corner'`                                                                                                                                                                                                   |
| `validationIndicatorMode: 'pulse-halo'`                  | `validationMode: 'circle'` + `validationLoudError: 'pulse'` (recommended — quiet baseline + loud on error); or `validationMode: 'none'` + `validationLoudError: 'pulse'` (literal pre-#17 behavior — empty on healthy sides) |
| `validationIndicatorMode: 'rotating-siren'`              | same shape; loud value becomes `'siren'`                                                                                                                                                                                     |
| `validationIndicatorMode: 'industrial-tape'`             | same shape; loud value becomes `'tape'`                                                                                                                                                                                      |
| `validationIndicatorMode: 'police-line'`                 | same shape; loud value becomes `'police'`                                                                                                                                                                                    |
| `validationIndicatorMode: 'none'`                        | `validationMode: 'none'` + `validationLoudError: 'none'`                                                                                                                                                                     |
| `node.validationIndicatorMode = X`                       | `node.validationMode = X` (baseline) or `node.validationLoudError = X` (loud)                                                                                                                                                |
| `dashboard.setValidationIndicatorMode('minimal-circle')` | `dashboard.setValidationMode('circle')`                                                                                                                                                                                      |
| `dashboard.setValidationIndicatorMode('pulse-halo')`     | `dashboard.setValidationLoudError('pulse')`                                                                                                                                                                                  |
| `dashboard.setValidationIndicatorStyle(X)`               | `dashboard.setValidationLoudError(X)` (legacy alias removed; loud values only)                                                                                                                                               |
| `settings.validationIndicator.style = X`                 | `settings.validationMode = X` or `settings.validationLoudError = X` (legacy alias removed)                                                                                                                                   |

The four loud overlay styles render identically to before. The default
configuration (`validationMode: 'bar'` + `validationLoudError: 'none'`) is
the natural successor to `validationIndicatorMode: 'minimal-bar'`.

## Layout & sizing

Indicators are positioned in node-local coordinates (the same frame the loud
overlay uses: centered at node origin, `(±w/2, 0)` for left/right anchor
points). The baseline modes use fixed pixel sizes:

- **`bar`** — 3 px wide × 60% of node-edge height, 1 px inset.
- **`circle`** — 4 px radius, centered exactly on the connection point.
- **`corner`** — 6 px right-triangle chevron, hypotenuse along the corner;
  the chevron sits outside the rect.

The loud overlay styles continue to honour `VALIDATION_SIZES` (`normal` →
`gigantic`).

## State machine fit

Validation states do **not** participate in status cascade, auto-collapse,
or `StatusManager` aggregation. They are a purely visual overlay. Reasoning:

- A failed post-validation on a Ready child should not flip the parent to
  Error — that would conflate "the run failed" with "the run completed but
  produced wrong data", which are operationally different events.
- A `'busy'` post-validation is independent of node status. The run may be
  `'Updated'` while a downstream validator is still working.

If you do want a failed-validation to cascade, set `node.status = 'Error'`
explicitly in your data pipeline — the two are independent levers.

## Accessibility

- For `state ∈ {'error', 'warning'}` with a non-empty `message`, the message
  is set as `<title>` on the side group (SVG-native tooltip) and as
  `aria-label` on the outer `<g class="validation-indicators">`.
- `settings.validationIndicator.animate = false` halts animations.
  Independently, the renderer checks `matchMedia('(prefers-reduced-motion:
reduce)')` and suppresses animations for users who opt out at the OS level.
- Color is paired with **style-specific shape** so the indicator survives
  color-blind viewing — e.g. the `corner` chevron is recognisable by
  silhouette even if the per-state color is indistinguishable.

## Files

| Purpose                                      | Path                                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Renderer (all 7 styles + composition helper) | `dashboard/js/validationIndicators.js`                                                                                            |
| Node-side hooks                              | `dashboard/js/nodeBase.js` (state field, getters/setters, two-axis resolution, render-gate helper)                                |
| Dashboard-level API                          | `dashboard/js/dashboard.js` (`setValidationStateById`, `clearValidationStateById`, `setValidationMode`, `setValidationLoudError`) |
| Settings defaults                            | `dashboard/js/configManager.js`                                                                                                   |
| Theme tokens                                 | `dashboard/themes/<theme>/flowdash.css` (per-theme `--fd-validation-state-*` palette)                                             |
| Headline-composition demo                    | `14_status/02_validation-errors/validation-errors.html`                                                                           |
| Baseline-modes demo                          | `14_status/03_validation-minimal/validation-minimal.html`                                                                         |
| Full state × style grid                      | `14_status/04_validation-grid/validation-grid.html`                                                                               |
| Theme-overview entry                         | `themes/js/graphData.theme-overview.js`                                                                                           |
