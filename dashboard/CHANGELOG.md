# Changelog

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
