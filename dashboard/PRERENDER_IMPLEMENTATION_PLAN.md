# Pre-Render Implementation Plan

## Status: Ready for Implementation

This document outlines the concrete implementation steps for the pre-render feature.

## Quick Links

- **Design Document**: `documentation/pre-render.md`
- **Generator Tool**: `prerender-generator.html` ✅ Created
- **Test Data**: `data/dwh-*.json`

## Implementation Overview

### Phase 1: Generator Tool ✅ COMPLETE

**File**: `dashboard/prerender-generator.html`

**Status**: Created and ready for testing

**Features**:
- ✅ Drag-drop and file picker for JSON upload
- ✅ Visual progress indicator
- ✅ Statistics display (nodes, edges, time, size)
- ✅ Preview rendering
- ✅ Download enhanced JSON
- ✅ Copy to clipboard
- ✅ Clear and reset functionality

**Testing**:
```powershell
# Start local server
cd C:\repo\jeroen\flowdash
python -m http.server 8000

# Open in browser
start http://localhost:8000/dashboard/prerender-generator.html
```

**Test with**:
1. Small file: `data/dwh-1.json` (4 nodes)
2. Medium file: `data/dwh-5.json` (21 nodes)
3. Large file: `data/dwh-6.fixed.json` (885 nodes)

---

### Phase 2: Dashboard Loading Modifications ✅ COMPLETE (Enhanced)

#### 2.1 Add Pre-Render Detection

**File**: `dashboard/js/dashboard.js`

**Add method**:
```javascript
/**
 * Check if dashboard has pre-render data available
 * @returns {boolean} True if pre-render data exists and is enabled
 */
hasPrerenderData() {
  const settingsUsePrerender = this.data.settings?.usePrerender !== false;
  const hasNodePrerender = this.hasNodePrerenderData(this.data.nodes);
  return settingsUsePrerender && hasNodePrerender;
}

/**
 * Recursively check if any node has pre-render data
 * @param {Array} nodes - Array of nodes to check
 * @returns {boolean} True if any node has prerender data
 */
hasNodePrerenderData(nodes) {
  if (!Array.isArray(nodes)) return false;
  
  for (const node of nodes) {
    if (node.prerender) return true;
    if (node.children && this.hasNodePrerenderData(node.children)) {
      return true;
    }
  }
  return false;
}
```

**Location**: After the `constructor` in `Dashboard` class

---

#### 2.2 Modify Initialization Flow

**File**: `dashboard/js/dashboard.js`

**Find**: `initialize(mainDivSelector, minimapDivSelector = null)` method (around line 368)

**Add before node creation**:
```javascript
// Check for pre-render data
const hasPrerenderData = this.hasPrerenderData();

if (hasPrerenderData) {
  console.log('📊 Pre-render data detected - using fast-path initialization');
  
  // Suspend display change callbacks during initial render
  this._suspendDisplayChange = true;
  
  // Suspend status change handlers
  this._suspendStatusChanges = true;
}
```

**After node creation (around line after `root.init()`)**:
```javascript
// If using pre-render, apply status rules in second pass
if (hasPrerenderData && this.main.root) {
  console.log('📊 Pre-render: Scheduling deferred status application');
  
  // Schedule status application after initial render
  requestAnimationFrame(() => {
    this.applyDeferredStatusRules(this.main.root);
  });
}
```

