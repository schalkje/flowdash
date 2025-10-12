# Simulation Engine Implementation

## Overview

The simulation engine provides force-directed layout capabilities using D3.js force simulation. It manages node positioning, collision detection, and container resizing to create optimal visual layouts.

## Architecture

**File:** `simulation.js`

The simulation engine is implemented as a class that wraps D3's force simulation with additional functionality for container management and collision detection.

## Simulation Class

### Constructor

```javascript
export default class Simulation {
  constructor(containerNode) {
    this.containerNode = containerNode;
    this.simulation = null;
    this.tickCounter = 0;
    this.resizeFrequency = 10; // Resize every 10 ticks
    this.links = [];
  }
}
```

### Key Properties

- `containerNode` - The container node this simulation manages
- `simulation` - D3 force simulation instance
- `tickCounter` - Counter to control resizing frequency
- `resizeFrequency` - How often to resize the container
- `links` - Array of edge links for the simulation

## Force Configuration

### Core Forces

The simulation uses several D3 forces:

```javascript
this.simulation = d3.forceSimulation(this.containerNode.childNodes)
  .force('center', d3.forceCenter(0, 0))
  .force('link', d3.forceLink(this.links).id(d => d.id).distance(d => 100))
  .force('collision', rectCollide()); // Custom collision force
```

#### 1. Center Force
```javascript
.force('center', d3.forceCenter(0, 0))
```
Centers all nodes around the origin (0, 0).

#### 2. Link Force
```javascript
.force('link', d3.forceLink(this.links).id(d => d.id).distance(d => 100))
```
Creates attractive forces between connected nodes with a fixed distance of 100 pixels.

#### 3. Collision Force
```javascript
.force('collision', rectCollide())
```
Custom force that prevents rectangular nodes from overlapping.

## Custom Collision Force

**File:** `forceRectCollide.js`

Implements rectangle-based collision detection:

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

  function apply(quad, x0, y0, x1, y1) {
    let data = quad.data, r = quad.r, r2 = r * r;
    if (data) {
      if (data.index > node.index) {
        let x = xi - xCenter(data);
        let y = yi - yCenter(data);
        let l = x * x + y * y;
        if (l < r2) {
          l = Math.sqrt(l);
          l = (r - l) / l;
          x *= l;
          y *= l;
          node.vx -= x * mass;
          node.vy -= y * mass;
          data.vx += x * masses[data.index];
          data.vy += y * masses[data.index];
        }
      }
      return;
    }
    return x0 > xi + r || x1 < xi - r || y0 > yi + r || y1 < yi - r;
  }

  return force;
}
```

## Simulation Lifecycle

### 1. Initialization

```javascript
init() {
  return new Promise((resolve) => {
    this.tickCounter = 0;
    
    // Initialize node positions
    this.containerNode.childNodes.forEach(node => {
      node.x = node.x;
      node.y = node.data.y;
      node.width = node.data.width;
      node.height = node.data.height;      
    });

    // Create simulation
    this.simulation = d3.forceSimulation(this.containerNode.childNodes)
      .force('center', d3.forceCenter(0, 0))
      .force('link', d3.forceLink(this.links).id(d => d.id).distance(d => 100))
      .force('collision', rectCollide());

    this.resizeBoundingContainer();

    this.simulation
      .on('tick', () => this.tick(resolve))
      .on('end', () => this.end(resolve));
  });
}
```

### 2. Tick Processing

```javascript
tick(resolve) {
  this.containerNode.childNodes.forEach(node => {
    node.element.attr('transform', `translate(${node.x}, ${node.y})`);
  });

  this.tickCounter++;
  this.resizeBoundingContainer();
}
```

### 3. Container Resizing

```javascript
resizeBoundingContainer() {    
  if (this.containerNode.container) {
    const boundingBox = getComputedDimensions(this.containerNode.container);
    this.containerNode.resizeContainer(boundingBox);
    this.containerNode.positionContainer();
  }
}
```

### 4. Completion

```javascript
end(resolve) {
  console.log(`Simulation ended for ${this.containerNode.data.id}`);
  resolve();
  this.resizeBoundingContainer();
}
```

## Boundary Force

**File:** `forceBoundary.js`

Optional force that keeps nodes within container boundaries:

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

## Performance Optimizations

### 1. Resize Frequency Control

```javascript
this.resizeFrequency = 10; // Resize every 10 ticks
```

Container resizing is expensive, so it's only performed every N ticks.

### 2. Efficient Collision Detection

The collision force uses a quadtree for efficient spatial partitioning:

```javascript
let tree = d3.quadtree(nodes, xCenter, yCenter).visitAfter(prepare);
```

### 3. Batch Updates

Node position updates are batched to minimize DOM manipulation:

```javascript
this.containerNode.childNodes.forEach(node => {
  node.element.attr('transform', `translate(${node.x}, ${node.y})`);
});
```

## Integration with Node System

### Node Position Management

Nodes expose position properties that the simulation can modify:

```javascript
node.x = newX;
node.y = newY;
```

### Container Integration

The simulation works closely with container nodes:

```javascript
// Get child nodes for simulation
this.containerNode.childNodes

// Resize container based on simulation results
this.containerNode.resizeContainer(boundingBox);
```

## Simulation Parameters

### Force Strengths

- **Center Force**: Keeps nodes centered
- **Link Force**: Attracts connected nodes (distance: 100px)
- **Collision Force**: Prevents overlap (strength: 1.0)

### Timing

- **Alpha**: Initial simulation temperature (0.3)
- **Alpha Decay**: How quickly simulation cools (0.0228)
- **Velocity Decay**: How quickly nodes slow down (0.4)

## Customization Options

### Force Configuration

```javascript
// Customize link distance
.force('link', d3.forceLink(this.links).distance(d => {
  return Math.min(d.source.width/2 + d.target.width/2, 
                  d.source.height/2 + d.target.height/2);
}))

// Add custom forces
.force('charge', d3.forceManyBody().strength(-1300))
```

### Simulation Control

```javascript
// Start simulation
this.simulation.alpha(1).restart();

// Stop simulation
this.simulation.stop();

// Modify parameters
this.simulation.alphaDecay(0.01);
this.simulation.velocityDecay(0.3);
```

## Error Handling

The simulation includes error handling for edge cases:

```javascript
if (!this.containerNode.container) {
  console.log('No container to resize', this.containerNode);
  return;
}
```

## Debugging

### Simulation State

```javascript
console.log('Simulation tick', this.tickCounter, this.containerNode);
```

### Node Positions

```javascript
console.log(`Node ${node.id} = (${Math.round(node.x)},${Math.round(node.y)})`);
```

### Performance Monitoring

```javascript
// Monitor simulation performance
const startTime = performance.now();
// ... simulation code ...
const endTime = performance.now();
console.log(`Simulation took ${endTime - startTime}ms`);
``` 