# find-navigate-api-hooks Specification

## Purpose

TBD - created by archiving change issue-14-find-and-navigate-api-hooks. Update Purpose after archive.

## Requirements

### Requirement: getNodeBounds returns dashboard-coordinate bounds for the node with a given unique id

The `Dashboard` instance SHALL expose `getNodeBounds(id: string) → { x: number, y: number, width: number, height: number } | null`. The returned bounds MUST be expressed in the dashboard's internal coordinate frame — the local frame of `dashboard.main.container`, before the zoom transform is applied. The frame MUST be independent of CSS transforms on the host SVG or any page ancestor, fullscreen state, device pixel ratio, and host-page zoom. The frame MUST be the same one consumed by the existing `getBoundingBoxRelativeToParent(node.element, main.container)` helper and by `zoomToBoundingBox`. The implementation is NOT constrained to a specific mechanism (zone-system read vs. `getBBox`+`getCTM` math): any implementation producing values in that frame within floating-point tolerance is conformant. When `id` matches more than one node (the latent initial-load duplicate-id case), the implementation MUST return the bounds of the first match in tree-walk order (consistent with `getNode(id)`).

#### Scenario: Node fully rendered

- **WHEN** a caller invokes `dashboard.getNodeBounds("nodeA")` on a node currently rendered (no collapsed ancestor)
- **THEN** the call MUST return an object `{ x, y, width, height }` whose values equal what `getBoundingBoxRelativeToParent(node.element, main.container)` returns for the same node, within floating-point tolerance

#### Scenario: Node hidden inside a collapsed ancestor

- **WHEN** a caller invokes `dashboard.getNodeBounds("nodeB")` on a node whose ancestor container is currently collapsed and whose `<g>` is detached from the DOM
- **THEN** the call MUST return `null`

#### Scenario: Bounds are unaffected by CSS transforms on the host

- **WHEN** a caller invokes `dashboard.getNodeBounds("nodeA")` once normally, then applies a `scale(2)` CSS transform to the host SVG and calls it again
- **THEN** both calls MUST return the same bounds within floating-point tolerance

#### Scenario: Unknown node id

- **WHEN** a caller invokes `dashboard.getNodeBounds("doesNotExist")`
- **THEN** the call MUST return `null` and MUST NOT throw

#### Scenario: Removed node id returns null (same as unknown)

- **WHEN** a caller invokes `dashboard.getNodeBounds("removedId")` for an id that was present in the initial data but has since been deleted via `dashboard.removeNode("removedId")`
- **THEN** the call MUST return `null` (the same value as for a never-existed id; the library does not distinguish "was once valid" from "never valid" at the bounds-query level)

#### Scenario: First-match behavior on duplicate-id data

- **WHEN** a caller invokes `dashboard.getNodeBounds("X")` on a dashboard whose initial data contained two nodes with `id: "X"`
- **THEN** the call MUST return the bounds of the first match in tree-walk order, identical to `getNode("X")`'s resolution

### Requirement: panToBounds moves the viewport without changing zoom

The `Dashboard` instance SHALL expose `panToBounds(bbox: { x, y, width, height }, options?: { animate?: boolean, padding?: number }) → Promise<void>`. The implementation MUST pan the viewport so that `bbox` (expanded by `padding` on all four sides) is visible at the current zoom level, MUST NOT change the zoom level, and MUST clamp the resulting pan against the bounding box of the root container so the viewport never reveals whitespace beyond the diagram. `padding` defaults to `0`; `animate` defaults to `true`. When `animate: true`, the pan MUST use the same easing and duration as the pan leg of `zoomToBoundingBox`'s existing transition. When `animate: false`, the transform MUST be applied within a microtask. The returned Promise MUST resolve after the pan completes.

#### Scenario: Pan to bring an off-screen bbox into view

- **WHEN** a caller invokes `dashboard.panToBounds({ x: 1000, y: 200, width: 50, height: 50 })` while the current viewport is centered at the origin and the bbox is off-screen
- **THEN** after the returned Promise resolves the viewport's visible region MUST fully contain the bbox AND the dashboard's zoom level (`main.transform.k`) MUST be unchanged from before the call

