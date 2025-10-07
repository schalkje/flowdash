# Dashboard Settings Reference

## Overview

The Dashboard uses a comprehensive settings system managed by `ConfigManager`. Settings are deeply merged with defaults, allowing you to specify only the properties you want to override.

## Complete Settings Schema

### Root-Level Settings

```javascript
{
  settings: {
    // Neighbor Selection
    selector: { 
      incomming: 1,    // Depth of incoming edge traversal (default: 1)
      outgoing: 1      // Depth of outgoing edge traversal (default: 1)
    },
    
    // Display Options
    showBoundingBox: true,              // Show selection bounding box (default: true)
    showCenterMark: false,              // Show center mark on canvas (default: false)
    showConnectionPoints: false,        // Show connection points on nodes (default: false)
    showInnerZoneRect: false,           // Show inner zone rectangles (default: false)
    showGhostlines: false,              // Show edge ghostlines (default: false)
    
    // Zoom Behavior
    zoomToRoot: true,                   // Auto-fit all nodes on load (default: true)
    
    // Status & Collapse Behavior
    toggleCollapseOnStatusChange: true, // Auto-collapse nodes on status change (default: true for flowdash-js/bundle, false for demos)
    cascadeOnStatusChange: true,        // Cascade status changes to children (default: true for flowdash-js/bundle, false for demos)
    
    // Edge Rendering
    curved: false,                      // Use curved edges instead of straight (default: false)
    curveMargin: 0.1,                   // Curve margin for curved edges (default: 0.1 if curved, 0 otherwise)
    showEdges: true,                    // Show edges (default: true)
    
    // Layout
    containerMargin: {                  // Margin around container content
      top: 8,
      right: 8,
      bottom: 8,
      left: 8
    },
    nodeSpacing: {                      // Spacing between nodes
      horizontal: 20,
      vertical: 10
    },
    divRatio: null,                     // Aspect ratio (auto-calculated from container if not specified)
    
    // Styling (optional overrides)
    containerFill: null,                // Container fill color (null = use theme)
    containerStroke: null,              // Container stroke color (null = use theme)
    containerStrokeWidth: null,         // Container stroke width (null = use theme)
    fontFamily: null,                   // Font family (null = use theme)
    fontSize: null,                     // Font size (null = use theme)
    
    // Debug Options
    isDebug: false,                     // Enable debug visualizations (default: false)
    
    // Minimap Configuration
    minimap: {
      enabled: true,                    // Enable minimap (default: true)
      mode: "always",                   // Display mode: "hidden" | "always" | "hover" (default: "always")
      position: "bottom-right",         // Position: "bottom-right" | "bottom-left" | "top-right" | "top-left"
      size: "m",                        // Size token: "s" (180px) | "m" (240px) | "l" (400px) or {width: number}
      opacity: 1,                       // Minimap opacity (default: 1)
      collapsed: false,                 // Start collapsed (default: false)
      pinned: false,                    // Pin minimap open (default: false)
      
      collapsedIcon: {
        position: "bottom-right"        // Collapsed icon position
      },
      
      hover: {
        showDelayMs: 120,               // Delay before showing on hover (ms)
        hideDelayMs: 300,               // Delay before hiding after hover out (ms)
        zoomFitThreshold: 1.0           // Zoom threshold for auto-hiding
      },
      
      touch: {
        autoHideAfterMs: 2500           // Auto-hide delay after touch interaction (ms)
      },
      
      scaleIndicator: {
        visible: true,                  // Show scale indicator (default: true)
        type: "percent",                // Display type: "percent" | "ratio"
        decimals: 0                     // Decimal places to show
      },
      
      icons: {
        zoomIn: "plus",
        zoomOut: "minus",
        resetView: "target",
        mode: "eye",
        collapse: "triangle-down",
        expand: "minimap"
      },
      
      persistence: {
        persistCollapsedState: true,    // Remember collapsed state in localStorage
        storageKey: "flowdash:minimap:collapsed"
      },
      
      theme: {}                         // Theme overrides for minimap
    },
    
    // Zoom Configuration
    zoom: {
      scaleExtent: [0.1, 40],           // Min and max zoom levels
      epsilonPct: 0.005,                // Epsilon for zoom calculations (0.5%)
      minTargetBBoxPx: {                // Minimum target bounding box in pixels
        w: 24,
        h: 24
      }
    }
  },
  
  nodes: [...],                         // Array of node definitions
  edges: [...]                          // Array of edge definitions
}
```

