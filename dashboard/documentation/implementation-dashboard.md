# Dashboard Core Implementation

For usage‑level documentation, see: [documentation/dashboard.md](documentation/dashboard.md) and [documentation/minimap.md](documentation/minimap.md)

## Overview

The dashboard core (`dashboard.js`) is the main orchestrator that manages the entire visualization. It handles initialization, zoom/pan controls, minimap functionality, node selection, and overall dashboard state management.

## Dashboard Class

**File:** `dashboard.js`

The main dashboard class that coordinates all components:

```javascript
export class Dashboard {
  constructor(dashboardData) {
    this.data = dashboardData;
    this.settings = this.initializeSettings();
    this.main = this.initializeMainView();
    this.minimap = this.initializeMinimap();
    this.selection = this.initializeSelection();
  }
}
```

## Core Components

### 1. Main View

Manages the primary visualization area:

```javascript
this.main = {
  svg: null,           // D3 selection of main SVG
  width: 0,            // Viewport width
  height: 0,           // Viewport height
  divRatio: 0,         // Aspect ratio
  container: null,     // Main container group
  root: null,          // Root node
  scale: 1,            // Current zoom scale
  zoomSpeed: 0.2,      // Zoom animation speed
  transform: { k: 1, x: 0, y: 0 } // Current transform
};
```

### 2. Minimap

Provides an overview of the entire visualization:

```javascript
this.minimap = {
  active: false,       // Whether minimap is enabled
  svg: null,          // D3 selection of minimap SVG
  width: 0,           // Minimap width
  height: 0,          // Minimap height
  container: null,    // Minimap container
  eye: { x: 0, y: 0, width: 0, height: 0 } // Viewport indicator
};
```

### 3. Selection

Manages node and edge selection state:

```javascript
this.selection = {
  nodes: [],          // Selected nodes
  edges: [],          // Selected edges
  boundingBox: { x: 0, y: 0, width: 0, height: 0 } // Selection bounds
};
```

## Initialization Process

### 1. Dashboard Initialization

```javascript
initialize(mainDivSelector, minimapDivSelector = null) {
  // Initialize main view
  const div = this.initializeSvg(mainDivSelector);
  this.main.svg = div.svg;
  this.main.width = div.width;
  this.main.height = div.height;
  this.main.divRatio = this.main.width / this.main.height;
  
  // Create main container and root node
  this.main.container = this.createContainer(this.main, "dashboard");
  this.main.root = this.createDashboard(this.data, this.main.container);
  
  // Initialize zoom behavior
  this.main.zoom = this.initializeZoom();
  
  // Set up event handlers
  this.main.root.onClick = (node) => this.selectNode(node);
  this.main.root.onDblClick = (node) => this.zoomToNode(node);
  
  // Initialize minimap if provided
  if (minimapDivSelector) {
    this.initializeMinimapView(minimapDivSelector);
  }
  
  // Initial zoom to root if enabled
  if (this.data.settings.zoomToRoot) {
    this.zoomToRoot();
  }
}
```

### 2. SVG Initialization

```javascript
initializeSvg(divSelector) {
  const div = d3.select(divSelector);
  const width = div.node().getBoundingClientRect().width;
  const height = div.node().getBoundingClientRect().height;
  
  const svg = div.append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `${-width/2} ${-height/2} ${width} ${height}`);
    
  return { svg, width, height };
}
```

### 3. Container Creation

```javascript
createContainer(parentContainer, className) {
  return parentContainer.svg
    .append("g")
    .attr("class", className);
}
```

## Zoom and Pan System

### 1. Zoom Initialization

```javascript
initializeZoom() {
  const zoom = d3.zoom()
    .scaleExtent([0.1, 10])
    .on("zoom", (event) => this.zoomMain(event));
    
  this.main.svg.call(zoom);
  return zoom;
}
```

### 2. Zoom Event Handling

