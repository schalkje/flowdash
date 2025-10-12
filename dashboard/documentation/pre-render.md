# Pre-Render Feature Specification

## Overview

Pre-rendering is a **performance optimization strategy** that dramatically improves initial dashboard load times by storing pre-calculated node positions, sizes, and edge paths directly in the dashboard JSON. This allows the dashboard to skip expensive layout calculations during the initial render.

## Problem Statement

Current dashboard loading for large dashboards (800+ nodes) takes ~40 seconds due to:
- Synchronous DOM manipulation without batching (40% of time)
- Cascading layout calculations through deeply nested containers (25% of time)
- Status-based auto-collapse triggering during initialization (5% of time)
- Force simulations and deterministic layout algorithms running on every load

## Solution: Two-Phase Rendering with Pre-Calculated Positions

### Phase 1: Pre-Render Generation (One-Time)
1. Load dashboard with ALL nodes forced to expanded state
2. Bypass status-based auto-collapse (`toggleCollapseOnStatusChange = false`)
3. Let all layout algorithms complete and stabilize
4. Extract final positions, sizes, and edge paths
5. Embed this data directly into the dashboard JSON

### Phase 2: Fast-Path Loading (Every Time)
1. Check if pre-render data exists in nodes/edges AND settings flag is enabled
2. If yes: Use pre-calculated positions for instant initial render
3. Skip layout calculations entirely for initial draw
4. **After** initial render completes: Apply status rules and collapse states
5. If no: Fall back to standard initialization flow

## Expected Performance Impact

**With pre-render data (estimated):**
- Current load time: ~40 seconds (885 nodes)
- Skip layout stabilization: Save ~10 seconds (25%)
- Skip cascading layout calculations: Save ~5 seconds (12%)
- Faster initial DOM paint: Save ~3 seconds (7%)
- **Estimated with pre-render alone: ~22 seconds (45% improvement)**

**Combined with Phase 2 DOM batching optimizations:**
- **Total estimated load time: ~10-12 seconds (70-75% improvement)** ✅

## Data Structure

Pre-render data is embedded directly in the dashboard JSON within each node and edge:

```json
{
  "nodes": [
    {
      "id": "node-1",
      "label": "Example Node",
      "type": "lane",
      "prerender": {
        "x": 100.5,
        "y": 200.25,
        "width": 334,
        "height": 74
      },
      "children": [...]
    }
  ],
  "edges": [
    {
      "source": "node-1",
      "target": "node-2",
      "prerender": {
        "path": "M100,200 L300,250 L500,300",
        "sourcePoint": { "x": 100, "y": 200 },
        "targetPoint": { "x": 500, "y": 300 }
      }
    }
  ],
  "settings": {
    "usePrerender": true,  // Default: true
    "prerenderMetadata": {
      "version": "1.0",
      "generated": "2025-10-11T10:30:00Z",
      "generatedBy": "flowdash-prerender-generator",
      "nodeCount": 885,
      "expandedState": true,
      "statusRulesApplied": false
    }
  }
}
```

### Node Pre-Render Data

Each node can contain a `prerender` object with:
- `x`: Final x-coordinate (center point)
- `y`: Final y-coordinate (center point)
- `width`: Final computed width
- `height`: Final computed height

### Edge Pre-Render Data

Each edge can contain a `prerender` object with:
- `path`: SVG path string for the edge
- `sourcePoint`: Connection point on source node `{ x, y }`
- `targetPoint`: Connection point on target node `{ x, y }`

### Settings

- `usePrerender` (boolean, default: `true`): Enable/disable pre-render usage
- `prerenderMetadata`: Metadata about pre-render generation (optional)

## Implementation Components

### 1. Pre-Render Generator Tool

**File:** `dashboard/prerender-generator.html`

A standalone HTML page that:
- ✅ Loads a dashboard JSON file (via file picker or drag-drop)
- ✅ Initializes dashboard with pre-render mode:
  - Forces all nodes to expanded state
  - Disables status-based auto-collapse
  - Disables initial zoom to root
- ✅ Waits for complete layout stabilization
- ✅ Extracts positions and sizes from all nodes
- ✅ Extracts edge paths from all edges
- ✅ Generates enhanced JSON with embedded pre-render data
- ✅ Provides download button for enhanced JSON
- ✅ Shows before/after file size comparison
- ✅ Displays generation statistics

