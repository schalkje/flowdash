# Utilities Implementation

## Overview

The utilities module provides common helper functions used throughout the dashboard. These functions handle text measurement, bounding box calculations, dimension computations, and coordinate transformations.

## Text Utilities

### getTextWidth

**File:** `utils.js`

Calculates the width of text elements for layout purposes:

```javascript
export function getTextWidth(text) {
  // Create a temporary SVG element
  const svg = d3.select("body").append("svg").attr("class", "temp-svg");

  // Append a text element to the SVG
  const textElement = svg.append("text")
      .attr("x", -9999) // Position it off-screen
      .attr("y", -9999)
      .text(text);

  // Get the width of the text element
  const width = textElement.node().getBBox().width;

  // Remove the temporary SVG element
  svg.remove();

  return width;
}
```

**Usage:**
```javascript
const labelWidth = getTextWidth("node Label");
```

**Performance Note:** Creates and removes DOM elements, so use sparingly in performance-critical code.

## Bounding Box Calculations

### computeBoundingBox

**File:** `utils.js`

Calculates the bounding box that encompasses all provided nodes:

```javascript
export function computeBoundingBox(nodes, horizontal = false) {
  const padding = 0;
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];

  const updateBounds = (x, y, dimension1, dimension2) => {      
    minX = Math.min(minX, x - dimension1 / 2);
    minY = Math.min(minY, y - dimension2 / 2);
    maxX = Math.max(maxX, x + dimension1 / 2);
    maxY = Math.max(maxY, y + dimension2 / 2);
  };

  nodes.forEach((node) => {
    const { x = 0, y = 0, width = 0, height = 0 } = node;

    if (horizontal) {
      updateBounds(y, x, width, height);
    } else {
      updateBounds(x, y, width, height);
    }
  });

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + 2 * padding,
    height: maxY - minY + 2 * padding,
  };
}
```

**Parameters:**
- `nodes` - Array of nodes with x, y, width, height properties
- `horizontal` - Optional flag for horizontal layout (default: false)

**Returns:** Object with x, y, width, height properties

**Usage:**
```javascript
const boundingBox = computeBoundingBox(container.childNodes);
```

## Dimension Utilities

### getComputedDimensions

**File:** `utils.js`

Gets the computed dimensions of an SVG element using getBBox():

```javascript
export function getComputedDimensions(element) {
  return element.node().getBBox();
}
```

**Performance Note:** Uses `getBBox()` instead of `getBoundingClientRect()` to avoid forcing a reflow.

**Usage:**
```javascript
const dimensions = getComputedDimensions(container);
// Returns: { x, y, width, height }
```

### getRelativeBBox

**File:** `utils.js`

Gets the bounding box of an element relative to the parent SVG:

```javascript
export function getRelativeBBox(element) {
  const bbox = element.node().getBBox();
  const ctm = element.node().getCTM();
  return {
    x: ctm.e + bbox.x * ctm.a + bbox.y * ctm.c,
    y: ctm.f + bbox.x * ctm.b + bbox.y * ctm.d,
    width: bbox.width,
    height: bbox.height,
  };
}
```

**Usage:**
```javascript
const relativeBounds = getRelativeBBox(nodeElement);
```

### getBoundingBoxRelativeToParent

**File:** `utils.js`

Calculates the bounding box of an element relative to a specified parent element:

```javascript
export function getBoundingBoxRelativeToParent(element, parentElement) {
  // Get the bounding box of the element relative to its immediate parent
  const bbox = element.node().getBBox();

  // Get the transformation matrix of the element
  const elementCTM = element.node().getCTM();

  // Get the transformation matrix of the specified parent element
  const parentCTM = parentElement.node().getCTM();

  // Calculate the relative transformation matrix from element to parent
  const relativeCTM = parentCTM.inverse().multiply(elementCTM);

  // Calculate the bounding box coordinates relative to the specified parent
  const relativeDimensions = {
      x: relativeCTM.e + bbox.x * relativeCTM.a + bbox.y * relativeCTM.c,
      y: relativeCTM.f + bbox.x * relativeCTM.b + bbox.y * relativeCTM.d,
      width: bbox.width,
      height: bbox.height
  };

  return relativeDimensions;
}
```

**Usage:**
```javascript
const relativeBounds = getBoundingBoxRelativeToParent(childElement, parentElement);
```

## Path Utilities

**File:** `utilPath.js`

### computeConnectionPoints

Calculates connection points on the boundaries of rectangular nodes:

```javascript
export function computeConnectionPoints(x, y, width, height) {
  return {
    top: { x: x, y: y - height/2, side: 'top' },
    right: { x: x + width/2, y: y, side: 'right' },
    bottom: { x: x, y: y + height/2, side: 'bottom' },
    left: { x: x - width/2, y: y, side: 'left' }
  };
}
```

**Usage:**
```javascript
const connectionPoints = computeConnectionPoints(node.x, node.y, node.width, node.height);
```

### Path Calculation Functions

Various functions for calculating different types of paths between connection points:

#### Straight Path
```javascript
function calculateStraightPath(sourcePoint, targetPoint) {
  return `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`;
}
```

#### Curved Path
```javascript
function calculateCurvedPath(sourcePoint, targetPoint) {
  const dx = targetPoint.x - sourcePoint.x;
  const dy = targetPoint.y - sourcePoint.y;
  const controlPoint1 = { x: sourcePoint.x + dx * 0.5, y: sourcePoint.y };
  const controlPoint2 = { x: targetPoint.x - dx * 0.5, y: targetPoint.y };
  
  return `M ${sourcePoint.x} ${sourcePoint.y} C ${controlPoint1.x} ${controlPoint1.y} ${controlPoint2.x} ${controlPoint2.y} ${targetPoint.x} ${targetPoint.y}`;
}
```

