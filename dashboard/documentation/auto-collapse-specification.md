# Auto-Collapse Specification

## Overview

The auto-collapse feature (`toggleCollapseOnStatusChange`) automatically collapses or expands container nodes based on their status. This provides a dynamic, status-driven view where successful/completed nodes are minimized while problem nodes remain visible for immediate attention.

## Configuration

### Setting: `toggleCollapseOnStatusChange`

**Type:** `boolean`  
**Default:** 
- `true` for production (`flowdash-js.html`, `flowdash-bundle.html`)
- `false` for demo pages

**Location in settings:**
```javascript
{
  settings: {
    toggleCollapseOnStatusChange: true
  }
}
```

**Related Settings:**
- `cascadeOnStatusChange`: When `true`, status changes propagate to child nodes
- `zoomToRoot`: Controls initial zoom behavior
- `showBoundingBox`: Shows selection bounding box

## Behavior Specification

### Core Logic

When `toggleCollapseOnStatusChange` is enabled:

1. **Container nodes automatically collapse** when they have one of these "success" statuses:
   - `READY` - Node is ready to process
   - `DISABLED` - Node is intentionally disabled
   - `UPDATED` - Node has been successfully updated
   - `SKIPPED` - Node was skipped (expected behavior)

2. **Container nodes automatically expand** when they have any other status, including:
   - `ERROR` - Node encountered an error
   - `WARNING` - Node has a warning
   - `DELAYED` - Node processing is delayed
   - `UPDATING` - Node is currently being updated
   - `UNKNOWN` - Node status is unknown
   - `UNDETERMINED` - Node status hasn't been determined yet

### Status Definitions

The following statuses are defined in `NodeStatus` (from `nodeBase.js`):

```javascript
export const NodeStatus = Object.freeze({
  UNDETERMINED: 'Undetermined',  // Status not yet determined
  UNKNOWN: 'Unknown',            // Status is unknown
  DISABLED: 'Disabled',          // Intentionally disabled
  // Process states (success/normal)
  READY: 'Ready',                // Ready to process → COLLAPSE
  UPDATING: 'Updating',          // Currently updating
  UPDATED: 'Updated',            // Successfully updated → COLLAPSE
  SKIPPED: 'Skipped',            // Skipped as expected → COLLAPSE
  // Error states (problems)
  DELAYED: 'Delayed',            // Processing delayed → EXPAND
  WARNING: 'Warning',            // Has warnings → EXPAND
  ERROR: 'Error'                 // Has errors → EXPAND
});
```

### Collapse Decision Matrix

| Status | Auto-Collapse | Rationale |
|--------|---------------|-----------|
| `READY` | ✅ Yes | Success state - no problems to show |
| `DISABLED` | ✅ Yes | Intentionally inactive - no action needed |
| `UPDATED` | ✅ Yes | Successfully completed - no problems |
| `SKIPPED` | ✅ Yes | Expected skip - no problems |
| `ERROR` | ❌ No | Problem state - needs visibility |
| `WARNING` | ❌ No | Problem state - needs visibility |
| `DELAYED` | ❌ No | Problem state - needs visibility |
| `UPDATING` | ❌ No | Active state - needs visibility |
| `UNKNOWN` | ❌ No | Unclear state - keep visible for investigation |
| `UNDETERMINED` | ❌ No | Not yet evaluated - keep visible |

### Implementation Details

#### Code Location: `dashboard.js`

**Method:** `updateStatusBasedCollapse()`

```javascript
updateStatusBasedCollapse() {
  if (!this.main.root) return;

  const nodes = this.main.root.getAllNodes(false, true);
  if (!nodes || nodes.length === 0) return;

  let hasChanges = false;

  nodes.forEach((node) => {
    if (node && typeof node.status !== "undefined") {
      // Determine if this node should be collapsed based on current status
      const shouldCollapse =
        this.data.settings.toggleCollapseOnStatusChange &&
        [NodeStatus.READY, NodeStatus.DISABLED, NodeStatus.UPDATED, NodeStatus.SKIPPED].includes(node.status);

      // Only change state if it's different from current
      if (shouldCollapse !== node.collapsed) {
        hasChanges = true;
        node.collapsed = shouldCollapse;
      }
    }
  });

  // If there were changes, restart the simulation to recalculate the layout
  if (hasChanges && this.main.root) {
    this.main.root.cascadeRestartSimulation();
    this.main.root.update();
  }

  this.onMainDisplayChange();
}
```