## Setting Details

### Neighbor Selection

**`selector`** - Controls how many levels of connected nodes are included when selecting a node.

```javascript
selector: { 
  incomming: 1,  // Include 1 level of incoming edges
  outgoing: 1    // Include 1 level of outgoing edges
}
```

- `0` = only the selected node
- `1` = selected node plus immediate neighbors
- `2+` = multiple levels of traversal

### Display Options

**`showBoundingBox`** - Shows a dashed rectangle around selected nodes/neighborhood.

**`showCenterMark`** - Shows a crosshair at the canvas center (useful for debugging).

**`showConnectionPoints`** - Shows circles at edge connection points on nodes.

**`showInnerZoneRect`** - Shows the inner zone rectangles for container nodes (debug feature).

**`showGhostlines`** - Shows semi-transparent ghost lines for edges (useful for complex diagrams).

### Zoom Behavior

**`zoomToRoot`** - When `true`, the dashboard automatically fits all nodes in view on initial load.

### Status & Collapse Behavior

**`toggleCollapseOnStatusChange`** - When `true`, container nodes automatically collapse/expand based on their status:

- Containers with `Error` status auto-expand to show children
- Containers with other statuses may auto-collapse based on logic

**`cascadeOnStatusChange`** - When `true`, status changes cascade from parent to children automatically.

**Default Values:**

- `flowdash-js.html` and `flowdash-bundle.html`: Both default to `true`
- Demo pages (e.g., `01_basic`, `02_click-handlers`): Both default to `false`

### Edge Rendering

**`curved`** - Use curved edges instead of straight lines. Provides better visual flow for complex diagrams.

**`curveMargin`** - Margin applied to curved edges (default: 0.1 if curved, 0 otherwise).

**`showEdges`** - Control edge visibility globally.

### Layout Configuration

**`containerMargin`** - Padding inside container nodes around their content:

```javascript
containerMargin: { top: 8, right: 8, bottom: 8, left: 8 }
```

**`nodeSpacing`** - Space between nodes in layouts:

```javascript
nodeSpacing: { horizontal: 20, vertical: 10 }
```

**`divRatio`** - Aspect ratio of the container. Usually auto-calculated from the container dimensions.

### Styling Overrides

These settings allow you to override theme-based styling:

- **`containerFill`** - Override container background color
- **`containerStroke`** - Override container border color
- **`containerStrokeWidth`** - Override container border width
- **`fontFamily`** - Override font family
- **`fontSize`** - Override font size

When set to `null` (default), theme values are used.

### Debug Options

**`isDebug`** - Enables various debug visualizations:

- Shows additional layout information
- Displays internal calculation details
- Useful for development and troubleshooting

### Minimap Configuration

The minimap provides a bird's-eye view with synchronized navigation. See [Minimap Documentation](minimap.md) for detailed information.

**Key Minimap Settings:**

- **`enabled`** - Turn minimap on/off
- **`mode`** - `"always"` (always visible), `"hover"` (show on hover), `"hidden"` (collapsed icon only)
- **`position`** - Where to place the minimap on screen
- **`size`** - Size preset or custom width in pixels
- **`collapsed`** - Start in collapsed state
- **`pinned`** - Keep minimap open even when not hovering

### Zoom Configuration

**`scaleExtent`** - Minimum and maximum zoom levels `[min, max]`:

```javascript
zoom: { scaleExtent: [0.1, 40] }  // 10% to 4000%
```

**`epsilonPct`** - Precision threshold for zoom calculations (0.005 = 0.5%).