#### Orthogonal Path
```javascript
function calculateOrthogonalPath(sourcePoint, targetPoint) {
  const midX = (sourcePoint.x + targetPoint.x) / 2;
  
  return `M ${sourcePoint.x} ${sourcePoint.y} L ${midX} ${sourcePoint.y} L ${midX} ${targetPoint.y} L ${targetPoint.x} ${targetPoint.y}`;
}
```

## Marker Utilities

**File:** `markers.js`

### createMarkers

Creates SVG marker definitions for arrow heads and other symbols:

```javascript
export function createMarkers(svg) {
  const defs = svg.append("defs");
  
  // Arrow head marker
  defs.append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 8)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#999");
    
  // Add more marker types as needed
}
```

**Usage:**
```javascript
createMarkers(mainSvg);
```

## Data Utilities

**File:** `data.js`

### fetchDashboardFile

Fetches dashboard data from JSON files:

```javascript
export function fetchDashboardFile(selectedFile) {
  const graphData = d3.json(`data/${selectedFile}`);
  return graphData;
}
```

**Usage:**
```javascript
const data = await fetchDashboardFile('dwh-1.json');
```

## Button Utilities

**File:** `buttonZoom.js`

### ZoomButton Class

Manages zoom control buttons:

```javascript
export default class ZoomButton {
  constructor(container, onClick) {
    this.container = container;
    this.onClick = onClick;
    this.element = null;
    this.init();
  }
  
  init() {
    this.element = this.container
      .append("g")
      .attr("class", "zoom-button")
      .on("click", this.onClick);
      
    // Create button visual elements
    this.createButtonElements();
  }
  
  toggle(collapsed) {
    // Toggle between plus and minus icons
    this.element.select(".icon")
      .text(collapsed ? "+" : "-");
  }
}
```

## Force Utilities

### forceBoundary

**File:** `forceBoundary.js`

Creates a force that keeps nodes within specified boundaries:

```javascript
export function forceBoundary(width, height, strength = 0.1) {
  let nodes;

  function force() {
    let i, n = nodes.length, node, x, y;
    for (i = 0; i < n; ++i) {
      node = nodes[i];
      x = Math.max(0, Math.min(width, node.x));
      y = Math.max(0, Math.min(height, node.y));
      if (x !== node.x || y !== node.y) {
        node.vx += (x - node.x) * strength;
        node.vy += (y - node.y) * strength;
      }
    }
  }

  force.initialize = function(_) {
    nodes = _;
  };

  return force;
}
```

### rectCollide

**File:** `forceRectCollide.js`

Custom collision force for rectangular nodes:

```javascript
export function rectCollide() {
  let nodes, sizes, masses;
  let size = constant([0, 0]);
  let mass = constant(1);
  let iterations = 1;

  function force() {
    let node, size, mass, xi, yi;
    let i = -1;
    while (++i < iterations) {
      iterate();
    }

    function iterate() {
      let j = -1;
      let tree = d3.quadtree(nodes, xCenter, yCenter).visitAfter(prepare);
      while (++j < nodes.length) {
        node = nodes[j];
        size = sizes[j];
        mass = masses[j];
        xi = xCenter(node);
        yi = yCenter(node);
        tree.visit(apply);
      }
    }
  }

  // ... collision detection logic ...

  return force;
}
```

## Performance Considerations

### 1. DOM Manipulation

- Use `getBBox()` instead of `getBoundingClientRect()` when possible
- Cache DOM selections and reuse them
- Batch DOM operations using `requestAnimationFrame`

### 2. Text Measurement

- Text width calculation creates temporary DOM elements
- Consider caching text measurements for repeated strings
- Use approximate measurements for performance-critical code

### 3. Bounding Box Calculations

- Bounding box calculations are O(n) where n is the number of nodes
- Consider spatial indexing for large datasets
- Cache bounding boxes when node positions haven't changed

### 4. Coordinate Transformations

- Matrix operations can be expensive
- Cache transformation matrices when possible
- Use simplified calculations for approximate results

## Error Handling

Utilities include error handling for edge cases:

```javascript
// Check for valid elements
if (!element || !element.node()) {
  console.error("Invalid element provided");
  return null;
}

// Validate dimensions
if (width <= 0 || height <= 0) {
  console.warn("Invalid dimensions provided");
  return { x: 0, y: 0, width: 0, height: 0 };
}
```

## Testing Utilities

### Mock Objects

Create mock objects for testing:

```javascript
// Mock node for testing
const mockNode = {
  x: 100,
  y: 200,
  width: 80,
  height: 60,
  data: { width: 80, height: 60 }
};

// Mock element for testing
const mockElement = {
  node: () => ({
    getBBox: () => ({ x: 0, y: 0, width: 100, height: 50 }),
    getCTM: () => ({ e: 0, f: 0, a: 1, b: 0, c: 0, d: 1 })
  })
};
```

## Common Patterns

### 1. Default Values

```javascript
function withDefaults(obj, defaults) {
  return { ...defaults, ...obj };
}
```

### 2. Safe Property Access

```javascript
function safeGet(obj, path, defaultValue = null) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : defaultValue;
  }, obj);
}
```

### 3. Batch Operations

```javascript
function batchUpdate(elements, updateFn) {
  requestAnimationFrame(() => {
    elements.forEach(updateFn);
  });
}
``` 