#### Code Location: `statusManager.js`

**Method:** `StatusManager.shouldCollapseOnStatus(status, settings)`

```javascript
static shouldCollapseOnStatus(status, settings) {
  if (!settings.toggleCollapseOnStatusChange) {
    return false;
  }
  
  return [NodeStatus.READY, NodeStatus.DISABLED, NodeStatus.UPDATED, NodeStatus.SKIPPED].includes(status);
}
```

**Method:** `StatusManager.shouldContainerCollapse(childStatuses, settings)`

Determines if a container should collapse based on its children's statuses.

**Rules:**
1. **Collapse when all non-disabled children share the same collapsible status**
2. **Collapse when children are only SKIPPED and/or UPDATED** (any combination)

```javascript
static shouldContainerCollapse(childStatuses, settings) {
  if (!settings.toggleCollapseOnStatusChange || childStatuses.length === 0) {
    return false;
  }
  
  // Filter out DISABLED statuses
  const nonDisabledStatuses = childStatuses.filter(s => s !== NodeStatus.DISABLED);
  
  if (nonDisabledStatuses.length === 0) {
    return false; // All disabled, don't collapse
  }
  
  // Get unique statuses
  const uniqueStatuses = [...new Set(nonDisabledStatuses)];
  
  // Rule 1: All non-disabled children have the same status
  if (uniqueStatuses.length === 1) {
    return true;
  }
  
  // Rule 2: Children are only SKIPPED and/or UPDATED
  const onlySkippedAndUpdated = uniqueStatuses.every(s => 
    s === NodeStatus.SKIPPED || s === NodeStatus.UPDATED
  );
  
  return onlySkippedAndUpdated;
}
```

## Interaction with Other Features

### Pre-Render Optimization

When pre-render data is available (`settings.usePrerender !== false`), the auto-collapse behavior is deferred:

1. **Initial Load:** Status change handlers are suspended (`_suspendStatusChanges = true`)
2. **Pre-render Display:** Nodes are displayed with their pre-rendered positions/sizes
3. **Deferred Application:** After initial render, `applyDeferredStatusRules()` applies collapse logic
4. **Re-enable:** Status change handlers are re-enabled for subsequent updates

**Code Location:** `dashboard.js` - `applyDeferredStatusRules(root)`

```javascript
applyDeferredStatusRules(root) {
  console.log("📊 Pre-render: Applying deferred status rules");

  // Re-enable status change handlers
  this._suspendStatusChanges = false;

  // Re-enable display change callbacks
  this._suspendDisplayChange = false;

  // Determine container statuses based on children
  if (this.data.settings.cascadeOnStatusChange) {
    this.initializeChildrenStatusses(root);
  }

  // Apply collapse rules if enabled
  if (this.data.settings.toggleCollapseOnStatusChange) {
    this.applyAutoCollapse(root);
  }

  // Final layout adjustments
  this.onMainDisplayChange();
}
```

### Status Cascading

When `cascadeOnStatusChange` is enabled, container status is derived from children:

**Priority Order (highest to lowest):**
1. `ERROR`
2. `WARNING`
3. `DELAYED`
4. `UNKNOWN`
5. `UPDATING`
6. `UPDATED`
7. `SKIPPED`
8. `READY`

**Special Case:** If children have only `SKIPPED` and/or `UPDATED` statuses (any mix), the container status becomes `UPDATED`.

### Zoom Behavior

Auto-collapse interacts with zoom behavior:
- When a node collapses, `onDisplayChange()` is triggered
- The zoom manager (`ZoomManager.handleLayoutChange()`) adjusts the view to maintain context
- Double-clicking a collapsed node zooms to its bounding box

## User Experience

### Visual Feedback

1. **Collapsed nodes** show a compact representation with a collapse indicator
2. **Expanded nodes** show full content including child nodes
3. **Status colors** provide immediate visual cues (e.g., red for ERROR, green for READY)
4. **Bounding box** highlights selected node neighborhoods