#### Scenario: bbox already in view is a no-op (besides Promise resolution)

- **WHEN** a caller invokes `dashboard.panToBounds(bbox)` where `bbox + padding` is already entirely within the current viewport
- **THEN** the call MUST NOT change the transform and MUST still resolve the returned Promise

#### Scenario: Clamp against diagram outer bounds

- **WHEN** a caller invokes `dashboard.panToBounds(bbox)` for a bbox near the diagram's edge such that the unclamped pan would expose whitespace beyond the root container
- **THEN** the resulting viewport MUST be clamped so that no whitespace beyond the root container is visible

#### Scenario: Oversized bbox is centered, zoom unchanged

- **WHEN** a caller invokes `dashboard.panToBounds(bbox)` for a bbox whose `width + 2 * padding` or `height + 2 * padding` exceeds the viewport at the current zoom
- **THEN** the bbox center MUST be aligned with the viewport center AND the dashboard's zoom level MUST be unchanged

#### Scenario: Padding is applied uniformly

- **WHEN** a caller invokes `dashboard.panToBounds(bbox, { padding: 40 })`
- **THEN** the visible region after the pan MUST contain a region equal to `bbox` expanded by 40 dashboard-coordinate units on all four sides (subject to outer-bounds clamping)

#### Scenario: animate:false resolves synchronously

- **WHEN** a caller invokes `dashboard.panToBounds(bbox, { animate: false })`
- **THEN** the resulting Promise MUST resolve within one microtask AND the transform MUST be applied before the next animation frame

### Requirement: revealNode expands the ancestor chain and resolves after re-render

The `Dashboard` instance SHALL expose `revealNode(id: string) → Promise<void>`. The implementation MUST walk from the node up through its ancestor containers and, for every ancestor currently in a collapsed state, invoke the same expand path that user interaction would. Existing settings (`toggleCollapseOnStatusChange`, `cascadeOnStatusChange`) and status-cascade behavior MUST apply unchanged. The library MUST NOT snapshot prior collapsed state and MUST NOT auto-restore on subsequent interaction. The returned Promise MUST resolve after the resulting render flush has completed (implementable by composing the internal render-complete hook).

#### Scenario: Node inside one collapsed ancestor

- **WHEN** a caller invokes `await dashboard.revealNode("nodeC")` on a node whose immediate parent container is collapsed
- **THEN** by the time the Promise resolves the parent container MUST be in the expanded state AND `dashboard.getNodeBounds("nodeC")` MUST return a non-null bounds object

#### Scenario: Node inside multiple nested collapsed ancestors

- **WHEN** a caller invokes `await dashboard.revealNode("nodeD")` on a node whose ancestor chain has two collapsed containers (grandparent and parent)
- **THEN** by the time the Promise resolves both ancestors MUST be in the expanded state

#### Scenario: Node already fully visible is a no-op

- **WHEN** a caller invokes `await dashboard.revealNode("nodeE")` on a node whose ancestors are all already expanded
- **THEN** no collapse-state change MUST occur AND the Promise MUST still resolve after the next render flush (or immediately if no flush is pending)

#### Scenario: Unknown node id rejects

- **WHEN** a caller invokes `dashboard.revealNode("doesNotExist")` for an id that was never present in the data model
- **THEN** the returned Promise MUST reject with an error whose message identifies the unknown id

#### Scenario: Removed node id rejects the same way

- **WHEN** a caller invokes `dashboard.revealNode("removedId")` for an id that was present in the initial data but has since been deleted via `dashboard.removeNode("removedId")`
- **THEN** the returned Promise MUST reject in the same way as for a never-existed id (no separate "was-once-valid" error path)

#### Scenario: No automatic restoration on subsequent user interaction

- **WHEN** a caller invokes `await dashboard.revealNode("nodeF")` and the user subsequently clicks elsewhere on the dashboard
- **THEN** the ancestors expanded by `revealNode` MUST remain expanded (no hidden auto-restore)

### Requirement: Render-complete signal is exposed as both an event and a Promise, with a guaranteed init-end emit

