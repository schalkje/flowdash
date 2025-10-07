# Extended Performance Test Scope

## Overview
The performance test harness has been extended to include a comprehensive range of test files covering different sizes and complexities.

## Test Files

### 1. dwh-1.json (Baseline - Small)
- **Node Count**: ~4 nodes
- **Complexity**: Simple hierarchy
- **Features**: Basic structure
- **Target Total Time**: 1 second
- **Purpose**: Baseline performance measurement, should always pass quickly

### 2. dwh-5.json (Medium)
- **Node Count**: 21 nodes
- **Complexity**: Multiple lanes with adapters
- **Features**: 
  - 2 lanes with multiple adapter nodes
  - Full adapter layout mode
  - Database nodes
  - Foundation nodes
- **Target Total Time**: 2 seconds
- **Purpose**: Medium complexity without state variations

### 3. theme_1.json (Medium with States)
- **Node Count**: 52 nodes
- **Complexity**: Multiple lanes with various node states
- **Features**:
  - Multiple adapter nodes with staging-archive mode
  - Various states: Updated, Updating, Ready, Error, Warning
  - Nested children in adapters
  - State-based visual rendering
- **Target Total Time**: 3 seconds
- **Purpose**: Test state rendering performance with medium dataset

### 4. theme_2.json (Large with States)
- **Node Count**: 875 nodes
- **Complexity**: Very large hierarchy with extensive nesting
- **Features**:
  - Deeply nested Columns and Lane structures
  - Multiple state variations across many nodes
  - Large edge set (33 edges)
  - Complex parent-child relationships
- **Target Total Time**: 18 seconds
- **Purpose**: Stress test with large dataset and state complexity

### 5. dwh-6.fixed.json (Target - Large)
- **Node Count**: 885 nodes
- **Complexity**: Very large hierarchy
- **Features**: Production-sized dataset
- **Target Total Time**: 15 seconds (post-optimization)
- **Purpose**: Primary optimization target, should improve with Phase 2 optimizations

## Performance Targets

### Phase-Specific Targets

| File | Total | Node Creation | Node Init | Edge Creation | Layout Stab. | Zoom Setup |
|------|-------|---------------|-----------|---------------|--------------|------------|
| dwh-1.json | 1000ms | 300ms | 300ms | 100ms | 200ms | 100ms |
| dwh-5.json | 2000ms | 600ms | 500ms | 200ms | 500ms | 200ms |
| theme_1.json | 3000ms | 900ms | 800ms | 300ms | 800ms | 200ms |
| theme_2.json | 18000ms | 6000ms | 4000ms | 2500ms | 4500ms | 1000ms |
| dwh-6.fixed.json | 15000ms | 5000ms | 3000ms | 2000ms | 4000ms | 1000ms |

## Test Progression

### Baseline Testing (Current State - Pre-Optimization)
Expected results before implementing Phase 2 optimizations:
- ✅ **dwh-1.json**: Should PASS (small dataset)
- ✅ **dwh-5.json**: Should PASS or be close (medium dataset)
- ⚠️ **theme_1.json**: May PASS or slightly exceed (state rendering overhead)
- ❌ **theme_2.json**: Expected to FAIL significantly (~35-45 seconds actual)
- ❌ **dwh-6.fixed.json**: Expected to FAIL significantly (~35-45 seconds actual)

### Post-Optimization Testing (Phase 2 Complete)
Expected results after implementing all Phase 2 optimizations:
- ✅ **dwh-1.json**: Should PASS easily
- ✅ **dwh-5.json**: Should PASS easily
- ✅ **theme_1.json**: Should PASS
- ✅ **theme_2.json**: Should PASS (target: under 18 seconds)
- ✅ **dwh-6.fixed.json**: Should PASS (target: under 15 seconds)

## Running Tests

### Individual Test
1. Open `test-performance.html` in browser
2. Select desired file from dropdown
3. Click "Run Performance Test"
4. Review pass/fail status and bottleneck warnings

### Comprehensive Comparison
1. Click "Run Comparison Test" button
2. All 5 files will be tested sequentially
3. Wait ~2 minutes for complete test suite
4. Compare results across all files

## Key Metrics to Watch

### Before Optimization
- **Node Creation**: Expected bottleneck (~35-40% of total time)
- **Layout Stabilization**: Expected bottleneck (~20-25% of total time)
- **Node Initialization**: Moderate time (~15-20% of total time)

### After Optimization #1 (Batch DOM Operations)
- **Node Creation**: Should drop to ~5-10% of total time (85% improvement)
- **Layout Stabilization**: May improve slightly due to reduced DOM thrashing

### After Optimization #3 (Memoize Layout Calculations)
- **Layout Stabilization**: Should drop to ~5-8% of total time (75% improvement)
- **Node Initialization**: May improve due to cached calculations

## Optimization Impact Tracking

Use the comparison test to track optimization impact:

```javascript
// Example expected improvements:
Before Phase 2:
  dwh-6.fixed.json: ~40,000ms total
  theme_2.json: ~42,000ms total

After Optimization #1:
  dwh-6.fixed.json: ~22,000ms total (45% improvement)
  theme_2.json: ~24,000ms total (43% improvement)

After Optimization #1 + #3:
  dwh-6.fixed.json: ~14,000ms total (65% improvement)
  theme_2.json: ~16,000ms total (62% improvement)
```

## Test Coverage

The extended test scope now covers:
- ✅ Small datasets (dwh-1.json)
- ✅ Medium datasets without states (dwh-5.json)
- ✅ Medium datasets with states (theme_1.json)
- ✅ Large datasets with states (theme_2.json)
- ✅ Large datasets for optimization target (dwh-6.fixed.json)
- ✅ Various node types (Columns, Lane, Adapter, Foundation, Node)
- ✅ Various layout modes (full, staging-archive, role-based)
- ✅ State rendering (Ready, Updated, Updating, Error, Warning, Unknown)
- ✅ Edge rendering and interactions

## Next Steps

1. **Run Baseline Tests**: Execute all 5 tests to establish current performance
2. **Document Bottlenecks**: Record which phases are slowest for each file
3. **Implement Optimizations**: Follow PERFORMANCE_IMPLEMENTATION_PLAN.md Phase 2
4. **Re-test**: Run comparison test after each optimization
5. **Validate Improvements**: Ensure all files meet or exceed targets
