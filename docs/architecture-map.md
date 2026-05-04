# Architecture Map

A one-page navigator into the FlowDash codebase. For each subsystem, this page points at the deep-dive document and the primary source files. **Read the linked subsystem doc before changing that subsystem** — many constraints (e.g. pre-render single-use, zone coordinate isolation) are easy to violate without realizing.

## Bird's-eye view

```
                       window.flowDashboard
                              │
                              ▼
              ┌─────────  Dashboard  ─────────┐
              │       (dashboard.js)          │
              │                                │
   ┌──────────┼──────────┬──────────┬─────────┼──────────┐
   ▼          ▼          ▼          ▼         ▼          ▼
ConfigMgr  ZoomMgr  ThemeMgr  StatusMgr  EventMgr  GeometryMgr
                                                       │
                                                       ▼
                                                  LayoutMgr
                                                       │
                                                       ▼
                                                Node tree (BaseNode → …)
                                                       │
                                                       ▼
                                              ZoneManager per node
                                                       │
                                                       ▼
                                          Edges  Simulation  Forces
                                                       │
                                                       ▼
                                                 Minimap  Overlay
```

Every manager is single-responsibility, owned by the `Dashboard` instance, and constructed once at init time.

## Subsystem index

| Subsystem | Source | Deep-dive |
|-----------|--------|-----------|
| **Dashboard controller** | [`/dashboard/js/dashboard.js`](../dashboard/js/dashboard.js) | [`implementation-dashboard.md`](../dashboard/documentation/implementation-dashboard.md), [`dashboard.md`](../dashboard/documentation/dashboard.md) |
| **Settings** | [`/dashboard/js/configManager.js`](../dashboard/js/configManager.js) | [`settings.md`](../dashboard/documentation/settings.md) |
| **Node hierarchy** | [`/dashboard/js/nodeBase.js`](../dashboard/js/nodeBase.js), `nodeBaseContainer.js`, `nodeRect.js`, `nodeCircle.js`, `nodeAdapter.js`, `nodeFoundation.js`, `nodeMart.js`, `nodeLane.js`, `nodeColumns.js`, `nodeGroup.js` | [`implementation-nodes.md`](../dashboard/documentation/implementation-nodes.md), [`/dashboard/documentation/nodes/`](../dashboard/documentation/nodes/) |
| **Node registry / factory** | [`/dashboard/js/nodeRegistry.js`](../dashboard/js/nodeRegistry.js), `node.js` | [`implementation-nodes.md`](../dashboard/documentation/implementation-nodes.md) |
| **Zone system** | [`/dashboard/js/zones/`](../dashboard/js/zones/) | [`zone-system.md`](../dashboard/documentation/zone-system.md) |
| **Edges & path math** | [`/dashboard/js/edge.js`](../dashboard/js/edge.js), `edgeBase.js`, `utilPath.js`, `markers.js` | [`implementation-edges.md`](../dashboard/documentation/implementation-edges.md) |
| **Force simulation** | [`/dashboard/js/simulation.js`](../dashboard/js/simulation.js), `forceBoundary.js`, `forceRectCollide.js` | [`implementation-simulation.md`](../dashboard/documentation/implementation-simulation.md) |
| **Status state machine** | [`/dashboard/js/statusManager.js`](../dashboard/js/statusManager.js), `nodeBase.js` (NodeStatus enum) | [`state.md`](../dashboard/documentation/state.md) |
| **Selection model** | [`/dashboard/js/dashboard.js`](../dashboard/js/dashboard.js) (`selectNode`, `handleNodeDblClick`) | [`auto-zoom-behavior.md`](../dashboard/documentation/auto-zoom-behavior.md) |
| **Zoom** | [`/dashboard/js/zoomManager.js`](../dashboard/js/zoomManager.js), `buttonZoom.js` | [`auto-zoom-behavior.md`](../dashboard/documentation/auto-zoom-behavior.md) |
| **Themes** | [`/dashboard/themes/`](../dashboard/themes/), [`/dashboard/js/themeManager.js`](../dashboard/js/themeManager.js) | [`/dashboard/themes/themes.md`](../dashboard/themes/themes.md) |
| **Minimap** | [`/dashboard/js/minimap.js`](../dashboard/js/minimap.js) | [`minimap.md`](../dashboard/documentation/minimap.md) |
| **Overlays** | [`/dashboard/js/loadingOverlay.js`](../dashboard/js/loadingOverlay.js) | [`overlay.md`](../dashboard/documentation/overlay.md) |
| **Pre-render fast-path** | [`/dashboard/prerender/`](../dashboard/prerender/) | [`pre-render.md`](../dashboard/documentation/pre-render.md), [`PRERENDER_USAGE.md`](../dashboard/documentation/PRERENDER_USAGE.md) |
| **Auto-collapse** | [`/dashboard/js/statusManager.js`](../dashboard/js/statusManager.js), `nodeBaseContainer.js` | [`auto-collapse-specification.md`](../dashboard/documentation/auto-collapse-specification.md) |
| **Layout / geometry** | [`/dashboard/js/layoutManager.js`](../dashboard/js/layoutManager.js), `geometryManager.js`, `utils.js` | [`implementation-utils.md`](../dashboard/documentation/implementation-utils.md) |
| **Events** | [`/dashboard/js/eventManager.js`](../dashboard/js/eventManager.js) | [`/dashboard/documentation/README.md`](../dashboard/documentation/README.md) |
| **Performance instrumentation** | [`/dashboard/js/dashboard.js`](../dashboard/js/dashboard.js) (`performanceMetrics`) | [`/dashboard/tests/PERFORMANCE_INSTRUMENTATION.md`](../dashboard/tests/PERFORMANCE_INSTRUMENTATION.md), [`PERFORMANCE_IMPLEMENTATION_PLAN.md`](../dashboard/documentation/PERFORMANCE_IMPLEMENTATION_PLAN.md), [`DASHBOARD_LOADING_ANALYSIS.md`](../dashboard/documentation/DASHBOARD_LOADING_ANALYSIS.md) |

