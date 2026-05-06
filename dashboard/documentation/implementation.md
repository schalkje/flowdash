# Dashboard Implementation Documentation

## Overview

The dashboard is a modular, production-ready D3.js application for visualizing hierarchical data structures with interactive features. It uses a component-based architecture with clear separation of concerns.

## Architecture Overview

The dashboard follows a modular JavaScript architecture with the following key components:

- **Dashboard Core** (`dashboard.js`) - Main orchestrator and UI controller
- **Node System** - Hierarchical node types with inheritance
- **Edge System** - Connection management between nodes
- **Simulation Engine** - Force-directed layout calculations
- **Utility Functions** - Common helper functions

## Key Design Principles

1. **Modularity** - Each component is self-contained with clear interfaces
2. **Inheritance** - Node types extend base classes for common functionality
3. **Event-Driven** - Components communicate through events and callbacks
4. **Configuration-Driven** - Behavior controlled through settings objects
5. **DRY (Don't Repeat Yourself)** - Common functionality extracted to base classes

## File Structure

```
js/
├── index.js             # Main entry point and module exports
├── dashboard.js         # Dashboard core controller
├── node.js              # Node factory and creation logic
├── nodeBase.js          # Base node class with common functionality
├── nodeBaseContainer.js # Container node base class
├── nodeAdapter.js       # Adapter node implementation
├── nodeFoundation.js    # Foundation node implementation
├── nodeMart.js          # Mart node implementation
├── nodeLane.js          # Lane node implementation
├── nodeColumns.js       # Columns node implementation
├── nodeRect.js          # Rectangular node implementation
├── nodeCircle.js        # Circle node implementation
├── nodeGroup.js         # Group node implementation
├── nodeEdgeDemo.js      # Edge demo node implementation
├── edge.js              # Edge factory and creation logic
├── edgeBase.js          # Base edge class
├── simulation.js        # Force-directed simulation engine
├── utils.js             # Utility functions
├── utilPath.js          # Path calculation utilities
├── markers.js           # SVG marker definitions
├── forceBoundary.js     # Boundary force implementation
├── forceRectCollide.js  # Rectangle collision force
└── buttonZoom.js        # Zoom button component
```

## Detailed Documentation

- [Node System](implementation-nodes.md) - Detailed node architecture and types
- [Edge System](implementation-edges.md) - Edge management and routing
- [Simulation Engine](implementation-simulation.md) - Force-directed layout
- [Dashboard Core](implementation-dashboard.md) - Main dashboard controller
- [Utilities](implementation-utils.md) - Helper functions and utilities

## Usage

```javascript
import { createAndInitDashboard } from './js/dashboard.js';

// Initialize dashboard with data and DOM selectors
const dashboard = createAndInitDashboard(dashboardData, '#main-container');
```

## Data Structure

The dashboard expects data in the following format:

```javascript
{
  settings: {
    selector: { incomming: 1, outgoing: 1 },
    showBoundingBox: true,
    zoomToRoot: true,
    toggleCollapseOnStatusChange: true,
    cascadeOnStatusChange: true
    // ... many more settings available
    // See documentation/settings.md for complete reference
  },
  nodes: [...], // Array of node definitions
  edges: [...]  // Array of edge definitions
}
```

For complete settings documentation, see [Settings Reference](documentation/settings.md).

## Status System

Nodes support a comprehensive status system:

- `Undetermined` - Initial state during status calculation
- `Unknown` - Status cannot be determined
- `Disabled` - Node is disabled
- `Ready` - Node is ready to process
- `Updating` - Node is currently updating
- `Updated` - Node has been updated successfully
- `Skipped` - Node update was skipped
- `Delayed` - Node update is delayed
- `Warning` - Node has warnings
- `Error` - Node has errors

## Code Quality and DRY Principles

The current implementation has several areas where DRY principles could be better applied:

1. **Node Type Creation** - Factory pattern could be more consistent
2. **Layout Logic** - Common layout patterns could be extracted
3. **Event Handling** - Standardized event propagation
4. **Status Management** - Centralized status calculation logic
5. **Configuration** - Default settings could be centralized

See [Code Cleanup Plan](implementation-cleanup.md) for detailed recommendations.
