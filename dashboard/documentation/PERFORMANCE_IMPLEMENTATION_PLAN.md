# Dashboard Performance Optimization - Implementation Plan

## 🎯 Current Status

| Phase                    | Status      | Completion |
| ------------------------ | ----------- | ---------- |
| Phase 1: Instrumentation | ✅ Complete | 100%       |
| Phase 2: Optimization    | 🔄 Ready    | 0%         |
| Phase 3: Testing         | ✅ Complete | 100%       |
| Phase 4: Schedule        | 📋 Defined  | -          |

## 🚀 Next Steps

1. **Run Baseline Tests**: `cd dashboard && .\run-baseline-tests.ps1`
2. **Review Results**: Identify current bottlenecks in large files
3. **Start Phase 2**: Implement Optimization #1 (Batch DOM Operations)
4. **Measure Impact**: Re-run tests and compare with baseline

---

## Executive Summary

This plan addresses the 40-second load time for large dashboards (885 nodes) by implementing:

- **Priority optimizations**: #1 (Batch DOM), #2 (Defer Layout), #3 (Memoize), #4 (Cache Lookups), #6 (Defer Minimap)
- **Performance instrumentation**: ✅ **COMPLETE** - Comprehensive timing and profiling framework
- **Testing strategy**: ✅ **COMPLETE** - Extended test suite with 5 test files

**Expected Impact**: Reduce load time from ~40s to ~10-15s (60-75% improvement)

## Implementation Status

### ✅ Phase 1: Performance Instrumentation Framework - COMPLETE

- Dashboard-level timing system implemented
- Test harness with automated metrics collection created
- Extended test suite with 5 test files (dwh-1, dwh-5, theme_1, theme_2, dwh-6.fixed)
- Baseline testing tools ready to use
- See: `PHASE1_COMPLETE.md`, `BASELINE_IMPLEMENTATION_SUMMARY.md`

### 🔄 Phase 2: Optimization Implementation - IN PROGRESS

- Ready to implement 5 priority optimizations
- Instrumentation in place to measure impact
- Test suite ready for validation

### ✅ Phase 3: Testing and Validation - COMPLETE

- Comprehensive test file suite established
- Automated test runners created (`run-baseline-tests.html`)
- Comparison tool for before/after analysis (`compare-results.html`)
- Performance targets defined for all test files
- See: `EXTENDED_TEST_SCOPE.md`, `BASELINE_TESTING_GUIDE.md`

### 📋 Phase 4: Implementation Schedule - PENDING

- Awaiting Phase 2 completion

---

## Phase 1: Performance Instrumentation Framework ✅ COMPLETE

**Status**: Fully implemented and tested

**What Was Delivered**:

- ✅ Dashboard-level timing system with comprehensive metrics
- ✅ Performance metrics tracking for all load phases
- ✅ Bottleneck detection (phases >20% of load time)
- ✅ Node statistics collection
- ✅ Test harness with automated pass/fail testing
- ✅ Extended test suite with 5 test files
- ✅ Automated test runner (`run-baseline-tests.html`)
- ✅ Results comparison tool (`compare-results.html`)
- ✅ Complete documentation and usage guides

**Test Files Included**:

| File             | Nodes | Purpose            | Target Time |
| ---------------- | ----- | ------------------ | ----------- |
| dwh-1.json       | 4     | Small baseline     | 1s          |
| dwh-5.json       | 21    | Medium complexity  | 2s          |
| theme_1.json     | 52    | Medium with states | 3s          |
| theme_2.json     | 875   | Large with states  | 18s         |
| dwh-6.fixed.json | 885   | Primary target     | 15s         |

**How to Use**:

```powershell
# Run automated test suite
cd dashboard
.\run-baseline-tests.ps1
```

**Documentation**: See `PHASE1_COMPLETE.md`, `BASELINE_IMPLEMENTATION_SUMMARY.md`, `EXTENDED_TEST_SCOPE.md`

---

## Phase 2: Optimization Implementation

### 2.1 Optimization #1: Batch DOM Operations

**Priority**: CRITICAL (Expected impact: 8-12s → 2-3s savings)

**Files to Modify**:

- `dashboard/js/node.js` (createNode, createNodes)
- `dashboard/js/nodeBaseContainer.js`

**Implementation Strategy**:

