# Performance Instrumentation - Usage Guide

## Overview

Phase 1 of the performance optimization has been implemented. The dashboard now includes comprehensive performance tracking that measures:

- **Load time phases**: Node creation, initialization, edge creation, layout stabilization, zoom setup
- **Node statistics**: Total nodes, container nodes, leaf nodes, tree depth
- **Automated testing**: test-performance.html for comparing different JSON files

## Quick Start

### 1. Open the Test Harness

```
Open: dashboard/test-performance.html
```

This provides a visual interface to:
- Select test files (dwh-1.json or dwh-6.fixed.json)
- Run individual performance tests
- Run comparison tests between baseline and target files
- View pass/fail results against performance targets

### 2. View Performance Metrics in Console

When loading any dashboard, performance metrics are automatically logged to the browser console:

```javascript
🚀 Dashboard Performance Metrics
┌─────────────────────┬────────────┐
│ Phase               │ Time (ms)  │
├─────────────────────┼────────────┤
│ dataLoad            │ 45.20      │
│ nodeCreation        │ 1247.80    │
│ nodeInitialization  │ 523.40     │
│ edgeCreation        │ 876.30     │
│ layoutStabilization │ 234.10     │
│ zoomSetup           │ 124.50     │
│ total               │ 3051.30    │
└─────────────────────┴────────────┘

Node Statistics
┌──────────────┬─────────┐
│ Metric       │ Value   │
├──────────────┼─────────┤
│ totalNodes   │ 885     │
│ containerNodes│ 234    │
│ leafNodes    │ 651     │
│ maxDepth     │ 7       │
└──────────────┴─────────┘

⚠️ Performance Bottlenecks (>20% of load time):
[
  { phase: 'nodeCreation', time: 1247.80, percentage: '40.9%' },
  { phase: 'edgeCreation', time: 876.30, percentage: '28.7%' }
]
```

### 3. Programmatic Access

You can access metrics programmatically in the browser console:

```javascript
// After loading a dashboard
dashboard.performanceMetrics
// Returns object with phases, nodeStats, domStats

dashboard.reportPerformanceMetrics()
// Logs formatted metrics to console
```

## Performance Targets

### dwh-1.json (Baseline - ~4 nodes)
- **Total**: < 1 second
- Node Creation: < 300ms
- Node Initialization: < 300ms
- Edge Creation: < 100ms
- Layout Stabilization: < 200ms
- Zoom Setup: < 100ms

### dwh-6.fixed.json (Target - 885 nodes)
- **Total**: < 15 seconds (after optimization)
- Node Creation: < 5 seconds
- Node Initialization: < 3 seconds
- Edge Creation: < 2 seconds
- Layout Stabilization: < 4 seconds
- Zoom Setup: < 1 second

## What Gets Measured

### Phase Timing

1. **dataLoad**: Time to fetch JSON file from server
2. **nodeCreation**: Time to create node tree structure (createNode/createNodes)
3. **nodeInitialization**: Time to initialize all nodes (call init() on tree)
4. **edgeCreation**: Time to create edges and fix parent relationships
5. **layoutStabilization**: Time for first layout cascade to complete
6. **zoomSetup**: Time to initialize zoom, minimap, and event handlers
7. **total**: End-to-end time from start of initialize() to completion

### Node Statistics

- **totalNodes**: Total number of nodes in the tree
- **containerNodes**: Number of container nodes (Lane, Columns, Adapter, etc.)
- **leafNodes**: Number of leaf nodes (no children)
- **maxDepth**: Maximum nesting depth in the tree

### Bottleneck Detection

Automatically identifies phases that take > 20% of total load time and logs them as warnings.

## Implementation Details

### Modified Files

1. **dashboard/js/dashboard.js**
   - Added `performanceMetrics` object to Dashboard constructor
   - Added `reportPerformanceMetrics()` method
   - Added `collectNodeStatistics()` method
   - Instrumented `initialize()` method with timing
   - Instrumented `createDashboard()` method with timing
   - Instrumented `onMainDisplayChange()` for layout stabilization timing

2. **dashboard/test-performance.html** (NEW)
   - Standalone test harness
   - Automated pass/fail testing
   - Visual results display
   - Comparison testing between files

## Next Steps

With instrumentation in place, you can now:

1. **Establish baseline metrics**: Run tests on dwh-1.json and dwh-6.fixed.json to see current performance
2. **Implement optimizations**: Follow PERFORMANCE_IMPLEMENTATION_PLAN.md Phase 2
3. **Measure improvement**: Re-run tests after each optimization to verify impact
4. **Identify new bottlenecks**: Use bottleneck detection to guide further optimization

## Testing Workflow

### Baseline Measurement
```
1. Open test-performance.html
2. Click "Run Comparison Test"
3. Record baseline metrics in a spreadsheet or document
4. Save console output for reference
```

### After Each Optimization
```
1. Implement optimization
2. Open test-performance.html
3. Run test for dwh-6.fixed.json
4. Compare to baseline
5. Verify no regression on dwh-1.json
6. Check bottleneck warnings for new issues
```

## Troubleshooting

### Metrics show 0ms for some phases
- Check that the dashboard is loading completely
- Verify that initialize() is being called (not setData())
- Look for JavaScript errors in console

### Test harness doesn't load
- Verify you're accessing via HTTP server (not file://)
- Check that data files exist: data/dwh-1.json, data/dwh-6.fixed.json
- Verify ES6 modules are supported by your browser

### Performance varies between runs
- Close other tabs/applications
- Disable browser extensions
- Run multiple tests and take average
- Use Chrome DevTools Performance profiler for detailed analysis

## Advanced Usage

### Custom Performance Marks

You can add custom performance marks in your code:

```javascript
performance.mark('custom-start');
// ... your code ...
performance.mark('custom-end');
performance.measure('custom-operation', 'custom-start', 'custom-end');
```

### Integration with Browser DevTools

The instrumentation works alongside Chrome DevTools Performance profiler:

1. Open DevTools → Performance tab
2. Start recording
3. Load dashboard
4. Stop recording
5. Correlate instrumentation metrics with flame chart

## FAQ

**Q: Why is nodeCreation so slow?**
A: Each node appends to DOM immediately. Optimization #1 (Batch DOM Operations) will address this.

**Q: What causes layout stabilization delays?**
A: Cascading resize events propagate up the tree. Optimization #3 (Memoize Layout) will help.

**Q: Should I optimize dataLoad?**
A: Usually not - it's network-bound. Focus on nodeCreation, initialization, and layout stabilization first.

**Q: Can I disable instrumentation in production?**
A: Instrumentation overhead is minimal (~1-2ms). You can optionally wrap with environment checks if needed.

## Contact

For questions or issues with the performance instrumentation:
- Check PERFORMANCE_IMPLEMENTATION_PLAN.md for context
- Review DASHBOARD_LOADING_ANALYSIS.md for technical details
- Check browser console for error messages
