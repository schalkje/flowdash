> Source: GitHub Issue [#14](https://github.com/schalkje/flowdash/issues/14) — "API hooks for find-and-navigate integrations"

## Why

Downstream apps building find-and-navigate UX layers on top of FlowDash currently scrape the SVG DOM (`<g id="…">` queries, `getBoundingClientRect` reverse-projection, `MutationObserver` on `#graph`) and work around `zoomToNodeById` always changing the zoom level. The reporter has already shipped a degraded fallback path with one-time warning logs; this change replaces those workarounds with a small, additive, first-class public API surface so integrations are no longer fragile against CSS transforms, fullscreen, or collapsed ancestors.

A late codebase audit during proposal refinement (see Refinement Notes on the source issue) changed the **shape** of the API: the issue framed "duplicated dataset placements" as duplicate-`id`-with-disambiguation-via-`placementIndex`, but the library already distinguishes two identifiers — `id` (unique per node) and `datasetId` (shared across N nodes that represent the same logical dataset). The library also already exposes `getNodesByDatasetId` / `updateDatasetStatus` along the `datasetId` axis. The new API surface mirrors that existing split: single-node operations key off `id`, fan-out operations key off `datasetId`. No `placementIndex` parameter is introduced.

## What Changes

Purely additive surface on the `Dashboard` instance and on rendered node DOM. No existing signature, return type, or default behavior changes — ships as a minor (1.5.x) release.

**Single-node primitives (key off `id`, which is unique by design):**

- **`dashboard.getNodeBounds(id) → { x, y, width, height } | null`** — bounding box of the rendered node in the dashboard's internal coordinate space (the pre-zoom-transform world coordinates that the existing `getBoundingBoxRelativeToParent(node.element, main.container)` helper already produces, the same space `zoomToNodeById` consumes). Returns `null` when the id matches no node, or when the node's `<g>` is not currently rendered (inside a collapsed ancestor and detached from the DOM).
- **`dashboard.revealNode(id) → Promise<void>`** — walks the ancestor chain and expands each collapsed container exactly as if the user had clicked its toggle (status cascades and auto-collapse settings apply unchanged). Permanent expansion, no auto-restore. Resolves after the render flushes; rejects if the id matches no node.
- **`dashboard.setNodeClass(id, className, enabled) → void`** — toggle a CSS class on the rendered node's top-level `<g>` without DOM access. Silent no-op for unknown id or unrendered placement.

**Viewport control (no zoom change):**

- **`dashboard.panToBounds(bbox, { animate? = true, padding? = 0 }) → Promise<void>`** — pan-only, clamped against the diagram's outer bounds. If `bbox + padding` exceeds the viewport at current zoom, centers the bbox and accepts overflow.

**Render-completion observability (event + Promise):**

- **`dashboard.on('render', handler) / once / off`** plus **`dashboard.afterRender() → Promise<void>`** — both wrap the same internal render-flush hook. Fires once per terminal flush, not per D3 simulation tick.

**Dataset-axis primitive (new — enables the multi-placement use case cleanly):**

- **`dashboard.getDatasetNodeIds(datasetId) → string[]`** — returns the unique `id` of every node whose `data.datasetId === datasetId`, in tree-walk order. Empty array when no nodes match. Public thin wrapper over the existing `getNodesByDatasetId` tree walk, exposing only the ids (not internal node objects). Callers compose with `getNodeBounds` / `revealNode` / `setNodeClass` to operate per placement.

**Rendered-DOM contract (optional but lovely):**

- **`data-dataset-id="<datasetId>"`** attribute on every rendered top-level node `<g>` whose node carries a `datasetId`. Coexists with the existing `id="<id>"` (no breaking change). Enables clean `querySelectorAll('[data-dataset-id="X"]')` for callers that prefer DOM-side fan-out over `getDatasetNodeIds` iteration.

What changed from the original issue text and why:

- The reporter requested `dashboard.getNodeBounds(id)` (no disambiguation parameter) and a separate `dashboard.setNodeClass(id, className, enabled, { placementIndex? })`. The codebase audit showed `id` is unique-by-design (only the initial-data-load path tolerates duplicates silently — a latent quirk in `buildNodeMap`, not a contract). So `placementIndex` is removed entirely; the multi-placement axis is `datasetId`, and we expose `getDatasetNodeIds` to make it usable.
- The reporter requested `data-node-id` to escape `querySelectorAll('[id="X"]')[i]` HTML-id-uniqueness violations. With `id` treated as unique, that motivation disappears; `data-dataset-id` is the attribute that solves the _actual_ problem (querying by shared datasetId).

## Capabilities

### New Capabilities

- `find-navigate-api-hooks`: programmatic API surface on the `Dashboard` instance plus DOM contract on rendered nodes, supporting downstream find-and-navigate UX integrations. Covers node introspection (`getNodeBounds`), viewport control without zoom (`panToBounds`), ancestor-chain expansion (`revealNode`), render-completion observability (event + Promise), dataset enumeration (`getDatasetNodeIds`), node DOM identification by dataset (`data-dataset-id`), and class-state mutation (`setNodeClass`).

### Modified Capabilities

None — this is a purely additive change.

## Impact

- **Affected code (`dashboard/js/`)**:
  - `dashboard.js` — new public methods on `Dashboard`, event-emitter wiring, render-complete dispatch.
  - `nodeBase.js` — set `data-dataset-id` attribute on the top-level `<g>` during render when the node has a `data.datasetId`.
  - `zoomManager.js` — extract the existing pan-clamping helper used by `zoomToBoundingBox` into a reusable function, then reuse it for the new pan-only path.
  - Collapse/expand wiring — `revealNode` composes existing per-node expand operations across an ancestor chain; resolves via the new render-complete hook.
- **Public surface**: `dashboard/js/index.js` re-exports remain unchanged; new methods are on the `Dashboard` instance only. No new globals.
- **Tests**: new Playwright specs under `tests/` covering each addition. The `getDatasetNodeIds` spec drives the multi-placement scenarios that `placementIndex` would have covered.
- **Documentation**: `dashboard/documentation/dashboard.md` gains a "Public API hooks" section; documents the `id` vs `datasetId` distinction explicitly (the audit revealed this is under-documented — fixing alongside the new APIs).
- **Versioning**: minor bump (1.5.0). No breaking changes; existing `id` attribute and `zoomToNodeById` behavior preserved.
- **Bundle size**: small additive increase; no new external dependencies.

## Known Latent Issue (Out of Scope)

`Dashboard.buildNodeMap` silently overwrites duplicate ids during initial data load (`map.set` on a duplicate key), while `_assertIdAvailable` correctly throws on `addNode`. This is a latent inconsistency in the library, not introduced by this change. The new APIs treat `id` per its documented intent (unique → single match), so this change is unaffected. A follow-up change to make initial-load id uniqueness strict (matching `addNode`) is recommended but out of scope here.