### Interaction Patterns

1. **Single Click:** Selects node and its neighborhood
2. **Double Click:** Zooms to node or neighborhood bounding box
3. **Manual Toggle:** Users can manually collapse/expand nodes regardless of auto-collapse setting
4. **Status Update:** When a node's status changes, auto-collapse re-evaluates its state

## Configuration Examples

### Production Configuration (Auto-Collapse Enabled)

```javascript
{
  settings: {
    toggleCollapseOnStatusChange: true,
    cascadeOnStatusChange: true,
    zoomToRoot: true,
    showBoundingBox: true
  },
  nodes: [/* ... */],
  edges: [/* ... */]
}
```

**Use Case:** Production dashboards where you want to focus on problems while minimizing visual noise from successful operations.

### Demo/Testing Configuration (Auto-Collapse Disabled)

```javascript
{
  settings: {
    toggleCollapseOnStatusChange: false,
    cascadeOnStatusChange: false,
    zoomToRoot: false
  },
  nodes: [/* ... */],
  edges: [/* ... */]
}
```

**Use Case:** Demo pages, testing, or scenarios where you want full control over collapse state without automatic behavior.

### Selective Auto-Collapse

```javascript
{
  settings: {
    toggleCollapseOnStatusChange: true,  // Enable auto-collapse
    cascadeOnStatusChange: false,        // Don't cascade status changes
    zoomToRoot: true
  },
  nodes: [/* ... */],
  edges: [/* ... */]
}
```

**Use Case:** Allow auto-collapse but maintain explicit status control per node (no cascading).

## API Reference

### Dashboard Methods

#### `updateStatusBasedCollapse()`

Re-evaluates and applies status-based collapse logic to all nodes.

**When to Call:**
- After changing `toggleCollapseOnStatusChange` setting
- After bulk status updates
- When manually synchronizing collapse states with statuses

**Example:**
```javascript
// Change setting
dashboard.data.settings.toggleCollapseOnStatusChange = true;

// Re-evaluate all nodes
dashboard.updateStatusBasedCollapse();
```

#### `applyDeferredStatusRules(root)`

Applies status rules after pre-render initialization (internal method).

**Called automatically during:** Pre-render initialization sequence

### StatusManager Methods

#### `StatusManager.shouldCollapseOnStatus(status, settings)`

Determines if a single status should trigger collapse.

**Parameters:**
- `status` (string): Node status value
- `settings` (object): Dashboard settings

**Returns:** `boolean` - `true` if node should collapse

**Example:**
```javascript
const shouldCollapse = StatusManager.shouldCollapseOnStatus(
  NodeStatus.READY, 
  dashboard.data.settings
);
// Returns: true (READY is a collapsible status)
```

#### `StatusManager.shouldContainerCollapse(childStatuses, settings)`

Determines if a container should collapse based on its children's statuses.

**Parameters:**
- `childStatuses` (array): Array of child node statuses
- `settings` (object): Dashboard settings

**Returns:** `boolean` - `true` if container should collapse

**Example:**
```javascript
const childStatuses = [NodeStatus.UPDATED, NodeStatus.SKIPPED];
const shouldCollapse = StatusManager.shouldContainerCollapse(
  childStatuses,
  dashboard.data.settings
);
// Returns: true (only UPDATED/SKIPPED mix)
```

### Node Properties

#### `node.collapsed` (getter/setter)

Controls the collapsed state of a container node.

**Type:** `boolean`

**Example:**
```javascript
// Get current state
const isCollapsed = node.collapsed;

// Set state (triggers expand/collapse methods)
node.collapsed = true;  // Collapse
node.collapsed = false; // Expand
```

**Side Effects:**
- Setting this property triggers `collapse()` or `expand()` methods
- Calls `onDisplayChange()` callback
- Updates layout and zoom behavior

#### `node.status` (getter/setter)

Controls the status of a node.

**Type:** `string` (one of `NodeStatus` enum values)

