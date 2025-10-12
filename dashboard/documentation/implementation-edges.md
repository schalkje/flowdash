# Edge System Implementation

## Overview

The edge system manages connections between nodes in the dashboard. It handles edge creation, parent resolution, routing, and visual representation with support for straight or curved rendering and optional ghostlines.

## Architecture

### Edge Creation Flow

1. **Edge Factory** (`edge.js`) – Creates edge instances
2. **Parent Resolution** – Determines common parent container
3. **Edge Instance** (`edgeBase.js`) – Manages SVG elements and interaction
4. **Path Calculation** (`utilPath.js`) – Computes routed polyline points
5. **Markers** (`markers.js`) – Optional SVG markers (arrow heads, symbols)

## Edge Factory

**File:** `edge.js`

The factory handles edge creation and parent resolution. The real code uses defensive checks and avoids duplicate edges between the same nodes.

### Key Functions

#### `createEdges(rootNode, edges, settings)`
Main entry point for creating multiple edges:

```javascript
export function createEdges(rootNode, edges, settings) {
  edges.forEach((edgeData) => {
    createEdge(rootNode, edgeData, settings);
  });
  rootNode.initEdges(true);
}
```

#### `createEdge(rootNode, edgeData, settings)`
Creates a single edge by finding source and target nodes (IDs or objects are accepted):

```javascript
export function createEdge(rootNode, edgeData, settings) {
  var sourceId = typeof edgeData.source === 'string' ? edgeData.source : edgeData.source.id;
  var targetId = typeof edgeData.target === 'string' ? edgeData.target : edgeData.target.id;

  const source = rootNode.getNode(sourceId);
  if (!source) { console.error(`Creating Edge - Source node ${sourceId} not found`, edgeData); return; }

  const target = rootNode.getNode(targetId);
  if (!target) { console.error(`Creating Edge - Target node ${targetId} not found`); return; }

  createInternalEdge(edgeData, source, target, settings)
}
```

#### `createInternalEdge(edgeData, source, target, settings)`
Creates the actual edge instance using the common parent container:

```javascript
export function createInternalEdge(edgeData, source, target, settings) {
  if (source === target) { console.error('createInternalEdge - Source and Target are the same node', source); return; }

  const parents = buildEdgeParents(source, target);
  const parent = parents.container;
  if (!parent || !parent.childEdges) { console.error('createInternalEdge: invalid parent container', { parent }); return; }

  // Avoid duplicate edges between the same nodes
  if (source.edges.outgoing.find((edge) => edge.target === target)) return;

  const edge = new BaseEdge(edgeData, parents, settings);

  source.edges.outgoing.push(edge);
  target.edges.incoming.push(edge);
  parent.childEdges.push(edge);
}
```

### Parent Resolution

#### `buildEdgeParents(sourceNode, targetNode)`
Determines the common parent container and builds parent hierarchies (closest shared ancestor). Only the chain up to (but excluding) the container is kept for both sides:

```javascript
export function buildEdgeParents(sourceNode, targetNode) {
  const sourceParents = [sourceNode, ...sourceNode.getParents()];
  const targetParents = [targetNode, ...targetNode.getParents()];

  let container = null;
  const targetParentSet = new Set(targetParents);
  for (let i = 0; i < sourceParents.length; i++) {
    if (targetParentSet.has(sourceParents[i])) { container = sourceParents[i]; break; }
  }

  const prunedSourceParents = sourceParents.slice(0, sourceParents.indexOf(container));
  const prunedTargetParents = targetParents.slice(0, targetParents.indexOf(container));

  return { source: prunedSourceParents, target: prunedTargetParents, container };
}
```

## BaseEdge Class

**File:** `edgeBase.js`

The base class for all edge implementations. It renders into the common parent container's `edgesContainer` and optionally a `ghostContainer`.

### Key Properties

- `data` – Edge configuration (`type`, `active`, etc.)
- `parents` – `{ source: [...], target: [...], container }`
- `settings` – Rendering options: `showEdges`, `showGhostlines`, `curved`, `curveMargin`
- `source` / `target` – Computed from parent chains
- `element` – D3 selection for the main edge group and `.path`
- `ghostElement` – Optional ghostline group and `.path`