```javascript
zoomMain(zoomEvent) {
  const transform = zoomEvent.transform;
  this.main.transform = transform;
  
  this.main.container.attr("transform", transform);
  
  // Sync with minimap if active
  if (this.minimap.active && !this.isMainAndMinimapSyncing) {
    this.updateMinimapEye(transform);
  }
}
```

### 3. Zoom Controls

#### Zoom to Root
```javascript
zoomToRoot() {
  const boundingBox = this.computeBoundingBox(this, this.main.root.getAllNodes());
  this.zoomToBoundingBox(boundingBox);
}
```

#### Zoom to Node
```javascript
zoomToNode(node) {
  const boundingBox = {
    x: node.x - node.data.width/2,
    y: node.y - node.data.height/2,
    width: node.data.width,
    height: node.data.height
  };
  this.zoomToBoundingBox(boundingBox);
}
```

#### Zoom to Bounding Box
```javascript
zoomToBoundingBox(boundingBox) {
  const { scale, translateX, translateY } = this.calculateScaleAndTranslate(boundingBox, this.main);
  
  const transform = d3.zoomIdentity
    .translate(translateX, translateY)
    .scale(scale);
    
  this.main.svg
    .transition()
    .duration(750)
    .call(this.main.zoom.transform, transform);
}
```

## Minimap System

### 1. Minimap Initialization

```javascript
initializeMinimap() {
  // Initialize drag behavior
  const drag = d3.drag().on("drag", (event) => this.dragEye(event));
  this.minimap.svg.call(drag);
  
  // Initialize zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 40])
    .on("zoom", (event) => this.zoomMinimap(event));
  this.minimap.svg.call(zoom);
  
  // Calculate minimap scale
  this.minimap.scale = Math.min(
    this.minimap.width / this.main.width,
    this.minimap.height / this.main.height
  );
  
  // Create minimap elements
  this.createMinimapElements();
}
```

### 2. Minimap Elements

```javascript
createMinimapElements() {
  // Create mask for viewport indicator
  const defs = this.minimap.svg.append("defs");
  const eye = defs.append("mask").attr("id", "fade-mask");
  
  eye.append("rect")
    .attr("id", "eyeball")
    .attr("x", -this.main.width/2)
    .attr("y", -this.main.height/2)
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("fill", "white");
    
  eye.append("rect")
    .attr("id", "pupil")
    .attr("x", this.minimap.eye.x)
    .attr("y", this.minimap.eye.y)
    .attr("width", this.minimap.eye.width)
    .attr("height", this.minimap.eye.height)
    .attr("fill", "black");
    
  // Create background and viewport indicator
  this.minimap.svg
    .insert("rect", ":first-child")
    .attr("class", "background")
    .attr("width", this.main.width)
    .attr("height", this.main.height)
    .attr("x", -this.main.width/2)
    .attr("y", -this.main.height/2);
    
  this.minimap.svg
    .append("rect")
    .attr("class", "eye")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("x", -this.main.width/2)
    .attr("y", -this.main.height/2)
    .attr("mask", "url(#fade-mask)");
    
  this.minimap.svg
    .append("rect")
    .attr("class", "iris")
    .attr("x", this.minimap.eye.x)
    .attr("y", this.minimap.eye.y)
    .attr("width", this.minimap.eye.width)
    .attr("height", this.minimap.eye.height);
}
```

### 3. Minimap Updates

```javascript
updateMinimap() {
  requestAnimationFrame(() => {
    // Clone main container to minimap
    const clone = this.main.container.node().cloneNode(true);
    
    // Remove old minimap content
    const minimap = d3.select(".minimap");
    minimap.selectAll("*").remove();
    
    // Add cloned content
    minimap.node().appendChild(clone);
    this.minimap.container = d3.select(clone);
  });
}
```

## Node Selection System

### 1. Node Selection