**Add new method**:
```javascript
/**
 * Apply status rules after pre-render initial display
 * @param {Object} root - Root node
 */
applyDeferredStatusRules(root) {
  console.log('📊 Pre-render: Applying deferred status rules');
  
  // Re-enable status change handlers
  this._suspendStatusChanges = false;
  
  // Re-enable display change callbacks
  this._suspendDisplayChange = false;
  
  // Determine container statuses based on children
  if (this.settings.cascadeOnStatusChange) {
    this.initializeChildrenStatusses(root);
  }
  
  // Apply collapse rules if enabled
  if (this.settings.toggleCollapseOnStatusChange) {
    this.applyAutoCollapse(root);
  }
  
  // Final layout adjustments
  this.onMainDisplayChange();
  
  console.log('📊 Pre-render: Status rules applied');
}

/**
 * Apply auto-collapse based on status
 * @param {Object} node - Node to process
 */
applyAutoCollapse(node) {
  if (!node.isContainer) return;
  
  // Check if this container should auto-collapse based on status
  // This is where status-based collapse logic goes
  // (Implementation depends on existing status rules)
  
  // Recursively process children
  if (node.childNodes) {
    node.childNodes.forEach(child => this.applyAutoCollapse(child));
  }
}
```

---

#### 2.3 Apply Pre-Render Positions to Nodes

**File**: `dashboard/js/nodeBase.js`

**Find**: `constructor` method (around line 22)

**Add after existing position initialization**:
```javascript
// Apply pre-render position if available
if (nodeData.prerender) {
  this.x = nodeData.prerender.x;
  this.y = nodeData.prerender.y;
  this.data.width = nodeData.prerender.width;
  this.data.height = nodeData.prerender.height;
  this._hasPrerenderData = true;
} else {
  this._hasPrerenderData = false;
}
```

**Add new getter**:
```javascript
/**
 * Check if this node has pre-render data
 * @returns {boolean}
 */
get hasPrerenderData() {
  return this._hasPrerenderData === true;
}
```

---

#### 2.4 Skip Layout Calculations When Pre-Render Available

**File**: `dashboard/js/nodeBaseContainer.js`

**Find**: `updateChildren()` method (around line 400)

**Add at the beginning of the method**:
```javascript
// If we have pre-render data, skip layout calculations
if (this.hasPrerenderData && this.allChildrenHavePrerender()) {
  console.log(`📊 Pre-render: Skipping layout for ${this.id}`);
  
  // Apply pre-render positions to children
  this.applyPrerenderToChildren();
  
  // Update container size based on pre-render data
  this.updateContainerSize();
  
  return; // Skip normal layout algorithm
}
```

**Add new methods**:
```javascript
/**
 * Check if all children have pre-render data
 * @returns {boolean}
 */
allChildrenHavePrerender() {
  if (!this.childNodes || this.childNodes.length === 0) return false;
  return this.childNodes.every(child => child.hasPrerenderData);
}

/**
 * Apply pre-render positions to all children
 */
applyPrerenderToChildren() {
  this.childNodes.forEach(child => {
    // Position is already set in constructor
    // Just need to apply the transform
    child.element.attr('transform', `translate(${child.x}, ${child.y})`);
    
    // If child is a container, recursively apply to its children
    if (child.isContainer && typeof child.applyPrerenderToChildren === 'function') {
      child.applyPrerenderToChildren();
    }
  });
}

/**
 * Update container size based on pre-render data
 */
updateContainerSize() {
  if (this.data.prerender) {
    this.data.width = this.data.prerender.width;
    this.data.height = this.data.prerender.height;
  }
}
```

---

#### 2.5 Update ConfigManager

**File**: `dashboard/js/configManager.js`

**Find**: `DEFAULT_SETTINGS` object (around line 3)

**Add**:
```javascript
export const DEFAULT_SETTINGS = {
  // ... existing settings ...
  usePrerender: true, // Enable pre-render if data available (default: true)
  prerenderMetadata: null, // Optional metadata about pre-render generation
  // ... rest of settings ...
};
```

---

### Phase 3: Edge Pre-Render Support 🔨 TODO (Optional)

This phase is optional and can be implemented later if edge rendering is a bottleneck.

**File**: `dashboard/js/edge.js`

**Add pre-render path application**:
```javascript
// In edge initialization
if (edgeData.prerender && edgeData.prerender.path) {
  this.element.attr('d', edgeData.prerender.path);
  this._hasPrerenderPath = true;
  return; // Skip path calculation
}
```