### Key Methods

#### `init(parentElement)`
Initializes ghostline and edge groups under the container’s dedicated layers and wires click handlers. The path is rendered using a D3 line generator (curved when `settings.curved` is true).

#### `update()`
Recomputes the points via `generateEdgePath(this)` from `utilPath.js` and sets the `d` attribute with the configured line generator. Ghostlines use `generateGhostEdge(this)`.

#### Coordinates and Zone System
`x1`, `y1`, `x2`, `y2` apply hierarchical nesting corrections and `getZoneTransforms(node)` to produce global coordinates, ensuring accurate rendering within the zone system.

## Path Calculation

**File:** `utilPath.js`

Path routing returns an array of point pairs consumed by a D3 line generator. Connection points are selected based on feasible sides and minimal distance, then intermediate waypoints are added depending on side combinations and `curveMargin`.

### Key Functions

#### `computeConnectionPoints(x, y, width, height)`
Boundary connection points for a node center at `(x,y)`:

```javascript
export function computeConnectionPoints(x, y, width, height) {
  return {
    top:    { side: 'top',    x: x,           y: y - height/2 },
    bottom: { side: 'bottom', x: x,           y: y + height/2 },
    left:   { side: 'left',   x: x - width/2, y: y },
    right:  { side: 'right',  x: x + width/2, y: y },
  };
}
```

#### `generateEdgePath(edge)`
Returns an array of `[x,y]` points. The caller applies `d3.line()` or `d3.line().curve(d3.curveBasis)` depending on `settings.curved`.

#### `generateGhostEdge(edge)`
Returns two points between node midpoints, accounting for zone transforms.

#### `getZoneTransforms(node)`
Extracts the current container inner zone translation to convert local coordinates to global.

## Markers

**File:** `markers.js`

Defines multiple SVG markers (arrowheads, circles). Use them by adding `marker-start`, `marker-mid`, or `marker-end` on the edge path via CSS or code. BaseEdge does not force markers by default, so projects can opt-in.

## Edge Data Structure

```javascript
{
  source: "source-node-id" | { id: "source-node-id" }, // ID or object with id
  target: "target-node-id" | { id: "target-node-id" },
  type: "SSIS" | "DataFlow" | string,                  // optional, defaults to "unknown"
  active: true,                                          // optional, defaults to true
  state: "Ready" | "Error" | "Warning" | string        // optional
}
```

## Edge Types

- Internal edges – Between nodes within the same container (typical when containers auto-create edges for their children).
- External edges – Between nodes in different containers, created explicitly in the dashboard data and resolved by `createEdge`/`createEdges`.

## Performance Considerations

- **Lazy Updates** - Edges only update when nodes move
- **Path Caching** - Connection points cached to avoid recalculation
- **Batch Operations** - Multiple edge updates batched together
- **Efficient Selection** - Uses D3 selections for DOM manipulation

## Edge Routing

Routing is currently polyline-based using side-aware shortest-feasible connection points. Rendering style is controlled by the line generator:

- Straight: `d3.line()`
- Curved: `d3.line().curve(d3.curveBasis)`

## Edge Styling

Style edges via CSS classes emitted by `BaseEdge`:

- Group class: `edge` and `edge <type>`
- Status attribute: `status="ready|active|error|warning|unknown|disabled"`
- Selected state: `class="selected"` on the edge group
- Path class: `.path` (apply markers via CSS if desired)

## Event Handling

`BaseEdge` wires events on the edge group:

```javascript
this.element
  .on('click', (event) => { event.stopPropagation(); this.handleClicked(event); })
  .on('dblclick', (event) => { event.stopPropagation(); this.handleDblClicked(event); });
```

## Integration with Node System

Edges integrate closely with the node system:

- Connection points – Provided by nodes via `computeConnectionPoints`
- Status and selection – Reflected on edge DOM via attributes/classes
- Visibility – Managed by container layers; hidden when containers collapse