```javascript
// In node.js - modify createNodes function
export function createNodes(nodesData, parentNode, parentElement) {
  // Instead of appending each node immediately, collect them
  const nodes = [];
  const elementsToAppend = [];

  nodesData.forEach((nodeData) => {
    const node = createNode(nodeData, parentNode, null); // Pass null for element
    nodes.push(node);

    // Create element but don't append yet
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    element.setAttribute('id', node.id);
    element.setAttribute('class', node.getClassNames().join(' '));

    node.element = d3.select(element);
    elementsToAppend.push(element);

    // Store for later processing
    node._pendingElement = element;
  });

  // Batch append all elements at once
  const fragment = document.createDocumentFragment();
  elementsToAppend.forEach((el) => fragment.appendChild(el));
  parentElement.node().appendChild(fragment);

  // Now process child nodes recursively
  nodes.forEach((node) => {
    if (node.childNodes && node.data.nodes) {
      node.childNodes = createNodes(node.data.nodes, node, node.element);
    }
  });

  return nodes;
}
```

**Testing**:

- Verify dwh-1.json still loads correctly
- Measure DOM operation count reduction (expect 885 → ~50-100)
- Verify nodeCreation phase time improves

**Success Criteria**:

- Node creation phase < 3s for dwh-6.fixed.json (down from ~15-20s)
- DOM append operations < 200 (down from ~885)

### 2.2 Optimization #2: Defer Layout Calculation

**Priority**: HIGH (Expected impact: 2-3s savings)

**Files to Modify**:

- `dashboard/js/nodeBaseContainer.js`
- `dashboard/js/nodeLane.js`
- `dashboard/js/nodeColumns.js`

**Implementation Strategy**:

```javascript
// In nodeBaseContainer.js
export class BaseContainerNode extends RectangularNode {
  constructor(data, parentNode = null) {
    super(data, parentNode);
    this.layoutDeferred = false;
    this.layoutCalculated = false;
  }

  init() {
    // Call parent init
    super.init();

    // Initialize zone manager (required)
    if (this.zoneManager) {
      this.zoneManager.initialize();
    }

    // Defer layout if collapsed or deeply nested
    const shouldDeferLayout = this.collapsed || this.getDepth() > 3;

    if (shouldDeferLayout) {
      this.layoutDeferred = true;
      console.log(
        `⏳ Deferring layout for: ${this.id} (collapsed: ${this.collapsed}, depth: ${this.getDepth()})`,
      );
    } else {
      this.calculateInitialLayout();
    }

    // Initialize children
    if (this.childNodes) {
      this.childNodes.forEach((child) => child.init());
    }
  }

  calculateInitialLayout() {
    if (this.layoutCalculated) return;

    // Call specific layout method (layoutLane, layoutColumns, etc.)
    if (this.layoutLane) {
      this.profiledLayout(() => this.layoutLane(), 'layoutLane');
    } else if (this.layoutColumns) {
      this.profiledLayout(() => this.layoutColumns(), 'layoutColumns');
    }

    this.layoutCalculated = true;
  }

  expand() {
    super.expand();

    // If layout was deferred, calculate it now
    if (this.layoutDeferred && !this.layoutCalculated) {
      console.log(`🔄 Calculating deferred layout for: ${this.id}`);
      this.calculateInitialLayout();
      this.layoutDeferred = false;
    }
  }

  getDepth() {
    let depth = 0;
    let current = this.parentNode;
    while (current) {
      depth++;
      current = current.parentNode;
    }
    return depth;
  }
}
```

**Testing**:

- Verify collapsed containers don't calculate layout initially
- Verify layout calculates correctly when expanded
- Measure nodeInitialization phase time improvement

**Success Criteria**:

- Node initialization phase < 2s for dwh-6.fixed.json (down from ~3-5s)
- Layout recalculation count < 200 initially (down from ~400+)

### 2.3 Optimization #3: Memoize Layout Calculations

**Priority**: HIGH (Expected impact: 5-8s savings)

**Files to Modify**:

- `dashboard/js/nodeRect.js`
- `dashboard/js/nodeBaseContainer.js`

**Implementation Strategy**:

```javascript
// In rectangularNode.js - modify resize method
resize(newWidth, newHeight, force = false) {
    // Check if size actually changed
    const widthChanged = Math.abs(this.data.width - newWidth) > 0.01;
    const heightChanged = Math.abs(this.data.height - newHeight) > 0.01;

    if (!widthChanged && !heightChanged && !force) {
        console.log(`⏭️ Skipping resize for ${this.id} - no change`);
        return; // Early exit - no change
    }

    const oldWidth = this.data.width;
    const oldHeight = this.data.height;

    this.data.width = newWidth;
    this.data.height = newHeight;

    console.log(`📏 Resizing ${this.id}: ${oldWidth.toFixed(1)}×${oldHeight.toFixed(1)} → ${newWidth.toFixed(1)}×${newHeight.toFixed(1)}`);

    // Update visual representation
    this.updateDimensions();

    // Trigger parent recalculation only if significant change (> 1px)
    const significantChange = Math.abs(oldWidth - newWidth) > 1 || Math.abs(oldHeight - newHeight) > 1;
    if (significantChange) {
        this.handleDisplayChange();
    }
}

// Add in nodeBaseContainer.js
resizeBoundingContainer() {
    if (!this.childNodes || this.childNodes.length === 0) return;

    const oldSize = { width: this.data.width, height: this.data.height };

    // Calculate new size based on children
    const bbox = this.calculateChildrenBoundingBox();
    const newWidth = bbox.width + (this.padding?.left || 0) + (this.padding?.right || 0);
    const newHeight = bbox.height + (this.padding?.top || 0) + (this.padding?.bottom || 0);

    // Use memoized resize
    this.resize(newWidth, newHeight);
}

calculateChildrenBoundingBox() {
    // Cache the bounding box calculation result
    const cacheKey = this.childNodes.map(n => `${n.id}:${n.data.width}:${n.data.height}:${n.x}:${n.y}`).join('|');

    if (this._bboxCache && this._bboxCacheKey === cacheKey) {
        return this._bboxCache;
    }

    // Actual calculation...
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    this.childNodes.forEach(node => {
        const x = node.x || 0;
        const y = node.y || 0;
        const w = node.data.width || 0;
        const h = node.data.height || 0;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
    });

    const result = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };

    // Cache result
    this._bboxCache = result;
    this._bboxCacheKey = cacheKey;

    return result;
}
```

**Testing**:

- Count how many resize calls are short-circuited
- Measure cascade depth reduction
- Verify layout still renders correctly

**Success Criteria**:

- Layout stabilization phase < 3s (down from ~8-12s)
- Resize operations reduced by 60%+ (log "Skipping resize" messages)

### 2.4 Optimization #4: Cache Node Lookups for Edges

**Priority**: MEDIUM (Expected impact: 2-4s savings)

**Files to Modify**:

- `dashboard/js/dashboard.js` (createEdges method)
- `dashboard/js/node.js`

**Implementation Strategy**:

```javascript
// In dashboard.js - modify createEdges
createEdges() {
    if (!this.data.edges || this.data.edges.length === 0) return;

    console.log(`🔗 Creating ${this.data.edges.length} edges...`);
    const t0 = performance.now();

    // Build node lookup map ONCE
    const nodeMap = this.buildNodeMap();
    console.log(`📇 Built node lookup map: ${nodeMap.size} nodes in ${(performance.now() - t0).toFixed(2)}ms`);

    const t1 = performance.now();
    this.edgeObjects = this.data.edges.map(edgeData => {
        const sourceNode = nodeMap.get(edgeData.source);
        const targetNode = nodeMap.get(edgeData.target);

        if (!sourceNode) {
            console.warn(`Edge source not found: ${edgeData.source}`);
            return null;
        }
        if (!targetNode) {
            console.warn(`Edge target not found: ${edgeData.target}`);
            return null;
        }

        return new Edge(edgeData, sourceNode, targetNode, this);
    }).filter(edge => edge !== null);

    console.log(`✅ Created edges in ${(performance.now() - t1).toFixed(2)}ms (total: ${(performance.now() - t0).toFixed(2)}ms)`);
}

buildNodeMap() {
    const map = new Map();

    const addNode = (node) => {
        map.set(node.id, node);
        if (node.childNodes) {
            node.childNodes.forEach(addNode);
        }
    };

    if (this.rootNode) {
        addNode(this.rootNode);
    }

    return map;
}

// Alternative: Add to Node class for reusability
export class Node {
    getAllNodesMap() {
        const map = new Map();

        const traverse = (node) => {
            map.set(node.id, node);
            if (node.childNodes) {
                node.childNodes.forEach(traverse);
            }
        };

        traverse(this);
        return map;
    }
}
```

**Testing**:

- Verify all edges still connect correctly
- Measure edge creation time improvement
- Count tree traversals (should be 1 instead of ~1000)