**Example:**
```javascript
// Get current status
const currentStatus = node.status;

// Set status
node.status = NodeStatus.ERROR;

// If toggleCollapseOnStatusChange is enabled, this will:
// 1. Update the status
// 2. Evaluate if collapse state should change
// 3. Trigger layout updates if needed
```

## Debugging

### Enable Debug Logging

The auto-collapse feature includes console logging for debugging:

```javascript
console.log('[shouldContainerCollapse] Rule 1: All same status ->', status, '-> COLLAPSE');
console.log('[shouldContainerCollapse] Rule 2: Only SKIPPED/UPDATED ->', statuses, '-> COLLAPSE');
console.log('[shouldContainerCollapse] Mixed statuses ->', statuses, '-> STAY EXPANDED');
console.log('[determineAggregateStatus] Priority match:', statuses, '->', status);
```

### Common Issues

#### Issue: Nodes not collapsing on status change

**Check:**
1. Is `toggleCollapseOnStatusChange` enabled?
2. Is the status one of the collapsible statuses (READY, DISABLED, UPDATED, SKIPPED)?
3. Is the node a container (has children)?

#### Issue: Container expands when it should collapse

**Check:**
1. Review child statuses - are they all collapsible?
2. Check if any child has ERROR, WARNING, or other non-collapsible status
3. Verify `cascadeOnStatusChange` is configured as expected

#### Issue: Auto-collapse not working after data update

**Solution:** Call `updateStatusBasedCollapse()` after updating data:
```javascript
dashboard.setData(newData).then(() => {
  dashboard.updateStatusBasedCollapse();
});
```

## Performance Considerations

### Initial Load

- Pre-render optimization defers auto-collapse until after initial display
- This improves perceived load time by ~5-10%
- Status evaluation happens asynchronously in `requestAnimationFrame`

### Runtime Updates

- Status changes trigger incremental collapse/expand operations
- Only affected nodes are re-evaluated
- Layout recalculation is batched with `onMainDisplayChange()`

### Large Dashboards

For dashboards with 100+ nodes:
- Auto-collapse reduces visible nodes, improving rendering performance
- Collapsed nodes have simplified DOM structure
- Fewer visible edges means faster edge routing

## Testing

### Test Scenarios

1. **Collapsible Status Assignment**
   - Set node status to READY → Verify collapse
   - Set node status to ERROR → Verify expand

2. **Container Status Derivation**
   - All children READY → Container READY → Verify collapse
   - One child ERROR, rest READY → Container ERROR → Verify expand

3. **Mixed SKIPPED/UPDATED**
   - Children with SKIPPED and UPDATED → Container UPDATED → Verify collapse

4. **Manual Override**
   - Auto-collapse set → Manually expand node → Status change → Verify auto-collapse re-applies

5. **Toggle Setting**
   - Disable `toggleCollapseOnStatusChange` → Change statuses → Verify no auto-collapse
   - Re-enable setting → Call `updateStatusBasedCollapse()` → Verify collapse applied

### Test Files

Relevant test files in the codebase:
- `tests/nodes.spec.js` - Node behavior tests
- `tests/dashboard.spec.js` - Dashboard-level tests
- Demo pages in `11_dashboard/` with toggle controls

## References

### Related Documentation

- [Settings Reference](settings.md) - Complete settings documentation
- [Pre-Render Optimization](pre-render.md) - Pre-render behavior details
- [Base Node Documentation](nodes/base-node.md) - Node status management
- [Base Container Node](nodes/base-container-node.md) - Container collapse behavior
- [Auto-Zoom Behavior](auto-zoom-behavior.md) - Zoom interaction with collapse

### Source Files

- `dashboard/js/dashboard.js` - Main dashboard class with `updateStatusBasedCollapse()`
- `dashboard/js/statusManager.js` - Status calculation and collapse logic
- `dashboard/js/nodeBase.js` - Base node class with status definitions
- `dashboard/js/configManager.js` - Configuration management and defaults
- `dashboard/js/demoSettings.js` - Demo UI for toggling settings

## Version History

- **v2.0** - Added pre-render optimization with deferred auto-collapse
- **v1.5** - Added `shouldContainerCollapse()` with SKIPPED/UPDATED mixed rule
- **v1.0** - Initial implementation of `toggleCollapseOnStatusChange`