The `Dashboard` instance SHALL expose a render-complete signal through two interchangeable surfaces backed by a single internal hook:

- `dashboard.on(eventName: "render", handler: () => void) → void`
- `dashboard.once(eventName: "render", handler: () => void) → void`
- `dashboard.off(eventName: "render", handler: () => void) → void`
- `dashboard.afterRender() → Promise<void>`

The internal hook MUST fire at every coalesced display-change flush (the rAF tail of `Dashboard.onMainDisplayChange`) and MUST additionally fire **exactly once** at the end of a successful `initialize()` call, immediately after the host element's `data-flowdash-ready="true"` attribute is set. The init-end emit guarantees that `afterRender()` resolves and `on('render')` handlers receive a baseline call regardless of which init path runs (prerender, `zoomToRoot: true`, or default `zoomToRoot: false`). `off(eventName, handler)` MUST remove the listener whose reference is exactly equal to `handler`. Handlers MUST tolerate being invoked more than once per logical "ready" moment (e.g., the prerender path may emit twice: once via `applyDeferredStatusRules` → `onMainDisplayChange`, and once at init end).

#### Scenario: on('render') fires at least once after init (default path, non-prerender, zoomToRoot:false)

- **WHEN** a caller registers `dashboard.on('render', handler)` before `await dashboard.initialize(selector)` resolves, on a dashboard with no prerender data and `settings.zoomToRoot: false`
- **THEN** `handler` MUST be invoked at least once before any user interaction or external state change occurs

#### Scenario: on('render') fires at least once after init (prerender path)

- **WHEN** a caller registers `dashboard.on('render', handler)` before `await dashboard.initialize(selector)` resolves, on a dashboard with valid prerender data and `settings.usePrerender: true`
- **THEN** `handler` MUST be invoked at least once before any user interaction or external state change occurs

#### Scenario: on('render') fires at least once after init (zoomToRoot path)

- **WHEN** a caller registers `dashboard.on('render', handler)` before `await dashboard.initialize(selector)` resolves, on a dashboard with `settings.zoomToRoot: true`
- **THEN** `handler` MUST be invoked at least once before any user interaction or external state change occurs

#### Scenario: afterRender() resolves on a static dashboard after init

- **WHEN** a caller awaits `dashboard.afterRender()` after `dashboard.initialize(selector)` has resolved, with no user interaction or external state change in between
- **THEN** the Promise MUST resolve within one microtask (not hang) AND the resolution MUST NOT cause registered `on('render', h)` handlers to be invoked (no synthetic emit)

#### Scenario: Re-entrant mutation from a render handler triggers a new flush

- **WHEN** a handler registered via `dashboard.on('render', handler)` calls a state-changing API (e.g., `dashboard.revealNode(id)`, `dashboard.addNode(...)`, status mutation) from within its body
- **THEN** the mutation MUST schedule a fresh `requestAnimationFrame` callback for its own flush (not be coalesced into the current rAF that is mid-emit) AND the post-display work (`zoomManager.handleLayoutChange`, minimap update, etc.) MUST run for the new state AND a subsequent `render` emit MUST fire for the new flush

#### Scenario: afterRender() from inside a render handler resolves immediately

- **WHEN** a handler registered via `dashboard.on('render', handler)` calls `await dashboard.afterRender()` from within its body without triggering any state change first
- **THEN** the Promise MUST resolve within one microtask AND MUST NOT invoke other registered `on('render')` handlers

#### Scenario: Handlers survive Dashboard.setData re-init

- **WHEN** a caller registers `dashboard.on('render', handler)`, then later invokes `dashboard.setData(newData)` (a data-driven re-init that does not go through `initialize()`)
- **THEN** `handler` MUST remain registered AND MUST be invoked at least once after the new data renders (via the existing `onMainDisplayChange` call inside `setData`)

#### Scenario: afterRender() chained after setData resolves on the new render

- **WHEN** a caller invokes `await dashboard.setData(newData); await dashboard.afterRender();`
- **THEN** the `afterRender()` Promise MUST resolve after the render emit for the new data, NOT before — even though `setData` itself resolves before the render rAF fires

