# Changelog

## 1.6.0

Validation indicator overhaul ([issue #15](https://github.com/schalkje/flowdash/issues/15)).
**Breaking change**: the binary `preValidationError` / `postValidationError`
(boolean | string) fields are replaced by object-typed `preValidationState` /
`postValidationState` (`{ state, message? }`). The public methods
`setValidationErrorById` and `clearValidationErrorById` are removed and
replaced by `setValidationStateById` and `clearValidationStateById`. No
deprecation shim — stale call sites fail at runtime. See the migration
cookbook in `documentation/validation-indicators.md`.

New 8-state validation vocabulary, independent of `NodeStatus`:
`unknown` · `ready` · `busy` · `error` · `warning` · `disabled` · `ok` · `na`.

Three new minimal indicator modes — `minimal-bar`, `minimal-circle`,
`minimal-corner` — each rendering the full vocabulary at low visual cost.
The four existing **loud** styles, a.k.a. **red nose** styles
(`pulse-halo`, `rotating-siren`, `industrial-tape`, `police-line`), are
unchanged in appearance but now render only when `state === 'error'`.

New `Dashboard` API:

- `setValidationStateById(nodeId, side, { state, message? })`
- `clearValidationStateById(nodeId, side?)`
- `setValidationIndicatorMode(mode)` (canonical; `setValidationIndicatorStyle`
  is preserved as a thin alias)

Themed CSS contract: every theme under `dashboard/themes/<name>/flowdash.css`
declares a `--fd-validation-state-{error,warning,ok,busy,ready,unknown,disabled}`
palette plus the legacy `--fd-validation-red` / `--fd-validation-tape-*`
token set used by the loud styles.

Demos:

- `14_status/02_validation-errors/` — migrated to the new API; renders
  identically to before.
- `14_status/03_validation-minimal/` — new demo exercising the three
  minimal modes across the eight states (interactive row + matrix view).
- `14_status/04_validation-grid/` — new full state × mode grid, every
  cell renders a real `RectangularNode`, with theme switcher, busy-animate
  toggle, and loud-style size selector.

See the proposal at
`openspec/changes/2026-05-23-issue-15-validation-indicator-modes/` for
the full design rationale and the migration cookbook in the docs.

## 1.5.0

Public API hooks for find-and-navigate integrations
([issue #14](https://github.com/schalkje/flowdash/issues/14)). All additions
are purely additive; no existing signature, return type, or default
behavior changes.

New `Dashboard` methods:

- `getNodeBounds(id) → { x, y, width, height } | null`
- `getDatasetNodeIds(datasetId) → string[]`
- `revealNode(id) → Promise<void>`
- `panToBounds(bbox, { animate?, padding? }) → Promise<void>`
- `setNodeClass(id, className, enabled) → void`
- `on('render', handler)` / `once('render', handler)` / `off('render', handler)`
- `afterRender() → Promise<void>`

New DOM contract: every rendered top-level node `<g>` whose node carries a
non-empty `data.datasetId` now exposes `data-dataset-id="<datasetId>"` in
addition to the existing `id="<nodeId>"`.

See `documentation/dashboard.md#public-api-hooks` for the full surface,
the `id` vs `datasetId` distinction, the coordinate-frame contract, the
render-event semantics, and a worked multi-placement example.

### Differences from the original GitHub issue text

Downstream readers who studied issue #14 before this release should note:

- The reporter requested `data-node-id` to escape HTML id-uniqueness
  violations in `querySelectorAll('[id="X"]')`. With `id` treated as
  unique-by-design (matching the runtime contract of `addNode`), that
  motivation disappears. The attribute that solves the actual multi-
  placement problem is **`data-dataset-id`** — that ships; `data-node-id`
  does not.
- The reporter requested a `placementIndex` parameter on `setNodeClass`
  and `getNodeBounds` to disambiguate duplicated dataset placements. The
  library's two existing identifier axes (`id` unique per node,
  `datasetId` shared across N placements) already model this cleanly.
  `placementIndex` is **not** introduced; the multi-placement axis is
  `datasetId` and the new `getDatasetNodeIds(datasetId)` primitive
  exposes it.

See the proposal at `openspec/changes/issue-14-find-and-navigate-api-hooks/`
for the full design rationale.
