# Dashboard Overview and Features

## Overview

The Dashboard is the top‑level UI component that orchestrates rendering, layout, zoom/pan, selection, status updates, and (optionally) the minimap. It wraps the node/edge system and presents a cohesive, interactive visualization.

See also: [Minimap](minimap.md)

## Getting Started

1. Add container to your page:

```html
<div id="graph"></div>
```

2. Initialize the dashboard:

```javascript
import { createAndInitDashboard } from '../js/dashboard.js';

// Simple initialization with just the main graph container
const dashboard = createAndInitDashboard(data, '#graph');
```

If you are using the bundled build, initialize according to your bundling setup (examples in `flowdash-bundle.html`).

## Anatomy

- **Main View**: Primary SVG canvas for nodes and edges; supports zoom/pan and interactions.
- **Minimap (optional)**: Scaled overview synchronized with the main view. See [Minimap](minimap.md).
- **Selection**: Tracks selected nodes/edges and optional selection bounding box.

## Key Features

- **Zoom/Pan**: Smooth zoom via wheel/controls and panning; auto-fit helpers.
- **Zoom Helpers**:
  - `zoomToRoot()` fits the entire diagram
  - `zoomToNode(node)` fits a specific node
  - `zoomToBoundingBox(bbox)` fits an arbitrary region
- **Selection**: Click to select; configurable neighbor selection; optional selection bounding box display.
- **Custom Click Handlers**: Register additional click callbacks that are called after normal selection.
- **Status Management**: Update status on a node or by dataset id for batch updates.
- **Theme Support**: Works with all themes under `dashboard/themes/*`.
- **Performance**: Minimap updates and heavy operations use `requestAnimationFrame` to stay responsive.

## Interactions: selection and double‑click zoom

### Interactions: selection and double‑click zoom

Default interaction model:

- Single click: exclusive selection of exactly one item (either a base node or a container). Clicking another item clears the previous selection.
- Double‑click on a node (no active neighborhood): computes the node’s neighborhood (using `settings.selector`), selects it, stores it as the active Selection Neighborhood, and zooms to its bounding box.
- Double‑click within an active neighborhood’s bounding box: zooms to the neighborhood’s bounding box again (without recomputing). Double‑clicking outside the active bounding box on any node creates a new neighborhood for that node and zooms to it.
- Zoom to root: if `settings.zoomToRoot` is true, the dashboard initially fits all nodes.
- Customization: you can override handlers after initialization:
  - `dashboard.main.root.onClick = (node) => { ... }` for single‑click selection.
  - `dashboard.main.root.onDblClick = (node, event) => { ... }` for double‑click behavior. The default uses the active neighborhood (if any) and falls back to `zoomToNode(node)`.

Notes and customization:

- Initial fit: enable `settings.zoomToRoot = true` to auto‑fit the full diagram on load.
- Programmatic control: call `dashboard.zoomToNode(node)` yourself to focus a node.
- Override behavior: you can customize double‑click handling by setting `dashboard.main.root.onDblClick = (node) => { /* your logic */ }` after initialization. By default it calls `zoomToNode(node)`; click selection is handled by `onClick`.
- Edges: double‑click on edges has no special default behavior; you may register a handler per edge type if needed.

## Custom Click Handlers

You can register additional click handlers that are called **after** the normal selection behavior:

```javascript
// Register a callback that gets called after normal selection
dashboard.setNodeClickCallback((node) => {
  console.log('Node selected:', {
    id: node.id,
    label: node.label,
    status: node.status,
    position: { x: node.x, y: node.y },
  });

  // Your custom logic here
  if (node.status === 'Error') {
    showErrorDetails(node);
  }
});
```

**Key Features:**

- **Non-intrusive**: Your callback runs after the normal selection, so all default behavior is preserved
- **Node Parameter**: Receives the selected node object with all its properties
- **Easy Registration**: Simple method call to register/unregister handlers
- **Error Handling**: Built-in validation ensures only functions are accepted

**Callback Parameters:**

- `node` - The node object that was clicked and selected

## Zoom and Pan System

The dashboard provides a comprehensive zoom and pan system with consistent behavior across all scenarios.

### Main View Zoom

- **Mouse wheel**: Zoom in/out at cursor position
- **Drag**: Pan the view when not zooming
- **Zoom extent**: Configurable scale limits (default: 0.1x to 40x)
- **Smooth transitions**: All programmatic zoom operations use smooth animations

### Zoom Controls

