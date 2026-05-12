# Validation Indicators ("Red Noses")

Status flags **what a node is currently doing** (Ready, Updating, Error, …).
Validation indicators flag **what was wrong with the data coming in or going out**:
they hang on the left edge of a node (pre-validation failure on the input side) or
the right edge (post-validation failure on the output side). The operations team
calls them _red noses_.

They are **orthogonal to status**. A node can be `Ready` and still carry a
post-validation error — the run technically completed but its output is
contractually wrong. Combining the two is the whole point: status tells you
where the work is, the nose tells you whether the work is trustworthy.

## Data shape

Two optional flags per node, defaulting to `false`:

```js
{
  id: 'load-customer-data',
  label: 'Load Customer Data',
  type: 'node',
  state: 'Ready',
  preValidationError: false,     // optional · boolean | string
  postValidationError: 'duplicate primary keys',   // optional · truthy = error, string = message
}
```

Either flag may be a boolean (`true`/`false`) or a string. When it is a string the
value is exposed via the `aria-label`/`<title>` on the indicator so hover/screen
readers reveal the message, but it is otherwise ignored by the renderer.

The render is identical regardless of the message — the four styles only carry
**which side failed**, not the message text.

## Indicator styles

The library ships four styles. The active style is chosen via
`settings.validationIndicator.style` and applies to the whole dashboard.

| Token               | Visual                                                             | Tone                                               |
| ------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| `'pulse-halo'`      | Red disc + expanding radial halo                                   | Default — calm, familiar, glance-friendly          |
| `'rotating-siren'`  | Red disc + two rotating beam cones                                 | Emergency-vehicle loudness; coexists on busy walls |
| `'industrial-tape'` | Yellow-on-black diagonal-striped band wrapping the failing edge    | Lockout / "do not operate"; works on dark themes   |
| `'police-line'`     | Horizontal half-node yellow strap with repeating `PRE/POST FAILED` | Literal text label; readable across the room       |

The accompanying spike at `experiments/red-noses-spike/` documents the design
exploration. Anything outside the four tokens above is ignored and the renderer
falls back to `'pulse-halo'`.

## Settings

```js
{
  validationIndicator: {
    style: 'pulse-halo',  // 'pulse-halo' | 'rotating-siren' | 'industrial-tape' | 'police-line' | 'none'
    glyph: '!',           // single character drawn inside the pulse-halo / siren disc
    animate: true,        // when false, halos/siren freeze (useful for screenshots & prerender)
  },
}
```

A value of `'none'` disables rendering entirely without touching the data.

## API

### On a node

```js
node.preValidationError; // getter
node.preValidationError = true; // setter — re-renders the indicator
node.postValidationError = 'msg here'; // truthy string is fine
node.clearValidationErrors(); // helper · clears both
```

### On the dashboard

```js
dashboard.setValidationErrorById(nodeId, 'pre', true);
dashboard.setValidationErrorById(nodeId, 'post', 'duplicate keys');
dashboard.clearValidationErrorById(nodeId); // both sides
dashboard.clearValidationErrorById(nodeId, 'pre'); // one side
dashboard.setValidationIndicatorStyle('rotating-siren'); // switch style live
```

`setValidationIndicatorStyle` mutates `settings.validationIndicator.style` and
re-renders every visible indicator. It is the hook the validation-errors demo
uses for its style picker, and the hook the theme overview uses to flip styles
for visual QA under every theme.

## Theme integration

The indicators consume a small set of CSS custom properties so each theme can
re-skin them without touching JS. They are declared in
`dashboard/flowdash.css` (defaults) and overridden in each theme's
`flowdash.css`:

```css
:root,
[data-theme='light'] {
  --fd-validation-red: #c8181d;
  --fd-validation-red-bright: #e63a3a;
  --fd-validation-red-deep: #4a0606;
  --fd-validation-glow: rgba(220, 30, 30, 0.45);
  --fd-validation-tape-yellow: #f2c70b;
  --fd-validation-tape-dark: #181311;
  --fd-validation-text-on-red: #ffffff;
}
```

Mapping of style → tokens:

| Style             | Tokens used                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `pulse-halo`      | `--fd-validation-red`, `--fd-validation-red-deep`, `--fd-validation-text-on-red`, `--fd-validation-glow`         |
| `rotating-siren`  | `--fd-validation-red`, `--fd-validation-red-bright`, `--fd-validation-red-deep`, `--fd-validation-text-on-red`   |
| `industrial-tape` | `--fd-validation-tape-yellow`, `--fd-validation-tape-dark`, `--fd-validation-red`, `--fd-validation-text-on-red` |
| `police-line`     | `--fd-validation-tape-yellow`, `--fd-validation-tape-dark`, `--fd-validation-red`                                |

The renderer paints `fill="var(--fd-validation-red)"` etc. directly into the
SVG; the theme switch then propagates without re-rendering nodes.

## DOM contract

Each indicator-bearing node gains a single layer group, inserted last so it
renders on top of the node body and any children:

```html
<g class="node" id="…" status="Ready">
  …
  <g class="validation-indicators" data-style="pulse-halo">
    <g class="validation-indicator side-pre" data-side="pre" data-style="pulse-halo">…</g>
    <g class="validation-indicator side-post" data-side="post" data-style="pulse-halo">…</g>
  </g>
</g>
```

- The outer `<g class="validation-indicators">` is created/removed lazily; if a
  node carries no errors it is not present.
- `data-style` reflects the active style at render time. CSS may target it (e.g.
  `.validation-indicator[data-style='industrial-tape'] .barricade { stroke-dasharray: … }`).
- Each side group also gets a `<title>` if the error value was a string, so
  hover reveals the message.

## Layout & sizing

Indicators are positioned in node-local coordinates and read the node's
**effective** width/height (post-resize, post-collapse). For:

- `RectangularNode` / `CircleNode`: anchor at `(±width/2, 0)`.
- Container nodes (Lane, Columns, Adapter, Foundation, Mart, Group): anchor on
  the container's outer rect, vertically centred. The indicators sit **on top
  of** the container border, partially overlapping the header zone.

The pulse-halo and rotating-siren render a small disc (`r=12`) at the anchor
point. The industrial-tape and police-line render a band that sits flush to the
failing edge (vertical strip for industrial-tape, horizontal half-strap for
police-line). The renderer's `bounds` helper computes both inset and overlap
so the band aligns with the rounded corners of the rect node.

## State machine fit

Validation indicators do **not** participate in status cascade, auto-collapse,
or `StatusManager` aggregation. They are a purely visual overlay. Reasoning:

- A failed post-validation on a Ready child should not flip the parent to
  Error — that would conflate "the run failed" with "the run completed but
  produced wrong data", which are operationally different events.
- The team already raises an `Error` status for genuine failures; the nose is
  the second axis.

If you do want a failed-validation to cascade, set `node.status = 'Error'`
explicitly in your data pipeline — the two are independent levers.

## Accessibility

- When the error value is a string, it is set as `<title>` on the side group
  (SVG-native tooltip) and as `aria-label` on the outer
  `<g class="validation-indicators">`.
- `settings.validationIndicator.animate = false` halts animations for users
  with `prefers-reduced-motion`. The page-level handler in
  `validationIndicators.js` honours `matchMedia('(prefers-reduced-motion: reduce)')`
  automatically.
- Colour is paired with shape across all four styles (disc, beam, stripes,
  strap) so the indicator survives colour-blind viewing.

## Files

| Purpose                 | Path                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Renderer (the 4 styles) | `dashboard/js/validationIndicators.js`                                                                            |
| Node-side hooks         | `dashboard/js/nodeBase.js` (getters/setters)                                                                      |
| Dashboard-level API     | `dashboard/js/dashboard.js` (`setValidationErrorById`, `clearValidationErrorById`, `setValidationIndicatorStyle`) |
| Settings defaults       | `dashboard/js/configManager.js`                                                                                   |
| Theme tokens (default)  | `dashboard/flowdash.css`                                                                                          |
| Theme overrides         | `dashboard/themes/<theme>/flowdash.css`                                                                           |
| Demo page               | `14_status/02_validation-errors/validation-errors.html`                                                           |
| Theme-overview entry    | `themes/js/graphData.theme-overview.js` (rect Ready node carries flags)                                           |
