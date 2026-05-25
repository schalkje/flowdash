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

## Indicator modes

The library ships **seven** visual modes plus `'none'`. Three are **minimal**
(lightweight, render every state in a single small element). Four are the
**loud** styles — also known as **red nose** styles, the original
visualisation the operations team named when this surface first shipped.
"Loud" and "red nose" refer to the same four modes (`pulse-halo`,
`rotating-siren`, `industrial-tape`, `police-line`); the doc and source
use both terms interchangeably. They only render when state is `'error'`
and continue to look exactly as they did before issue #15.

The active mode is chosen via `settings.validationIndicatorMode` (dashboard-
wide) or `node.validationIndicatorMode` (per-node override; wins).

### Minimal modes

| Token              | Visual                                                                            | Tone                                              |
| ------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------- |
| `'minimal-bar'`    | 3 px-wide vertical bar, 60% of node-edge height, centered, 1 px inset from edge   | Default — minimal but legible                     |
| `'minimal-circle'` | 4 px-radius filled circle exactly on the inbound (left) / outbound (right) port   | Hugs the connection point — clean per-edge signal |
| `'minimal-corner'` | 6×6 px right-triangle chevron seated on the top corner (left = pre, right = post) | Almost invisible until you notice it              |

All three minimal modes:

- Render the full eight-state vocabulary (`'na'` produces no DOM).
- Read state→color from `var(--fd-validation-state-<state>, <fallback>)`.
- Animate when `state === 'busy'` (a sub-second pulse, ~1.4s loop), gated by
  the existing `shouldAnimate()` helper which honours `prefers-reduced-motion`.
- Are **fixed pixel size** — independent of the `VALIDATION_SIZES` token system
  (which continues to apply only to loud styles).

### Loud styles — a.k.a. "red nose" styles (unchanged, error-only)

These four modes are collectively the **red nose** family: they paint a
dramatic, hard-to-miss overlay on the failing edge, designed for
"this contract is broken — look at me" alerting. The name comes from the
original red disc that anchored every loud treatment in the first
implementation. Use any of the four when you want the error-on-this-edge
signal to dominate the canvas; use a minimal mode when you want a calm,
glance-friendly indicator instead. **Loud** and **red nose** refer to
the same four modes and are used interchangeably throughout the docs
and source.

| Token               | Visual                                                             | Renders when                       |
| ------------------- | ------------------------------------------------------------------ | ---------------------------------- |
| `'pulse-halo'`      | Red disc + expanding radial halo                                   | `state === 'error'` (else nothing) |
| `'rotating-siren'`  | Red disc + two rotating beam cones                                 | `state === 'error'` (else nothing) |
| `'industrial-tape'` | Yellow-on-black diagonal-striped band wrapping the failing edge    | `state === 'error'` (else nothing) |
| `'police-line'`     | Horizontal half-node yellow strap with repeating `PRE/POST FAILED` | `state === 'error'` (else nothing) |

Setting a node to e.g. `{ state: 'busy' }` under a loud mode renders nothing —
the loud styles are deliberately error-only. Use the minimal modes to render
the full vocabulary.

## Settings

```js
{
  // Canonical setting. Default: 'minimal-bar'.
  validationIndicatorMode:
    'minimal-bar' | 'minimal-circle' | 'minimal-corner'
    | 'pulse-halo' | 'rotating-siren' | 'industrial-tape' | 'police-line'
    | 'none',

  // Legacy nested slot — kept for back-compat. `style` aliases
  // `validationIndicatorMode`; `size`/`glyph`/`animate` apply to loud styles
  // only.
  validationIndicator: {
    style: 'minimal-bar',  // alias of validationIndicatorMode
    size:  'normal',       // 'normal' (1×) | 'large' (1.5×) | 'big' (2×) | 'huge' (4×) | 'gigantic' (8×)
    glyph: '!',            // disc glyph for pulse-halo / rotating-siren
    animate: true,         // when false, animations freeze; useful for screenshots & prerender
  },
}
```

A value of `validationIndicatorMode: 'none'` disables rendering entirely without
touching the data. A per-node `node.validationIndicatorMode = 'minimal-corner'`
overrides the dashboard default for that node only.

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
dashboard.setValidationIndicatorMode('minimal-circle'); // dashboard-wide live swap
dashboard.setValidationIndicatorStyle('rotating-siren'); // back-compat alias for the loud styles
dashboard.setValidationIndicatorSize('big'); // loud-styles only
```

`setValidationIndicatorMode` writes both `settings.validationIndicatorMode`
and `settings.validationIndicator.style` (the legacy slot) so any code paths
reading the old slot stay in sync. It re-renders every visible indicator.

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

Mapping mode → tokens:

| Mode              | Tokens used                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimal-bar`     | `--fd-validation-state-<state>` per the active side                                                                                                                   |
| `minimal-circle`  | `--fd-validation-state-<state>` per the active side                                                                                                                   |
| `minimal-corner`  | `--fd-validation-state-<state>` per the active side                                                                                                                   |
| `pulse-halo`      | `--fd-validation-red`, `--fd-validation-red-deep`, `--fd-validation-text-on-red`, `--fd-validation-glow` (legacy loud-style tokens; only used when `state==='error'`) |
| `rotating-siren`  | `--fd-validation-red`, `--fd-validation-red-bright`, `--fd-validation-red-deep`, `--fd-validation-text-on-red`                                                        |
| `industrial-tape` | `--fd-validation-tape-yellow`, `--fd-validation-tape-dark`, `--fd-validation-red`, `--fd-validation-text-on-red`                                                      |
| `police-line`     | `--fd-validation-tape-yellow`, `--fd-validation-tape-dark`, `--fd-validation-red`                                                                                     |