- `zoomToRoot()` - Fits the entire diagram in view
- `zoomToNode(node)` - Centers and fits a specific node
- `zoomToBoundingBox(bbox)` - Fits an arbitrary rectangular region
- `zoomIn()` / `zoomOut()` - Step zoom at current center
- `zoomReset()` - Returns to default zoom level

### Minimap Integration

The minimap provides synchronized overview and navigation:

- **Real-time sync**: Automatically reflects main view zoom and pan
- **Interactive navigation**: Click or drag in minimap to navigate main view
- **Viewport indicator**: Shows current visible area as overlay rectangle
- **Consistent sizing**: Maintains fixed monitor pixel dimensions regardless of graph size
- **At 100%**: Shows the entire dashboard content, scaled to fit the minimap

## Minimap Sizing System

### Monitor Pixel Consistency

The minimap uses a unified sizing system that ensures consistent visual size across different graphs and browser states:

- **Target sizes**: Small (180px), Medium (240px), Large (400px) width
- **Aspect ratio**: Automatically calculated from main graph proportions
- **Scaling compensation**: Accounts for SVG coordinate space vs monitor pixels
- **Resize stability**: Maintains consistent size during browser resize, fullscreen toggle, and zoom operations

### Size Calculation

```javascript
// Unified sizing method ensures consistency
resizeMinimap() {
  // 1. Get target monitor pixel dimensions
  const targetWidthPx = getMinimapTargetWidth(sizeToken);
  const targetHeightPx = Math.round(targetWidthPx / graphAspectRatio);

  // 2. Calculate SVG scaling factor
  const svgScale = svgRect.width / this.main.width;

  // 3. Convert to SVG coordinate space
  const svgCoordWidth = targetWidthPx / svgScale;
  const svgCoordHeight = targetHeightPx / svgScale;

  // 4. Apply dimensions and update content
  this.minimap.svg.attr('width', svgCoordWidth).attr('height', svgCoordHeight);
}
```

### Size Tokens

- `'s'` or `{width: 180}` → 180px width
- `'m'` or `{width: 240}` → 240px width (default)
- `'l'` or `{width: 400}` → 400px width
- Custom: `{width: 200}` → 200px width

## Maximize/Restore (Floating Button)

- A floating button is always visible (top-right of the window) to toggle the dashboard between normal and maximized states.
- **Maximize**: The main SVG fills the entire viewport and automatically resizes on browser resize.
- **Restore**: Returns to the normal layout inside the page.

### Resize Handling

The system handles all resize scenarios consistently:

1. **Browser window resize**: Preserves zoom level and center point while adapting to new dimensions; the 100% is recomputed with the new size
2. **Fullscreen toggle**: Maintains zoom state while filling/restoring viewport
3. **Minimap resize**: Uses unified sizing method for consistent behavior

How it works:

- A fixed-position button is injected by the Dashboard on initialization.
- Clicking toggles a fullscreen class on the main SVG and updates the internal viewport to match the new size.
- Window `resize` is handled to keep the viewBox and minimap in sync while maximized.
- All resize operations use the unified `resizeMinimap()` method for consistency.

Styling hooks:

- Button element: `.fullscreen-toggle` (fixed at top-right; small, low-opacity icon; on hover it becomes a clear, high-contrast button)
- Fullscreen class: `.flowdash-fullscreen` (applied to the main SVG). If your page uses `#graph`, the legacy `#graph.fullscreen` also applies.

## Basic API (high level)

- `createAndInitDashboard(data, mainDivSelector)` → Dashboard instance
- `dashboard.initialize(mainDivSelector)`
- `dashboard.zoomToRoot()` / `dashboard.zoomToNode(node)` / `dashboard.zoomToBoundingBox(bbox)`
- `dashboard.getSelectedNodes()` / `dashboard.deselectAll()`
- `dashboard.setNodeClickCallback(callback)` - Register additional click handler
- `dashboard.updateNodeStatus(nodeId, status)` / `dashboard.updateDatasetStatus(datasetId, status)`

## Configuration Highlights

Common settings in your data/config influence behavior:

- **`settings.zoomToRoot`**: Auto-fit on load
- **`settings.selector`**: Neighbor/adjacency selection strategy
- **`settings.showBoundingBox`**: Show selection bounds overlay

For complete settings documentation, see [Settings Reference](settings.md)

## Initial Display and Scaling System

### Initial Dashboard Setup

When the dashboard initializes, it establishes a complete coordinate system and scaling relationship:

1. **Container Detection**: Uses `getBoundingClientRect()` to detect the current size of the `#graph` div
2. **SVG Creation**: Creates an SVG element that fills the container completely
3. **Coordinate System**: Sets up a centered coordinate system using `viewBox` with origin at `[-width/2, -height/2, width, height]`
4. **Base Scale**: Establishes the initial scaling relationship where 1 SVG unit = 1 screen pixel (at 100% zoom)

```javascript
// The dashboard automatically detects container size on initialization
const { width, height } = svg.node().getBoundingClientRect();
svg.attr('viewBox', [-width / 2, -height / 2, width, height]);

// Store dimensions for future reference
this.main.width = width;
this.main.height = height;
this.main.aspectRatio = width / height;
```

### Scaling Architecture

The dashboard implements a dual-coordinate scaling system that maintains visual consistency across different container sizes and browser states:

#### Core Scaling Principles

1. **Visual Consistency**: Dashboard content appears identical when resizing - only becoming proportionally larger or smaller
2. **Scale Preservation**: The relationship between SVG coordinate units and screen pixels is maintained during resize operations
3. **View Stability**: The user's current view (zoom level, center point) remains unchanged during resize
4. **Minimap Independence**: The minimap maintains constant screen pixel dimensions regardless of container size changes

#### Initial Scale Computation

```javascript
// 1. Detect container dimensions in screen pixels
const { width, height } = containerDiv.getBoundingClientRect();

// 2. Establish SVG coordinate system (centered origin)
svg.attr('viewBox', [-width / 2, -height / 2, width, height]);

// 3. Base scale: 1 SVG unit = 1 screen pixel (at 100% zoom)
const baseScale = 1.0;
this.main.pixelToSvgRatio = baseScale;
```

### Definition of 100% (Fit-to-Container)

- **Initial view (100%)**: On initialization, the dashboard computes the graph's bounding box and displays it at the maximum size that fits entirely within the container without any cutoff. Depending on aspect ratio, either the left/right edges touch the container sides or the top/bottom edges touch the container bounds.
- **Minimap at 100%**: The minimap renders the entire dashboard scene in one view (scaled overview) and mirrors the main view's center/scale.
- **Post-resize baseline**: When the container size changes, the internal "100%" fit baseline is recomputed for the new dimensions so that returning to 100% fits the entire graph in the resized container precisely.

## Resize Behavior and Scaling

### Normal Mode (Default Layout)

The dashboard handles container resizing while preserving the user's current view:

#### Window Resize Behavior

- **Zoom Preservation**: Maintains current zoom level (k-factor) during resize
- **Center Preservation**: The center point of the user's view stays fixed
- **Content Stability**: The same dashboard area remains visible during pure size changes
- **Smooth Adaptation**: Automatically adjusts to new container dimensions
- **100% Recalculation**: Recomputes the fit-to-container baseline so that returning to 100% (via controls or gestures) fits the entire graph in the resized container

#### Aspect Ratio Changes

When container aspect ratio changes, the system intelligently adapts:

- **Wider Container**: Horizontal view expands, vertical view maintains same visible area
- **Taller Container**: Vertical view expands, horizontal view maintains same visible area
- **Narrower Container**: Horizontal view contracts, vertical view maintains same visible area
- **Shorter Container**: Vertical view contracts, horizontal view maintains same visible area

#### Technical Implementation

```javascript
applyResizePreserveZoom() {
  // 1. Get new container dimensions
  const newRect = this.main.svg.node().getBoundingClientRect();
  const newWidth = newRect.width;
  const newHeight = newRect.height;

  // 2. Calculate scale adjustment factors
  const widthRatio = newWidth / this.main.width;
  const heightRatio = newHeight / this.main.height;

  // 3. Update SVG coordinate system
  this.main.svg.attr('viewBox', [-newWidth/2, -newHeight/2, newWidth, newHeight]);

  // 4. Preserve user's zoom level by adjusting transform
  const newK = this.main.transform.k; // Keep same zoom level
  const newTransform = d3.zoomIdentity
    .translate(this.main.transform.x * widthRatio, this.main.transform.y * heightRatio)
    .scale(newK);

  // 5. Apply the preserved transform
  this.main.svg.call(this.main.zoom.transform, newTransform);

  // 6. Update stored dimensions
  this.main.width = newWidth;
  this.main.height = newHeight;
}
```

### Fullscreen Mode

Fullscreen mode provides an immersive viewing experience with dynamic viewport adaptation:

#### Entering Fullscreen