#### Scenario: A throwing handler does not break the emit loop

- **WHEN** a render emit invokes a sequence of handlers `[h1, h2, h3]` and `h2` throws an `Error`
- **THEN** `h1` and `h3` MUST both be invoked exactly once for this emit AND the thrown error MUST be logged via `console.error` with a `flowdash:` prefix AND the error MUST NOT propagate out of the emit loop AND subsequent emits MUST continue to invoke all three handlers

#### Scenario: Handler set mutation during emit takes effect on the next emit

- **WHEN** during emit, a handler `h1` registers a new handler `h2` via `dashboard.on('render', h2)` or removes a still-pending handler `h3` via `dashboard.off('render', h3)`
- **THEN** for the **current** emit, `h2` MUST NOT be invoked AND (if `h3` was in the snapshot) `h3` MUST still be invoked AND for **subsequent** emits the mutated set MUST be the basis (no `h3`, including `h2`)

#### Scenario: Theme switching does not fire a render emit

- **WHEN** the user switches themes via the existing theme manager (CSS-only swap; no DOM rebuild, no `handleDisplayChange` cascade)
- **THEN** registered `on('render', h)` handlers MUST NOT be invoked for the theme change AND caller-applied classes set via `setNodeClass` MUST remain on their `<g>` elements unchanged

#### Scenario: once('render') fires exactly once

- **WHEN** a caller registers `dashboard.once('render', handler)` and two emits occur after registration
- **THEN** `handler` MUST be invoked exactly once (on the first emit after registration)

#### Scenario: off('render') deregisters by reference

- **WHEN** a caller registers `dashboard.on('render', handler)` then calls `dashboard.off('render', handler)` before any emit
- **THEN** `handler` MUST NOT be invoked on subsequent emits

#### Scenario: afterRender() resolves on next emit when one is pending

- **WHEN** a caller invokes `await dashboard.afterRender()` while a display-change flush is pending
- **THEN** the Promise MUST resolve after that flush's emit completes AND MUST NOT resolve before it

#### Scenario: Per-flush cadence — one emit per coalesced display-change burst

- **WHEN** N node-level `handleDisplayChange` bubbles occur within a single animation frame
- **THEN** registered handlers MUST be invoked exactly once for that frame's emit, not N times (the existing `onMainDisplayChange` rAF coalescing applies)

### Requirement: getDatasetNodeIds returns the ids of every node sharing a datasetId

The `Dashboard` instance SHALL expose `getDatasetNodeIds(datasetId: string) → string[]`. The implementation MUST return the unique `id` of every node whose `data.datasetId === datasetId`, in tree-walk order (the same order as the existing internal `getNodesByDatasetId(datasetId)` produces). Return value MUST be a `string[]` — never `null`, never `undefined`. Empty array when no nodes match. Each returned id MUST be a value that subsequent calls to `getNode(id)`, `getNodeBounds(id)`, `revealNode(id)`, and `setNodeClass(id, ...)` accept.

#### Scenario: Multiple placements

- **WHEN** a caller invokes `dashboard.getDatasetNodeIds("orders_clean")` on a dashboard where three nodes share `data.datasetId === "orders_clean"` (with unique ids `"a"`, `"b"`, `"c"` in tree-walk order)
- **THEN** the call MUST return `["a", "b", "c"]`

#### Scenario: Single placement

- **WHEN** a caller invokes `dashboard.getDatasetNodeIds("rare_dataset")` on a dashboard where exactly one node has `data.datasetId === "rare_dataset"`
- **THEN** the call MUST return an array of length 1 containing that node's id

#### Scenario: Unknown datasetId

- **WHEN** a caller invokes `dashboard.getDatasetNodeIds("doesNotExist")`
- **THEN** the call MUST return `[]` AND MUST NOT throw AND MUST NOT return `null` or `undefined`

#### Scenario: Returned ids are usable as primitives' inputs

- **WHEN** a caller invokes `dashboard.getDatasetNodeIds("orders_clean")` returning `["a", "b", "c"]` and then invokes `dashboard.getNodeBounds(id)` for each
- **THEN** each per-id call MUST return either a bounds object (if rendered) or `null` (if hidden behind a collapsed ancestor) — never throw

