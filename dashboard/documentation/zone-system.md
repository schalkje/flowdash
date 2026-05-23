# Zone System

## Overview

The Zone System is a hierarchical layout architecture that provides automatic positioning, sizing, and visual organization for node content. It's designed to manage complex layouts with consistent spacing, proper alignment, and efficient coordinate systems.

## Architecture

### Zone Hierarchy

```
Container Zone (outermost)
├── Header Zone (top)
├── Margin Zones (surrounding)
│   ├── Top Margin (from header bottom)
│   ├── Right Margin
│   ├── Bottom Margin
│   └── Left Margin
└── Inner Container Zone (content area)
    └── Child Nodes (positioned here)
```

### Zone Manager

The `ZoneManager` is the central coordinator that manages all zones within a node:

- **Zone Creation**: Automatic zone initialization
- **Zone Positioning**: Coordinate system management
- **Zone Sizing**: Dynamic size calculation
- **Child Integration**: Child positioning within zones
- **Layout Algorithms**: Zone-specific layout methods

## Zone Types

### Container Zone

**Purpose**: The outermost boundary of the node

**Characteristics:**

- Represents the total visual footprint of the node
- Contains all other zones within its boundaries
- Defines the node's position in the parent coordinate system
- Used for collision detection and spatial queries

**Visual Representation:**

- Usually a rectangular border or shape outline
- May have rounded corners or specific styling
- Represents the maximum extent of the node's content

### Header Zone

**Purpose**: Dedicated area for title, controls, and header elements

**Characteristics:**

- Contains the node's display name or label
- Positioned at the top of the container zone
- May include additional header elements (status indicators, icons, zoom buttons)
- Has its own styling and interaction behaviors
- Serves as a distinct layout zone separate from content

**Layout Behavior:**

- Text is typically left-aligned with padding (default: 4px from left edge)
- Height is calculated based on text content with minimum height constraint (default: 10px minimum)
- Width spans the full container width minus left/right margins
- Positioned at the top of the container zone (y=0 relative to container)
- Has its own background, border, and visual styling
- Can handle text overflow and ellipsis for long labels

### Margin Zones

**Purpose**: Spacing areas around content providing visual separation

**Components:**

- **Top Margin**: Space between header zone and content area
- **Right Margin**: Space between content and right container edge
- **Bottom Margin**: Space between content and bottom container edge
- **Left Margin**: Space between content and left container edge

**Default Values:**

- Top: 4 pixels (from header bottom)
- Right: 8 pixels
- Bottom: 8 pixels
- Left: 8 pixels

**Behavior:**

- Top margin is measured from the bottom of the header zone
- All margins are configurable via settings
- Margins are automatically applied to child content
- Margins contribute to the total container size calculation
- Margins create the boundary between header zone and inner container zone

### Inner Container Zone

**Purpose**: Dedicated content area where child nodes are positioned

**Characteristics:**

- Contains all child nodes and their content
- Positioned below the header zone with top margin separation
- Size is calculated based on child content and spacing
- Subject to layout algorithms specific to node type
- Has its own coordinate system relative to the container

**Layout Behavior:**

- Child nodes are positioned within this zone using the zone's coordinate system
- Size adapts to accommodate child content and spacing
- Spacing between children is managed within this zone
- Transform offsets account for header height and margins
- Children are positioned relative to this zone's top-left corner (not container center)

## Coordinate Systems

### Container Zone Coordinate System

- **Origin**: Center point of the container
- **Positioning**: Container positioned by center point in parent coordinate system
- **Transform**: Container applies transform to position itself

### Header Zone Coordinate System

- **Origin**: Top-left of container zone
- **Positioning**: Positioned at top of container (y=0)
- **Width**: Full container width minus left/right margins
- **Height**: Calculated from content with minimum constraint

### Inner Container Zone Coordinate System

- **Origin**: Top-left of inner container (after margins and header)
- **Positioning**: Positioned below header with top margin offset
- **Transform**: Applied to account for container positioning and margins

**Coordinate Calculation:**

```javascript
// Origin: Top-left of inner container (after margins and header)
const innerX = -this.size.width / 2 + marginSize.left;
const innerY = -this.size.height / 2 + headerHeight + marginSize.top;

// Available space for children
const availableWidth = this.size.width - marginSize.left - marginSize.right;
const availableHeight = this.size.height - headerHeight - marginSize.top - marginSize.bottom;
```

### Child Positioning

- **Horizontal Centering**: `x = (availableWidth - childWidth) / 2`
- **Vertical Centering**: `y = (availableHeight - childHeight) / 2`
- **Stacking**: `y = currentY + childHeight + spacing`
- **Row Layout**: `x = currentX + childWidth + spacing`

## Zone Management

### Zone Creation

Zones are automatically created when a container node is initialized:

```javascript
// Zone initialization in BaseContainerNode
if (this.isContainer) {
  this.zoneManager = new ZoneManager(this);
  this.zoneManager.init();

  // Resize zones with actual node dimensions
  if (this.zoneManager) {
    this.zoneManager.resize(this.data.width, this.data.height);
  }
}
```

### Zone Sizing

Zones are automatically sized based on container dimensions:

```javascript
// Zone sizing
this.zoneManager.resize(this.data.width, this.data.height);
```

### Zone Positioning

Each zone has its own positioning logic:

```javascript
// Header zone positioning
headerZone.position(0, 0); // Top of container

// Inner container zone positioning
const innerX = marginSize.left;
const innerY = headerHeight + marginSize.top;
innerContainerZone.position(innerX, innerY);
```