- **Viewport Expansion**: SVG expands to fill entire browser viewport
- **State Preservation**: Maintains current zoom level and center point
- **Coordinate System**: Automatically recalculates viewBox for new dimensions
- **Minimap Adaptation**: Minimap maintains consistent screen size and position

#### Fullscreen Resize Handling

- **Dynamic Adaptation**: Automatically responds to browser viewport changes
- **Zoom Stability**: Preserves user's zoom and pan state during viewport resize
- **Content Consistency**: Maintains visual relationship between all dashboard elements
- **Smooth Transitions**: All resize operations use optimized algorithms for responsiveness

#### Exiting Fullscreen

- **Layout Restoration**: Returns to normal container layout
- **View Preservation**: Maintains current zoom and pan state
- **Coordinate Recalculation**: Automatically adjusts viewBox for container dimensions
- **Minimap Repositioning**: Restores minimap to normal layout position

### Resize Performance Optimization

The dashboard implements several optimizations to ensure smooth resize operations:

#### RequestAnimationFrame Integration

- **Smooth Updates**: Uses `requestAnimationFrame` for minimap updates during resize
- **Throttled Operations**: Limits resize calculations to prevent performance degradation
- **Batch Updates**: Groups multiple resize-related operations for efficiency

#### Memory Management

- **Efficient Calculations**: Minimizes object creation during resize operations
- **Cached Values**: Stores frequently accessed dimensions and ratios
- **Cleanup**: Properly manages event listeners and temporary objects

## Usage Tips

- **Container Sizing**: Provide stable sizes for the `#graph` container to avoid resize thrash
- **CSS Dimensions**: Set explicit width/height on the `#graph` container via CSS for predictable behavior
- **Responsive Design**: The dashboard adapts to container size changes, making it suitable for responsive layouts
- **Minimap Integration**: The minimap automatically adapts to container size changes and maintains consistent visual size
- **Performance**: Resize operations are optimized to preserve user context and avoid jarring transitions
- **Theme Support**: All styling is handled through the theme system under `dashboard/themes/*`

## Public API hooks

A small, additive surface on the `Dashboard` instance for downstream
find-and-navigate integrations (see GitHub issue #14). Existing behavior
(`zoomToNodeById`, `id` attribute on rendered `<g>`, status cascade,
auto-collapse settings) is unchanged.

### Two identifier axes

The library distinguishes two identifiers and the API splits along that axis:

- **`id`** — globally unique per node. Single-node primitives (`getNodeBounds`,
  `revealNode`, `setNodeClass`) accept only `id`.
- **`datasetId`** — non-unique semantic identifier carried by `data.datasetId`.
  Multiple nodes representing the same logical dataset share one `datasetId`.
  Fan-out is exposed via `getDatasetNodeIds(datasetId)`.

`getNode(id)` and the new single-node primitives return the first match in
tree-walk order — consistent with how the library has always behaved.

### Coordinate-frame contract

`getNodeBounds(id)` and `panToBounds(bbox)` operate in the dashboard's
internal coordinate frame: the local frame of `main.container`, **before**
the zoom transform is applied. This is the same frame the existing helper
`getBoundingBoxRelativeToParent(node.element, main.container)` produces
via `parentCTM.inverse().multiply(elementCTM)` + `getBBox()`. The frame is
independent of CSS transforms on the host SVG or any page ancestor,
fullscreen state, device pixel ratio, and host-page zoom.

Do not mix bounds from `getNodeBounds` with `getBoundingClientRect` math —
they live in different coordinate spaces.

### Methods

- **`getNodeBounds(id) → { x, y, width, height } | null`** — bounding box in
  the dashboard's internal frame. Returns `null` when the id matches no
  node, or when the node's `<g>` is detached (collapsed ancestor).
- **`getDatasetNodeIds(datasetId) → string[]`** — every node id whose
  `data.datasetId === datasetId`, in tree-walk order. Always an array;
  empty (never null) when no nodes match.
- **`revealNode(id) → Promise<void>`** — expands every collapsed ancestor of
  `id` exactly as user clicks on each toggle would. Status cascades and
  auto-collapse settings still apply. Resolves after the resulting render
  flush; rejects with a descriptive error for unknown / removed ids. The
  library does not snapshot prior collapsed state — callers that need
  restoration capture their own snapshot before calling.
- **`panToBounds(bbox, { animate = true, padding = 0 } = {}) → Promise<void>`** —
  pan-only viewport change at the current zoom level, clamped against the
  diagram's outer bounds. Oversized bbox (`bbox + padding` larger than the
  viewport at current zoom) centers the bbox; zoom does not change.