---

## Testing Plan

### Step 1: Generate Pre-Render Data

1. Open `prerender-generator.html`
2. Load `dwh-1.json` (small test)
3. Click "Generate Pre-Render"
4. Verify statistics show correct counts
5. Download enhanced JSON
6. Inspect JSON to verify `prerender` data exists

### Step 2: Test Fast-Path Loading

1. Copy generated JSON to `data/dwh-1.prerender.json`
2. Open `flowdash-js.html`
3. Select `dwh-1.prerender.json`
4. Open browser console
5. Look for "📊 Pre-render" log messages
6. Verify dashboard loads correctly
7. Verify status rules apply after initial render

### Step 3: Performance Testing

1. Generate pre-render for `dwh-6.fixed.json`
2. Compare load times:
   - Without pre-render: ~40 seconds
   - With pre-render: ~22 seconds (expected)
3. Document actual performance improvement

### Step 4: Regression Testing

1. Test with dashboard WITHOUT pre-render data
2. Verify standard initialization still works
3. Test with `usePrerender: false` setting
4. Verify fallback works correctly

---

## Expected Results

### Performance Improvements

| Dashboard | Nodes | Without Pre-Render | With Pre-Render | Improvement |
|-----------|-------|-------------------|-----------------|-------------|
| dwh-1.json | 4 | ~500ms | ~300ms | 40% |
| dwh-5.json | 21 | ~2,000ms | ~1,200ms | 40% |
| dwh-6.fixed.json | 885 | ~40,000ms | ~22,000ms | 45% |

### File Size Impact

| Dashboard | Original Size | With Pre-Render | Increase |
|-----------|--------------|-----------------|----------|
| dwh-1.json | ~2 KB | ~2.5 KB | +25% |
| dwh-5.json | ~15 KB | ~18 KB | +20% |
| dwh-6.fixed.json | ~1.5 MB | ~1.7 MB | +13% |

---

## Implementation Checklist

### Phase 1: Generator ✅
- [x] Create `prerender-generator.html`
- [x] Implement file upload UI
- [x] Implement pre-render extraction
- [x] Implement JSON generation
- [x] Implement download functionality
- [x] Add statistics display
- [x] Add preview rendering

### Phase 2: Dashboard Loading ✅
- [x] Add `hasPrerenderData()` method
- [x] Modify `initialize()` for fast-path
- [x] Add `applyDeferredStatusRules()` method
- [x] Update `nodeBase.js` constructor
- [x] Add `hasPrerenderData` getter
- [x] Modify `updateChildren()` in containers
- [x] Add `applyPrerenderToChildren()` method
- [x] Update `configManager.js` defaults

### Phase 3: Testing 🧪
- [ ] Test generator with small dashboard
- [ ] Test generator with large dashboard
- [ ] Test fast-path loading
- [ ] Test status application
- [ ] Performance benchmarking
- [ ] Regression testing
- [ ] Documentation updates

### Phase 4: Documentation 📚
- [ ] Update user documentation
- [ ] Add developer notes
- [ ] Create usage examples
- [ ] Document performance gains

---

## Next Steps

1. **Test the generator**:
   ```powershell
   cd C:\repo\jeroen\flowdash
   python -m http.server 8000
   # Open http://localhost:8000/dashboard/prerender-generator.html
   ```

2. **Generate test data**:
   - Load `dwh-1.json`
   - Generate pre-render
   - Download result

3. **Implement Phase 2** (dashboard loading modifications)

4. **Test and iterate**

---

## Questions or Issues?

- Check `documentation/pre-render.md` for design details
- Review generator code in `prerender-generator.html`
- Test with small dashboards first
- Use browser console for debugging (look for "📊 Pre-render" messages)

---

**Last Updated**: 2025-10-11  
**Status**: Generator complete, dashboard loading TODO  
**Branch**: `feature/import-export`
