# Dashboard Settings Reference

## Overview

The Dashboard uses a comprehensive settings system managed by `ConfigManager`. Settings are deeply merged with defaults, allowing you to specify only the properties you want to override.

## Complete Settings Schema

### Root-Level Settings

```javascript
{
  settings: {
    // ============================================================
    // NEIGHBOR SELECTION
    // ============================================================
    selector: { 
      // Type: number (integer)
      // Range: 0 to unlimited (practical range: 0-10)
      // Default: 1
      // UI: Number input / Slider
      // Description: Controls how many levels of incoming edges to traverse when selecting neighbors.
      //              0 = no incoming neighbors, 1 = direct parents, 2 = parents + grandparents, etc.
      incomming: 1,
      
      // Type: number (integer)
      // Range: 0 to unlimited (practical range: 0-10)
      // Default: 1
      // UI: Number input / Slider
      // Description: Controls how many levels of outgoing edges to traverse when selecting neighbors.
      //              0 = no outgoing neighbors, 1 = direct children, 2 = children + grandchildren, etc.
      outgoing: 1
    },
    
    // ============================================================
    // DISPLAY OPTIONS
    // ============================================================
    
    // Type: boolean
    // Values: true | false
    // Default: true
    // UI: Toggle / Checkbox
    // Description: Shows or hides the bounding box around selected nodes. The bounding box is a 
    //              visual indicator that highlights the area containing all currently selected nodes.
    showBoundingBox: true,
    
    // Type: boolean
    // Values: true | false
    // Default: false
    // UI: Toggle / Checkbox
    // Description: Shows or hides a center mark indicator on the canvas. Useful for debugging 
    //              and understanding the canvas coordinate system and zoom center point.
    showCenterMark: false,
    
    // Type: boolean
    // Values: true | false
    // Default: false
    // UI: Toggle / Checkbox
    // Description: Shows or hides connection points on nodes where edges attach. Useful for 
    //              debugging edge routing and understanding how edges connect to node boundaries.
    showConnectionPoints: false,
    
    // Type: boolean
    // Values: true | false
    // Default: false
    // UI: Toggle / Checkbox
    // Description: Shows or hides the inner zone rectangles of container nodes. Inner zones 
    //              define the content area inside containers. Useful for debugging layout issues.
    showInnerZoneRect: false,
    
    // Type: boolean
    // Values: true | false
    // Default: false
    // UI: Toggle / Checkbox
    // Description: Shows or hides ghostlines for edges. Ghostlines are subtle visual guides that 
    //              help trace edge paths, especially useful for complex diagrams with many edges.
    showGhostlines: false,
    
    // ============================================================
    // ZOOM BEHAVIOR
    // ============================================================
    
    // Type: boolean
    // Values: true | false
    // Default: true
    // UI: Toggle / Checkbox
    // Description: When enabled, automatically fits all nodes into view when the diagram is first 
    //              loaded. When disabled, the diagram loads at 100% zoom at position (0,0).
    zoomToRoot: true,
    
    // ============================================================
    // STATUS & COLLAPSE BEHAVIOR
    // ============================================================
    
    // Type: boolean
    // Values: true | false
    // Default: true (flowdash-js/bundle), false (demos)
    // UI: Toggle / Checkbox
    // Description: When enabled, automatically collapses container nodes when their status changes.
    //              This helps keep the diagram clean by hiding details of nodes that change state.
    toggleCollapseOnStatusChange: true,
    
    // Type: boolean
    // Values: true | false
    // Default: true (flowdash-js/bundle), false (demos)
    // UI: Toggle / Checkbox
    // Description: When enabled, status changes cascade down to all child nodes within containers.
    //              When disabled, only the clicked node's status changes, preserving child states.
    cascadeOnStatusChange: true,
    
    // ============================================================
    // EDGE RENDERING
    // ============================================================
    
    // Type: boolean
    // Values: true | false
    // Default: false
    // UI: Toggle / Checkbox
    // Description: Controls edge path rendering style. When true, edges are drawn with smooth curves.
    //              When false, edges are drawn as straight line segments with right angles.
    curved: false,
    
    // Type: number (float)
    // Range: 0.0 to 1.0 (practical range)
    // Default: 0.1 (when curved=true), 0 (when curved=false)
    // UI: Number input / Slider
    // Description: Controls the curve intensity for curved edges. Higher values create more pronounced
    //              curves. Only applicable when curved=true. Value represents the control point offset
    //              as a fraction of the edge length.
    curveMargin: 0.1,
    
    // Type: boolean
    // Values: true | false
    // Default: true
    // UI: Toggle / Checkbox
    // Description: Master switch to show or hide all edges in the diagram. When false, only nodes
    //              are visible, which can be useful for focusing on node layout and hierarchy.
    showEdges: true,
    
    // ============================================================
    // LAYOUT
    // ============================================================
    
    // Type: object {top, right, bottom, left}
    // Each property type: number (integer)
    // Range: 0 to 100 (pixels, practical range)
    // Default: {top: 8, right: 8, bottom: 8, left: 8}
    // UI: Number inputs (4 fields) or unified margin control
    // Description: Defines the internal padding/margin around the content area within container nodes.
    //              Controls spacing between container boundaries and their child content.
    containerMargin: {
      top: 8,      // Top margin in pixels
      right: 8,    // Right margin in pixels
      bottom: 8,   // Bottom margin in pixels
      left: 8      // Left margin in pixels
    },
    
    // Type: object {horizontal, vertical}
    // Each property type: number (integer)
    // Range: 0 to 200 (pixels, practical range)
    // Default: {horizontal: 20, vertical: 10}
    // UI: Number inputs (2 fields)
    // Description: Defines the spacing between adjacent nodes in the layout algorithm.
    //              Horizontal controls left-right spacing, vertical controls top-bottom spacing.
    nodeSpacing: {
      horizontal: 20,  // Horizontal spacing between nodes (in pixels)
      vertical: 10     // Vertical spacing between nodes (in pixels)
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
    
    // ============================================================
    // MINIMAP CONFIGURATION
    // ============================================================
    minimap: {
      // Type: boolean
      // Values: true | false
      // Default: true
      // UI: Toggle / Checkbox
      // Description: Master switch to enable or disable the minimap feature entirely. When disabled,
      //              no minimap will be shown regardless of other minimap settings.
      enabled: true,
      
      // Type: string (enum)
      // Values: "hidden" | "always" | "hover"
      // Default: "always"
      // UI: Dropdown / Radio buttons
      // Description: Controls minimap visibility behavior. 
      //              - "hidden": minimap is never shown
      //              - "always": minimap is always visible
      //              - "hover": minimap appears only when hovering over its area
      mode: "always",
      
      // Type: string (enum)
      // Values: "bottom-right" | "bottom-left" | "top-right" | "top-left"
      // Default: "bottom-right"
      // UI: Dropdown / Position picker (4-quadrant selector)
      // Description: Controls the corner position where the minimap is anchored on the canvas.
      position: "bottom-right",
      
      // Type: string (enum) | object {width: number}
      // Values: "s" (180px) | "m" (240px) | "l" (400px) | {width: number}
      // Default: "m"
      // UI: Dropdown for presets + optional custom number input
      // Description: Controls the minimap dimensions. Use size tokens for standard sizes, or provide
      //              a custom object with width in pixels for custom sizing. Height is auto-calculated.
      size: "m",
      
      // Type: number (float)
      // Range: 0.0 to 1.0
      // Default: 1
      // UI: Slider / Number input
      // Description: Controls the opacity/transparency of the minimap. 1.0 is fully opaque, 0.0 is 
      //              fully transparent (invisible). Useful for reducing visual clutter.
      opacity: 1,
      
      // Type: boolean
      // Values: true | false
      // Default: false
      // UI: Toggle / Checkbox
      // Description: Controls the initial state of the minimap. When true, minimap starts in collapsed
      //              state (showing only the collapsed icon). User can click to expand.
      collapsed: false,
      
      // Type: boolean
      // Values: true | false
      // Default: false
      // UI: Toggle / Checkbox
      // Description: When enabled, the minimap remains visible and cannot be auto-hidden (if mode="hover").
      //              Acts as a "lock open" feature to keep the minimap permanently visible.
      pinned: false,
      
      collapsedIcon: {
        // Type: string (enum)
        // Values: "bottom-right" | "bottom-left" | "top-right" | "top-left"
        // Default: "bottom-right"
        // UI: Dropdown / Position picker (4-quadrant selector)
        // Description: Controls the corner position of the collapsed minimap icon when minimap is collapsed.
        //              Typically matches the main minimap position for consistent placement.
        position: "bottom-right"
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