- **`setNodeClass(id, className, enabled) → void`** — toggle a CSS class on
  a node's top-level `<g>` element. Silent no-op for unknown ids and for
  placements detached from the DOM.
- **`on('render', handler) / once / off`** + **`afterRender() → Promise<void>`** —
  notification when the dashboard has finished a layout pass. Fires once
  per coalesced `onMainDisplayChange` flush AND once at the end of
  `initialize()` after the `data-flowdash-ready` attribute is set, so
  `afterRender()` is reliable as a "dashboard is ready" gate.

### Rendered DOM contract

Every rendered top-level node `<g>` whose node carries a non-empty
`data.datasetId` carries `data-dataset-id="<datasetId>"` in addition to the
existing `id="<id>"`. Callers can fan out with
`querySelectorAll('[data-dataset-id="X"]')` without colliding with HTML
id-uniqueness rules.

### Worked example: multi-placement find-and-navigate

```js
const ids = dashboard.getDatasetNodeIds('orders_clean');
for (const id of ids) {
  if (dashboard.getNodeBounds(id) === null) {
    await dashboard.revealNode(id);
  }
  dashboard.setNodeClass(id, 'search-active', true);
}
if (ids.length > 0) {
  await dashboard.panToBounds(dashboard.getNodeBounds(ids[0]), { padding: 40 });
}
```

### Render-event semantics

The `render` event fires:

1. Once at the end of `initialize()` (guaranteed baseline emit).
2. Once per coalesced `onMainDisplayChange` flush thereafter — N node-level
   `handleDisplayChange` bubbles within a single animation frame produce
   exactly one emit.
3. Once after each `setData()` re-init (via the internal
   `onMainDisplayChange` call inside `setData`).

The emit fires **after** the internal post-display work
(`zoomManager.handleLayoutChange`, minimap update, DOM hierarchy
enforcement) has completed for the current state, so handlers reading
bounds via `getNodeBounds` see final positions for this flush.

Handler errors are caught and logged via `console.error` with the
`flowdash:` prefix; one throwing handler does not prevent subsequent
handlers in the same emit from firing.

`afterRender()` returns a microtask-resolved Promise when the dashboard is
idle (no flush pending and at least one prior emit has occurred), and
does **not** cause registered `on('render')` handlers to be invoked — only
the awaiting caller is unblocked.

#### Re-entrancy

A handler that calls a mutating API (`revealNode`, `addNode`, status
setters) triggers a fresh `requestAnimationFrame` for the new state — it
is not coalesced into the in-flight emit. Subsequent post-display work
runs for the new state, then a new `render` emit fires.

#### Handler-set mutation during emit

Handlers registered or removed during an emit take effect on the **next**
emit (snapshot iteration, matching Node `EventEmitter` / DOM
`EventTarget`). `once('render', h)` deregisters itself inside the snapshot
walk and so fires exactly once.

#### Memory and leaks

`on('render', handler)` registers a strong reference. Long-lived host
pages that attach short-lived handlers should call `off('render', handler)`
when the handler's owning component unmounts; otherwise the handler keeps
the closure (and anything it captures) alive for the dashboard's lifetime.

### Lifecycle and re-init via `setData`

Event handlers and the underlying `_eventHandlers` registry survive
`Dashboard.setData(newData)` — `setData` rebuilds the SVG and node tree
but does not clear the event registry. The post-`setData` render flush
fires `render` so handlers can react to the new data:

```js
dashboard.on('render', () => syncFromBounds());
await dashboard.setData(newData);
await dashboard.afterRender(); // resolves on the post-setData emit
```

**Cached ids may become stale across `setData`** if the new data omits or
renames them. Re-read ids via `getDatasetNodeIds` after `setData` rather
than caching across re-init boundaries.

### Theme switching

Theme switches are CSS-only (stylesheet swap via `themeManager`). They do
**not** cause a `handleDisplayChange` cascade or a `render` emit, and
caller-applied classes set via `setNodeClass` persist across the swap.
Callers that need to react to theme changes should listen on the existing
window event:

```js
window.addEventListener('flowdash:themechange', (e) => {
  console.log('theme is now', e.detail.theme);
});
```

## Navigation

- Back to docs index: [Documentation Home](README.md)
- Related: [Minimap](minimap.md)
- Settings: [Complete Settings Reference](settings.md)