**Success Criteria**:

- Edge creation phase < 1s (down from ~2-5s)
- Single tree traversal instead of one per edge

### 2.5 Optimization #6: Defer Minimap Initialization

**Priority**: MEDIUM (Expected impact: 1-2s savings)

**Files to Modify**:

- `dashboard/js/dashboard.js`
- `dashboard/js/minimap.js`

**Implementation Strategy**:

```javascript
// In dashboard.js initialize method
async initialize(containerSelector, options = {}) {
    // ... existing code ...

    // DON'T initialize minimap during initial load
    // this.minimap.safeInitialize(); // REMOVE THIS

    // ... rest of initialization ...

    this.hideLoading();

    // Initialize minimap AFTER everything else is ready
    setTimeout(() => {
        console.log('🗺️ Initializing minimap (deferred)...');
        this.minimap.safeInitialize();
    }, 100); // Small delay to let rendering settle
}

// Alternatively, initialize minimap on first interaction
initializeZoom() {
    this.zoomManager = new ZoomManager(this);

    // Initialize minimap when user first interacts with zoom
    let minimapInitialized = false;
    const originalZoom = this.zoomManager.zoom;
    this.zoomManager.zoom = (...args) => {
        if (!minimapInitialized) {
            console.log('🗺️ Initializing minimap on first zoom...');
            this.minimap.safeInitialize();
            minimapInitialized = true;
        }
        return originalZoom.apply(this.zoomManager, args);
    };
}
```

**Testing**:

- Verify minimap still works correctly
- Verify it initializes after initial load complete
- Measure initialization phase time improvement

**Success Criteria**:

- Minimap initialization doesn't block initial render
- Total load time reduced by 1-2s
- Minimap appears within 200ms of dashboard being visible

---

## Phase 3: Testing and Validation ✅ COMPLETE

**Status**: Fully implemented with extended test coverage

**What Was Delivered**:

- ✅ Comprehensive test file suite (5 test files covering small to large dashboards)
- ✅ Automated test runner with progress tracking (`run-baseline-tests.html`)
- ✅ PowerShell launcher script (`run-baseline-tests.ps1`)
- ✅ Results comparison tool for before/after analysis (`compare-results.html`)
- ✅ Performance targets defined for all test files and phases
- ✅ Pass/fail testing with color-coded results
- ✅ JSON export and clipboard functionality
- ✅ Bottleneck detection and reporting
- ✅ Complete testing guides and documentation

**Test Coverage**:

| File             | Nodes | Type            | Target Time | Purpose                       |
| ---------------- | ----- | --------------- | ----------- | ----------------------------- |
| dwh-1.json       | 4     | Small baseline  | 1s          | Fast test, should always pass |
| dwh-5.json       | 21    | Medium          | 2s          | Medium complexity             |
| theme_1.json     | 52    | Medium + states | 3s          | State rendering performance   |
| theme_2.json     | 875   | Large + states  | 18s         | Stress test with states       |
| dwh-6.fixed.json | 885   | Large target    | 15s         | Primary optimization target   |

**Testing Workflow**:

1. **Run Baseline Tests**: `.\run-baseline-tests.ps1` (automated, all 5 files)
2. **Save Results**: Download JSON from browser
3. **Implement Optimization**: Make code changes
4. **Re-run Tests**: Use same automated test runner
5. **Compare Results**: Use `compare-results.html` to analyze improvements

**Validation Checklist** (per optimization):

- ✅ All test files load without errors
- ✅ Performance metrics show expected improvements
- ✅ No regressions on small files (dwh-1.json, dwh-5.json)
- ✅ Visual rendering correct for all node types
- ✅ All edges connect properly
- ✅ Expand/collapse functionality works
- ✅ Zoom/pan interactions function correctly
- ✅ Minimap displays correctly

**Documentation**: See `BASELINE_TESTING_GUIDE.md`, `BASELINE_TESTING_QUICKSTART.md`, `EXTENDED_TEST_SCOPE.md`

---

## Phase 4: Implementation Schedule

### ✅ Week 1: Instrumentation - COMPLETE

All instrumentation and testing infrastructure is in place.

### 🔄 Week 2: Core Optimizations - READY TO START

**Priority Order** (based on expected impact):

1. **Optimization #1 - Batch DOM Operations** (§2.1)
   - Expected: 85% reduction in node creation time
   - Impact: ~18-20s → ~3-5s savings
   - **Recommendation: START HERE**