## Common workflows mapped onto the codebase

### "I want to know how a click becomes a zoom"

1. SVG receives the dblclick → bound in `Dashboard.setupBackgroundDoubleClick()` and `node.onDblClick` handlers (`dashboard.js`).
2. `handleNodeDblClick(node, event)` computes the **Selection Neighborhood** (uses `settings.selector.incomming` / `outgoing`).
3. `ZoomManager` performs the smooth zoom-to-bounds.
4. Read [`auto-zoom-behavior.md`](../dashboard/documentation/auto-zoom-behavior.md) for the contract.

### "I want to add a new visual variant of an existing node"

1. Edit the relevant `node*.js` file (e.g. `nodeAdapter.js` for adapter arrangements).
2. Layout math goes through `geometryManager.js` and `layoutManager.js` — don't reinvent it.
3. Children always live inside the **innerContainer zone**. Don't position them in container-local coords directly; go through `ZoneManager`.
4. Read [`zone-system.md`](../dashboard/documentation/zone-system.md) before touching coordinates.

### "I want to load a 5,000-node dashboard fast"

1. Pre-render the dataset via `/dashboard/prerender/prerender-generator.html`. It produces a `*.prerender.json` with baked positions/sizes/edge paths.
2. The runtime detects the `*.prerender.json`, skips the initial layout pass, and **wipes the pre-render data after the first paint**.
3. All subsequent operations (collapse / expand / relayout) behave identically to a non-prerendered dashboard — there is no "prerendered mode" runtime state to maintain.
4. Read [`pre-render.md`](../dashboard/documentation/pre-render.md) — the single-use constraint is the most important rule.

### "I want to ship a new theme"

1. Copy an existing theme folder under `/dashboard/themes/`.
2. Edit only CSS. Themes are CSS-only; never reach for JS.
3. Update `/dashboard/themes/themes.css` (the aggregator).
4. Document in `/dashboard/themes/themes.md`.

## What's not covered yet

The following subsystems are well-implemented but lack a dedicated user-facing demo. The roadmap is in [`improvement-plan.md`](./improvement-plan.md) Phase 3:

- Selection model (planned `12_selection/`)
- Zoom (planned `13_zoom/`)
- Status system (planned `14_status/`)
- Minimap (planned `15_minimap/`)
- Overlays (planned `16_overlay/`)
- Pre-render comparison (planned `17_prerender/`)

## Where to read next

- New here? Start with [`/docs/project-goals.md`](./project-goals.md), then [`/docs/current-state.md`](./current-state.md).
- About to change something specific? Find the row in the subsystem index above and open the linked deep-dive.
- About to write a test? See [`testing-strategy.md`](./testing-strategy.md).
- About to add a node, demo, or theme? See [`contributing.md`](./contributing.md).