The renderer paints `fill="var(--fd-validation-state-<state>, <fallback>)"` etc.
directly into the SVG; theme switches then propagate without re-rendering nodes.

## DOM contract

Each indicator-bearing node gains a single layer group, inserted last so it
renders on top of the node body and any children:

```html
<g class="node" id="…" status="Ready">
  …
  <g class="validation-indicators" data-mode="minimal-bar" data-style="minimal-bar">
    <g
      class="validation-indicator side-pre"
      data-side="pre"
      data-mode="minimal-bar"
      data-validation-state="busy"
      class="validation-indicator--busy"
      >…</g
    >
    <g
      class="validation-indicator side-post"
      data-side="post"
      data-mode="minimal-bar"
      data-validation-state="error"
    >
      <title>duplicate primary keys</title>
      <rect class="validation-bar" … />
    </g>
  </g>
</g>
```

- The outer `<g class="validation-indicators">` is created/removed lazily.
  When both sides are `'na'` the group is absent entirely.
- `data-mode` reflects the resolved mode at render time (after per-node
  override + dashboard default + back-compat alias chain).
- `data-validation-state` is set on each side group — CSS may target it
  (e.g. `[data-validation-state='busy'] { … }`).
- Side groups with `state ∈ {'error', 'warning'}` and a non-empty `message`
  contain a child `<title>` element (SVG-native hover tooltip).

## Migration from pre-issue-#15 API

The 1.5.x → 1.6.0 transition is a **clean rename, no shim**. Stale call sites
fail at runtime — verify by running your suite.

| Before                                                | After                                                                                  |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `preValidationError: true`                            | `preValidationState: { state: 'error' }`                                               |
| `preValidationError: 'duplicate keys'`                | `preValidationState: { state: 'error', message: 'duplicate keys' }`                    |
| `postValidationError: false`                          | `postValidationState: { state: 'na' }` (or omit — `'na'` is the default)               |
| `node.preValidationError = true`                      | `node.preValidationState = { state: 'error' }`                                         |
| `node.clearValidationErrors()`                        | `node.clearValidationStates()`                                                         |
| `dashboard.setValidationErrorById(id, 'pre', true)`   | `dashboard.setValidationStateById(id, 'pre', { state: 'error' })`                      |
| `dashboard.setValidationErrorById(id, 'post', 'msg')` | `dashboard.setValidationStateById(id, 'post', { state: 'error', message: 'msg' })`     |
| `dashboard.clearValidationErrorById(id)`              | `dashboard.clearValidationStateById(id)`                                               |
| `settings.validationIndicator.style = 'pulse-halo'`   | `settings.validationIndicatorMode = 'pulse-halo'` (legacy `style` slot still honoured) |
| `dashboard.setValidationIndicatorStyle('pulse-halo')` | `dashboard.setValidationIndicatorMode('pulse-halo')` (the `Style` alias still works)   |

The four loud styles render identically to before — the binary "error or
nothing" behavior is preserved by the renderer short-circuiting on
`state !== 'error'`.

## Layout & sizing

Indicators are positioned in node-local coordinates (the same frame the
loud styles used: centered at node origin, `(±w/2, 0)` for left/right anchor
points). The minimal modes use fixed pixel sizes:

- **`minimal-bar`** — 3 px wide × 60% of node-edge height, 1 px inset.
- **`minimal-circle`** — 4 px radius, centered exactly on the connection point.
- **`minimal-corner`** — 6 px right-triangle chevron, hypotenuse along the
  corner; the chevron sits outside the rect.

Loud styles continue to honour `VALIDATION_SIZES` (`normal` → `gigantic`) per
the legacy behavior.

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
- Color is paired with **mode-specific shape** so the indicator survives
  color-blind viewing — e.g. the minimal-corner's chevron is recognisable
  by silhouette even if the per-state color is indistinguishable.

## Files

| Purpose                | Path                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Renderer (all 7 modes) | `dashboard/js/validationIndicators.js`                                                                           |
| Node-side hooks        | `dashboard/js/nodeBase.js` (state field, getters/setters, render-gate helper)                                    |
| Dashboard-level API    | `dashboard/js/dashboard.js` (`setValidationStateById`, `clearValidationStateById`, `setValidationIndicatorMode`) |
| Settings defaults      | `dashboard/js/configManager.js`                                                                                  |
| Theme tokens           | `dashboard/themes/<theme>/flowdash.css` (per-theme `--fd-validation-state-*` palette)                            |
| Loud-styles demo       | `14_status/02_validation-errors/validation-errors.html`                                                          |
| Minimal-modes demo     | `14_status/03_validation-minimal/validation-minimal.html`                                                        |
| Theme-overview entry   | `themes/js/graphData.theme-overview.js`                                                                          |