**UI Features:**
- File upload area (drag-drop or click)
- Progress indicator during generation
- Preview of pre-rendered dashboard
- Statistics display (node count, generation time)
- Download button for enhanced JSON
- Clear/reset button

### 2. Dashboard Loading Modifications

**Files to modify:**
- `dashboard/js/dashboard.js` - Add pre-render detection and fast-path loading
- `dashboard/js/node.js` - Add pre-render position application
- `dashboard/js/nodeBase.js` - Support pre-render coordinates
- `dashboard/js/nodeBaseContainer.js` - Skip layout when pre-render available
- `dashboard/js/edge.js` - Support pre-render paths

**Key functions to add/modify:**

#### `dashboard.js`
```javascript
// Check if pre-render data is available and enabled
hasPrerenderData(dashboardData) {
  const settingsUsePrerender = dashboardData.settings?.usePrerender !== false;
  const hasNodePrerender = dashboardData.nodes?.some(n => n.prerender);
  return settingsUsePrerender && hasNodePrerender;
}

// Initialize with pre-render fast-path
initializeWithPrerender(mainDivSelector) {
  // Create dashboard structure
  // Apply pre-render positions immediately
  // Skip layout calculations
  // Render nodes at pre-calculated positions
  // THEN apply status rules in second pass
}
```

#### `nodeBase.js`
```javascript
// Apply pre-render position if available
applyPrerenderPosition() {
  if (this.data.prerender) {
    this.x = this.data.prerender.x;
    this.y = this.data.prerender.y;
    this.data.width = this.data.prerender.width;
    this.data.height = this.data.prerender.height;
    return true;
  }
  return false;
}
```

#### `nodeBaseContainer.js`
```javascript
// Skip layout calculations if pre-render available
updateChildren() {
  if (this.hasPrerenderData()) {
    // Apply pre-render positions to children
    this.applyPrerenderToChildren();
    return; // Skip layout algorithm
  }
  // Standard layout logic...
}
```

### 3. Two-Pass Rendering Flow

#### First Pass (Fast Render)
```javascript
// In dashboard.initialize()
if (this.hasPrerenderData(this.data)) {
  // Suspend status change handlers
  this._suspendStatusChanges = true;
  
  // Create nodes with pre-render positions
  this.main.root = this.createDashboardWithPrerender(this.data, this.main.container);
  
  // Apply pre-render positions immediately
  this.applyPrerenderPositions(this.main.root);
  
  // Initial render complete - schedule second pass
  requestAnimationFrame(() => this.applyStatusRules());
} else {
  // Standard initialization flow
  this.main.root = this.createDashboard(this.data, this.main.container);
}
```

#### Second Pass (Status Application)
```javascript
applyStatusRules() {
  // Re-enable status change handlers
  this._suspendStatusChanges = false;
  
  // Determine container statuses based on children
  this.initializeChildrenStatusses(this.main.root);
  
  // Apply collapse rules if enabled
  if (this.settings.toggleCollapseOnStatusChange) {
    this.applyAutoCollapse(this.main.root);
  }
  
  // Final layout adjustments
  this.onMainDisplayChange();
}
```

## Settings Configuration

Add to `configManager.js`:

```javascript
export const DEFAULT_SETTINGS = {
  // ... existing settings ...
  usePrerender: true, // Enable pre-render if data available
  prerenderMetadata: null, // Optional metadata about pre-render generation
};
```

## Pre-Render Generator Workflow

### User Workflow
1. Open `prerender-generator.html` in browser
2. Load dashboard JSON file (drag-drop or file picker)
3. Click "Generate Pre-Render Data"
4. Wait for generation to complete (progress shown)
5. Review statistics and preview
6. Click "Download Enhanced JSON"
7. Save file (e.g., `dwh-6.fixed.prerender.json`)
8. Use enhanced JSON in production

### Generation Process

The pre-render generation is now available as a public API function:

```javascript
import { generatePrerenderData } from './js/dashboard.js';

// Generate pre-render data for a dashboard
const enhancedDashboardData = await generatePrerenderData(
  originalDashboardData,
  '#container-selector' // optional, defaults to '#prerender-temp'
);

// The enhanced data includes:
// - All nodes with prerender: { x, y, width, height }
// - All edges with prerender: { path }
// - settings.usePrerender: true
// - settings.prerenderMetadata: { version, generated, nodeCount, etc. }
```