### Requirement: Every rendered node group carries a data-dataset-id attribute when its node has a datasetId

For every rendered top-level node whose `data.datasetId` is a non-empty string, the rendered `<g>` element SHALL carry a `data-dataset-id="<datasetId>"` attribute whose value equals `data.datasetId`. The existing `id="<nodeId>"` attribute MUST continue to be set on every rendered node (no breaking change). Nodes without a `data.datasetId` MUST NOT have a `data-dataset-id` attribute. The attribute MUST be updated if a node's `data.datasetId` changes and MUST be removed when the node is removed from the DOM.

#### Scenario: Node with a datasetId carries data-dataset-id

- **WHEN** a dashboard renders a node with `id: "nodeG"` and `data.datasetId: "orders_clean"`
- **THEN** the corresponding `<g>` element MUST have both `id="nodeG"` and `data-dataset-id="orders_clean"`

#### Scenario: All placements of a datasetId carry data-dataset-id

- **WHEN** a dashboard renders three nodes with unique ids `"a"`, `"b"`, `"c"` all sharing `data.datasetId: "orders_clean"`
- **THEN** all three rendered `<g>` elements MUST have `data-dataset-id="orders_clean"` and their respective unique `id` attributes

#### Scenario: Node without datasetId does not carry the attribute

- **WHEN** a dashboard renders a node whose `data.datasetId` is undefined, null, or empty
- **THEN** the rendered `<g>` element MUST have `id` set and MUST NOT have a `data-dataset-id` attribute

#### Scenario: querySelectorAll('[data-dataset-id="X"]') finds all placements

- **WHEN** a caller queries `document.querySelectorAll('[data-dataset-id="orders_clean"]')` on a dashboard with three nodes sharing that datasetId
- **THEN** the NodeList MUST contain exactly three elements in source-data tree-walk order

### Requirement: setNodeClass toggles a CSS class on a rendered node identified by unique id

The `Dashboard` instance SHALL expose `setNodeClass(id: string, className: string, enabled: boolean) → void`. When `enabled` is `true`, the implementation MUST add `className` to the resolved node's top-level `<g>` element; when `enabled` is `false`, it MUST remove `className`. The call MUST be a silent no-op (no throw) for unknown ids and for placements that are not currently rendered (detached from DOM inside a collapsed ancestor). For duplicate-id load data, the implementation MUST target the first match in tree-walk order, consistent with `getNode(id)`.

#### Scenario: Add a class to a rendered node

- **WHEN** a caller invokes `dashboard.setNodeClass("nodeH", "highlighted", true)`
- **THEN** the rendered `<g>` for `"nodeH"` MUST have `"highlighted"` in its class list

#### Scenario: Remove a class previously added

- **WHEN** a caller has called `dashboard.setNodeClass("nodeH", "highlighted", true)` and then calls `dashboard.setNodeClass("nodeH", "highlighted", false)`
- **THEN** the rendered `<g>` for `"nodeH"` MUST NOT have `"highlighted"` in its class list

#### Scenario: Multi-placement fan-out via getDatasetNodeIds

- **WHEN** a caller iterates `dashboard.getDatasetNodeIds("datasetZ")` and invokes `dashboard.setNodeClass(id, "search-active", true)` for each returned id
- **THEN** every rendered `<g>` belonging to a node with `data.datasetId === "datasetZ"` MUST have `"search-active"` in its class list

#### Scenario: Unknown node id is a silent no-op

- **WHEN** a caller invokes `dashboard.setNodeClass("doesNotExist", "highlighted", true)`
- **THEN** the call MUST NOT throw AND no class change MUST occur anywhere in the DOM

#### Scenario: Hidden placement is a silent no-op

- **WHEN** a caller invokes `dashboard.setNodeClass("hiddenId", "highlighted", true)` for a node whose `<g>` is detached from the DOM due to a collapsed ancestor
- **THEN** the call MUST NOT throw AND no DOM mutation MUST occur