```javascript
selectNode(node) {
  // Deselect all nodes
  this.deselectAll();
  
  // Select the clicked node
  node.selected = true;
  this.selection.nodes.push(node);
  
  // Get neighbors based on settings
  const neighbors = node.getNeighbors(this.data.settings.selector);
  neighbors.forEach(neighbor => {
    neighbor.selected = true;
    this.selection.nodes.push(neighbor);
  });
  
  // Compute selection bounding box
  this.selection.boundingBox = this.computeBoundingBox(this, this.selection.nodes);
  
  // Show bounding box if enabled
  if (this.data.settings.showBoundingBox) {
    this.showBoundingBox(this.selection.boundingBox);
  }
}
```

### 2. Selection Management

```javascript
deselectAll() {
  this.selection.nodes.forEach(node => {
    node.selected = false;
  });
  this.selection.nodes = [];
  this.selection.edges = [];
  this.hideBoundingBox();
}

getSelectedNodes() {
  return this.selection.nodes;
}
```

## Status Management

### 1. Node Status Updates

```javascript
updateNodeStatus(nodeId, status) {
  const node = this.main.root.getNode(nodeId);
  if (node) {
    node.status = status;
  }
}
```

### 2. Dataset Status Updates

```javascript
updateDatasetStatus(datasetId, status) {
  const nodes = this.main.root.getNodesByDatasetId(datasetId);
  nodes.forEach(node => {
    node.status = status;
  });
}
```

## Utility Functions

### 1. Bounding Box Calculation

```javascript
computeBoundingBox(dashboard, nodes) {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  
  const updateBounds = (x, y, width, height) => {
    minX = Math.min(minX, x - width/2);
    minY = Math.min(minY, y - height/2);
    maxX = Math.max(maxX, x + width/2);
    maxY = Math.max(maxY, y + height/2);
  };
  
  nodes.forEach(node => {
    updateBounds(node.x, node.y, node.data.width, node.data.height);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}
```

### 2. Scale and Translate Calculation

```javascript
calculateScaleAndTranslate(boundingBox, dashboard) {
  const padding = 50;
  const availableWidth = dashboard.width - 2 * padding;
  const availableHeight = dashboard.height - 2 * padding;
  
  const scaleX = availableWidth / boundingBox.width;
  const scaleY = availableHeight / boundingBox.height;
  const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1:1
  
  const translateX = dashboard.width/2 - (boundingBox.x + boundingBox.width/2) * scale;
  const translateY = dashboard.height/2 - (boundingBox.y + boundingBox.height/2) * scale;
  
  return { scale, translateX, translateY };
}
```

## Event Handling

### 1. Display Change Events

```javascript
onMainDisplayChange() {
  if (this.minimap.active) {
    this.updateMinimap();
  }
  
  // Update viewport if needed
  this.updateViewport();
}
```

### 2. Drag Events

```javascript
onDragUpdate() {
  // Handle drag updates from nodes
  this.handleDisplayChange();
}
```

## Factory Functions

### 1. Dashboard Creation

```javascript
export function createAndInitDashboard(dashboardData, mainDivSelector, minimapDivSelector = null) {
  const dashboard = new Dashboard(dashboardData);
  dashboard.initialize(mainDivSelector, minimapDivSelector);
  return dashboard;
}
```

### 2. Property Setting

```javascript
export function setDashboardProperty(dashboardObject, propertyPath, value) {
  const path = propertyPath.split('.');
  let current = dashboardObject;
  
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]];
  }
  
  current[path[path.length - 1]] = value;
}
```

## Performance Considerations

### 1. RequestAnimationFrame

Minimap updates use `requestAnimationFrame` to avoid blocking the main thread:

```javascript
updateMinimap() {
  requestAnimationFrame(() => {
    // Update minimap content
  });
}
```

### 2. Event Debouncing

Zoom and pan events are debounced to prevent excessive updates.

### 3. Efficient Selection

D3 selections are cached and reused where possible.

## Error Handling

The dashboard includes comprehensive error handling:

```javascript
// Check for required elements
if (!this.main.svg) {
  console.error("Main SVG not initialized");
  return;
}

// Validate node existence
if (!node) {
  console.error(`Node ${nodeId} not found`);
  return;
}
``` 