**`minTargetBBoxPx`** - Minimum bounding box size in pixels to prevent over-zooming on tiny nodes.

## Usage Examples

### Minimal Configuration

```javascript
{
  settings: {
    zoomToRoot: true
  },
  nodes: [...],
  edges: [...]
}
```
All other settings use defaults from `ConfigManager`.

### Typical Production Configuration

```javascript
{
  settings: {
    selector: { incomming: 2, outgoing: 2 },
    showBoundingBox: true,
    zoomToRoot: true,
    toggleCollapseOnStatusChange: true,
    cascadeOnStatusChange: true,
    curved: true,
    minimap: {
      enabled: true,
      mode: "hover",
      size: "m",
      position: "bottom-right"
    }
  },
  nodes: [...],
  edges: [...]
}
```

### Debug Configuration

```javascript
{
  settings: {
    isDebug: true,
    showCenterMark: true,
    showConnectionPoints: true,
    showInnerZoneRect: true,
    showGhostlines: true,
    showBoundingBox: true
  },
  nodes: [...],
  edges: [...]
}
```

### Demo/Test Configuration

```javascript
{
  settings: {
    zoomToRoot: false,
    toggleCollapseOnStatusChange: false,
    cascadeOnStatusChange: false,
    curved: false,
    minimap: {
      mode: "hidden"
    }
  },
  nodes: [...],
  edges: [...]
}
```

## Configuration Manager

The `ConfigManager` class handles all settings operations:

### Methods

**`ConfigManager.mergeWithDefaults(userSettings, isDemoPage)`**

- Deeply merges user settings with defaults
- Use `isDemoPage = true` for demo/test pages (different defaults for collapse behavior)

**`ConfigManager.validateSettings(settings)`**

- Validates settings for common errors
- Returns array of error messages

**`ConfigManager.getDefaultContainerMargin()`**

- Returns default container margin object

**`ConfigManager.getDefaultNodeSpacing()`**

- Returns default node spacing object

### Default Settings

Two sets of defaults are available:

1. **`DEFAULT_SETTINGS`** - For production use (flowdash-js, flowdash-bundle)
   - `toggleCollapseOnStatusChange: true`
   - `cascadeOnStatusChange: true`

2. **`DEMO_DEFAULT_SETTINGS`** - For demos and examples
   - `toggleCollapseOnStatusChange: false`
   - `cascadeOnStatusChange: false`

## Migration Guide

### From Undocumented to Documented Settings

If your files have settings not in the original documentation:

**Already Correct:**

- ✅ `curved` - Documented, works as expected
- ✅ `showBoundingBox` - Documented, works as expected
- ✅ `showCenterMark` - Documented, works as expected
- ✅ `showGhostlines` - Documented, works as expected
- ✅ `showConnectionPoints` - Documented, works as expected
- ✅ `toggleCollapseOnStatusChange` - Documented, works as expected

**Newly Documented:**

- ✅ `cascadeOnStatusChange` - Now documented
- ✅ `showInnerZoneRect` - Now documented
- ✅ `showEdges` - Now documented
- ✅ `curveMargin` - Now documented
- ✅ `containerMargin` - Now documented
- ✅ `nodeSpacing` - Now documented
- ✅ `minimap` (all sub-settings) - Now documented
- ✅ `zoom` (all sub-settings) - Now documented
- ✅ `isDebug` - Now documented

All your existing settings are valid and will continue to work!

## Validation

To validate your settings:

```javascript
import { ConfigManager } from './js/configManager.js';

const errors = ConfigManager.validateSettings(yourSettings);
if (errors.length > 0) {
  console.error('Settings validation errors:', errors);
}
```

Common validation errors:

- Negative values for `selector`, `containerMargin`, or `nodeSpacing`
- Invalid enum values for `minimap.mode` or `minimap.position`
- Missing required nested objects

## See Also

- [Dashboard Overview](dashboard.md) - Main dashboard features and API
- [Minimap Documentation](minimap.md) - Detailed minimap configuration
- [Configuration Manager](../js/configManager.js) - Source code with defaults