## Layout Algorithms

### Default Layout

The zone system provides default layout algorithms:

```javascript
// Default horizontal centering
const x = (availableWidth - childWidth) / 2;

// Default vertical centering
const y = (availableHeight - childHeight) / 2;
```

### Custom Layouts

Node types can override layout algorithms:

```javascript
// LaneNode vertical stacking
innerContainerZone.setLayoutAlgorithm((childNodes, coordinateSystem) => {
  const spacing = this.nodeSpacing?.vertical || 10;
  let currentY = 0;

  childNodes.forEach((childNode) => {
    const x = coordinateSystem.size.width / 2 - childNode.data.width / 2;
    const y = currentY;
    childNode.move(x, y);
    currentY += childNode.data.height + spacing;
  });
});
```

### Layout Triggers

Layout algorithms are triggered by:

- **Child Addition**: New children added to container
- **Child Removal**: Children removed from container
- **Container Resize**: Container size changes
- **Layout Mode Change**: Layout algorithm changes
- **Manual Update**: Explicit layout update request

## Performance Considerations

### Zone Optimization

- **Lazy Initialization**: Zones created only when needed
- **Efficient Positioning**: Optimized coordinate calculations
- **Batch Updates**: Multiple zone changes processed together
- **Caching**: Zone dimensions and positions cached

### Memory Management

- **Zone Cleanup**: Zones properly destroyed when node is removed
- **Reference Management**: Avoiding circular references
- **Event Cleanup**: Zone event listeners properly removed

## Integration with Node Types

### Container Nodes

All container node types integrate with the zone system:

- **LaneNode**: Uses zone system for vertical stacking
- **ColumnsNode**: Uses zone system for horizontal row layout
- **AdapterNode**: Uses zone system for component positioning
- **FoundationNode**: Uses zone system for role-based layout
- **MartNode**: Uses zone system for role-based layout
- **GroupNode**: Uses zone system for dynamic positioning

### Non-Container Nodes

Basic node types don't use the zone system:

- **RectangularNode**: No zone system (leaf node)
- **CircleNode**: No zone system (leaf node)

## Configuration

### Zone Settings

```javascript
const zoneSettings = {
  // Header zone configuration
  header: {
    height: 'auto', // auto or fixed height
    minHeight: 10, // minimum height in pixels
    padding: { left: 4, right: 4, top: 2, bottom: 2 },
    textOverflow: 'ellipsis', // text overflow handling
    showControls: true, // show zoom/collapse controls
  },

  // Margin configuration
  margins: {
    top: 4, // space from header bottom
    right: 8, // space from right edge
    bottom: 8, // space from bottom edge
    left: 8, // space from left edge
  },

  // Inner container configuration
  innerContainer: {
    layoutAlgorithm: 'default', // default or custom
    childSpacing: { horizontal: 20, vertical: 10 },
    childAlignment: 'center', // center, left, right, top, bottom
  },
};
```

### Zone Styling

```css
/* Container zone styling */
.container-zone {
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
}

/* Header zone styling */
.header-zone {
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  padding: 4px 8px;
}

/* Inner container zone styling */
.inner-container-zone {
  background: transparent;
  position: relative;
}
```

## Error Handling

### Zone Errors

- **Creation Failures**: Graceful handling of zone creation errors
- **Sizing Errors**: Fallback sizing when calculations fail
- **Positioning Errors**: Fallback positioning for layout failures
- **Child Integration Errors**: Error recovery for child positioning

### Recovery Mechanisms

- **Fallback Layout**: Default layout when custom algorithms fail
- **Zone Recreation**: Zone recreation on critical failures
- **Error Logging**: Comprehensive error reporting
- **State Recovery**: Automatic state restoration

## Testing

### Zone Testing

- **Zone Creation**: Proper zone initialization
- **Zone Sizing**: Correct size calculations
- **Zone Positioning**: Accurate positioning logic
- **Child Integration**: Proper child positioning within zones

### Integration Testing

- **Node Integration**: Zone system with different node types
- **Layout Algorithms**: Custom layout algorithm testing
- **Performance**: Large numbers of zones and children
- **Edge Cases**: Boundary conditions and error scenarios

## Navigation

- **[Documentation Overview](README.md)** - Back to main documentation
- **[BaseContainerNode](nodes/base-container-node.md)** - Container node base class
- **[LaneNode](nodes/lane-node.md)** - Zone system usage example
- **[ColumnsNode](nodes/columns-node.md)** - Zone system usage example
- **[Implementation Details](../implementation.md)** - Technical implementation
- **[Public API hooks](dashboard.md#public-api-hooks)** - Coordinate-frame contract for `getNodeBounds` / `panToBounds` (uses the same `main.container` local frame zones operate in)

## Related Classes

### Dependencies

- **ZoneManager** - Central zone coordination
- **BaseContainerNode** - Container node integration
- **LayoutManager** - Layout algorithm management
- **ConfigManager** - Configuration management

### Zone Classes

- **ContainerZone** - Outermost boundary zone
- **HeaderZone** - Title and control zone
- **MarginZone** - Spacing and margin zone
- **InnerContainerZone** - Child positioning zone

### Related Systems

- **Layout System** - Layout algorithm integration
- **Event System** - Zone interaction handling
- **Styling System** - Zone visual styling
- **Coordinate System** - Zone positioning management