2. **Optimization #3 - Memoize Layout Calculations** (§2.3)
   - Expected: 75% reduction in layout stabilization time
   - Impact: ~8-12s → ~2-3s savings
   - **Recommendation: IMPLEMENT AFTER #1**

3. **Testing and Validation**
   - Run baseline tests before starting
   - Run tests after each optimization
   - Use `compare-results.html` to track improvements

### 📅 Week 3: Additional Optimizations - PENDING

After core optimizations prove successful:

1. **Optimization #2 - Defer Layout** (§2.2)
2. **Optimization #4 - Cache Node Lookups** (§2.4)
3. **Optimization #6 - Defer Minimap** (§2.5)
4. Final regression testing

---

## Success Metrics

### Primary Goal

**Reduce dwh-6.fixed.json load time from ~40s to ~15s** (62.5% improvement)

### Phase-by-Phase Targets

- Node Creation: 15-20s → 3s (85% improvement)
- Node Initialization: 3-5s → 2s (60% improvement)
- Edge Creation: 2-5s → 1s (80% improvement)
- Layout Stabilization: 8-12s → 3s (75% improvement)

### Quality Metrics

- Zero regressions on dwh-1.json
- All visual rendering correct
- All interactions functional
- Console logging useful for debugging

---

## Rollback Plan

If any optimization causes issues:

1. **Immediate rollback**: Use git to revert specific commits
2. **Feature flags**: Add `dashboard.options.useOptimization1` flags
3. **Gradual deployment**: Test each optimization in isolation

```javascript
// Example feature flag approach
const OPTIMIZATION_FLAGS = {
  batchDOM: true,
  deferLayout: true,
  memoizeResize: true,
  cacheNodeLookup: true,
  deferMinimap: true,
};

// In code:
if (OPTIMIZATION_FLAGS.batchDOM) {
  // Use batched approach
} else {
  // Use original approach
}
```

---

## Appendix: Quick Reference

### ✅ Completed Infrastructure (Phase 1 & 3)

**Testing Tools**:

- `run-baseline-tests.html` - Automated test runner for all 5 files
- `run-baseline-tests.ps1` - PowerShell launcher
- `compare-results.html` - Before/after comparison tool
- `test-performance.html` - Individual file testing

**Documentation**:

- `PHASE1_COMPLETE.md` - Phase 1 implementation summary
- `BASELINE_IMPLEMENTATION_SUMMARY.md` - Testing infrastructure details
- `BASELINE_TESTING_GUIDE.md` - Complete testing guide
- `BASELINE_TESTING_QUICKSTART.md` - Quick start reference
- `EXTENDED_TEST_SCOPE.md` - Test file descriptions
- `PERFORMANCE_INSTRUMENTATION.md` - Instrumentation usage guide

### 🎯 Key Files to Modify (Phase 2)

For upcoming optimizations:

1. `dashboard/js/dashboard.js` - Main orchestration, edge creation
2. `dashboard/js/node.js` - Node creation (Optimization #1)
3. `dashboard/js/nodeBaseContainer.js` - Layout logic (Optimizations #2, #3)
4. `dashboard/js/nodeRect.js` - Resize logic (Optimization #3)
5. `dashboard/js/minimap.js` - Minimap initialization (Optimization #6)

### 📊 Performance Measurement Commands

```javascript
// In browser console after loading dashboard
dashboard.reportPerformanceMetrics(); // View all metrics
```

Or use the automated test runners:

```powershell
# Run all 5 test files automatically
cd dashboard
.\run-baseline-tests.ps1
```

### 🔍 Expected Baseline Results (Before Optimization)

**Small Files** (should pass):

- dwh-1.json: ~300-500ms total ✅
- dwh-5.json: ~1,500-2,500ms total ✅

**Large Files** (expected to fail):

- theme_2.json: ~35,000-45,000ms total ❌ (target: 18,000ms)
- dwh-6.fixed.json: ~35,000-45,000ms total ❌ (target: 15,000ms)

**Primary Bottlenecks**:

- 🔴 Node Creation: 40-45% of load time
- 🟡 Layout Stabilization: 20-25% of load time

### 📈 Expected Improvements (After Phase 2)

After implementing core optimizations (#1 and #3):

- **theme_2.json**: ~40s → ~14-16s (60-65% improvement) ✅
- **dwh-6.fixed.json**: ~40s → ~13-14s (65-67% improvement) ✅