**What it does:**
1. Creates a temporary hidden dashboard instance
2. Forces all nodes to expanded state (bypasses status-based collapse)
3. Renders and waits for layout stabilization (2 seconds)
4. Extracts final positions (x, y, width, height) from all nodes
5. Extracts SVG paths from all edges
6. Cleans up unnecessary properties (width/height at root level, default layout values)
7. Returns enhanced dashboard data with embedded pre-render information

**Data cleanup:**
- Moves `width` and `height` into `prerender` object (not at node root)
- Removes `expandedSize` (internal property)
- Removes default `layout.minimumSize` when all values are defaults
- Removes empty `layout` objects

## Regeneration Strategy

When nodes are added, removed, or modified:
1. Load the modified dashboard
2. Run pre-render generator again
3. Generate new pre-render data
4. Save updated JSON with fresh pre-render data

**Note:** Pre-render data is regenerated completely each time - no incremental updates.

## Testing Strategy

### Generator Testing
1. Test with small dashboard (dwh-1.json, 4 nodes)
2. Test with medium dashboard (dwh-5.json, 21 nodes)
3. Test with large dashboard (dwh-6.fixed.json, 885 nodes)
4. Verify all node positions are captured
5. Verify all edge paths are captured
6. Verify JSON structure is valid

### Loading Testing
1. Load pre-rendered dashboard - verify fast render
2. Load non-pre-rendered dashboard - verify standard flow
3. Disable pre-render via settings - verify fallback works
4. Test status application in second pass
5. Test collapse/expand after initial render
6. Compare visual output (pre-render vs standard should be identical after status application)

### Performance Testing
1. Measure load time with pre-render vs without
2. Verify expected ~45% improvement on large dashboards
3. Measure time for status application (second pass)
4. Test combined with DOM batching optimizations

## Implementation Plan

### Phase 1: Generator Tool (Week 1)
- [ ] Create `prerender-generator.html`
- [ ] Implement file loading UI
- [ ] Implement pre-render extraction logic
- [ ] Implement JSON generation
- [ ] Implement download functionality
- [ ] Test with sample dashboards

### Phase 2: Dashboard Loading (Week 1-2)
- [ ] Add `hasPrerenderData()` detection
- [ ] Implement `applyPrerenderPosition()` in BaseNode
- [ ] Modify `updateChildren()` to skip layout when pre-render available
- [ ] Implement two-pass rendering flow
- [ ] Add settings support
- [ ] Test fast-path loading

### Phase 3: Status Application (Week 2)
- [ ] Implement deferred status evaluation
- [ ] Implement second-pass status application
- [ ] Test auto-collapse after initial render
- [ ] Verify visual consistency

### Phase 4: Testing & Documentation (Week 2)
- [ ] Comprehensive testing
- [ ] Performance benchmarking
- [ ] User documentation
- [ ] Developer documentation

## Success Criteria

✅ Generator tool successfully creates pre-render data for all dashboard types  
✅ Pre-rendered dashboards load 40-50% faster than standard flow  
✅ Visual output is identical after status rules applied  
✅ Settings flag properly controls pre-render usage  
✅ Falls back gracefully when pre-render data missing or disabled  
✅ Combined with DOM batching: achieve 70-75% total improvement  

## File Size Impact

Pre-render data adds approximately:
- **Per node**: ~60 bytes (`{"prerender":{"x":100.5,"y":200.25,"width":334,"height":74}}`)
- **Per edge**: ~120 bytes (path data varies by complexity)

For dwh-6.fixed.json (885 nodes, ~600 edges):
- Node pre-render data: ~53 KB
- Edge pre-render data: ~72 KB
- **Total increase: ~125 KB** (~7-10% increase for typical dashboard)

**Trade-off:** Small file size increase for massive performance gain.

## Future Enhancements

1. **Compression**: Compress pre-render data (round to 1 decimal place, use shorter keys)
2. **Partial pre-render**: Only pre-render expensive container nodes
3. **Lazy pre-render**: Generate pre-render data on first load, cache locally
4. **Server-side generation**: Generate pre-render data during deployment
5. **Incremental updates**: Support partial pre-render updates for small changes