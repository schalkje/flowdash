# Baseline Performance Testing Guide

## Overview

This guide walks you through establishing baseline performance metrics before implementing Phase 2 optimizations. These baseline results will be used to measure the impact of each optimization.

## Prerequisites

- Local development server running (e.g., `http://localhost:8000`)
- Browser with Developer Tools
- All test files present in `dashboard/data/` directory:
  - dwh-1.json
  - dwh-5.json
  - theme_1.json
  - theme_2.json
  - dwh-6.fixed.json

## Step 1: Run Baseline Tests

### Using Automated Test Suite (Recommended)

1. **Open the baseline test runner:**
   ```
   http://localhost:8000/dashboard/run-baseline-tests.html
   ```

2. **Start the tests:**
   - Click "▶️ Start Baseline Tests" button
   - The suite will automatically test all 5 files sequentially
   - Wait approximately 2-3 minutes for completion

3. **Review results:**
   - Each test shows:
     - ✅ PASS or ❌ FAIL status
     - Actual vs target times for each phase
     - Bottlenecks (phases >20% of total time)
     - Node statistics

4. **Save the results:**
   - Click "💾 Download Results (JSON)" button
   - Save to `dashboard/performance-results/` directory
   - Rename file to: `baseline-results-2025-10-07.json` (use current date)

### Using Manual Test Harness (Alternative)

1. **Open test-performance.html:**
   ```
   http://localhost:8000/dashboard/test-performance.html
   ```

2. **Run comparison test:**
   - Click "Run Comparison Test" button
   - Manually record results from browser console

## Step 2: Analyze Baseline Results

### Expected Results (Pre-Optimization)

Based on similar dashboard implementations, we expect:

| File | Expected Time | Expected Status | Primary Bottlenecks |
|------|---------------|-----------------|---------------------|
| dwh-1.json | ~300-500ms | ✅ PASS | None (too small) |
| dwh-5.json | ~1,500-2,500ms | ⚠️ Close | nodeCreation (30-35%) |
| theme_1.json | ~3,000-4,000ms | ⚠️ Close/FAIL | nodeCreation (35-40%), state rendering |
| theme_2.json | ~35,000-45,000ms | ❌ FAIL (2-2.5x over) | nodeCreation (40-45%), layoutStabilization (20-25%) |
| dwh-6.fixed.json | ~35,000-45,000ms | ❌ FAIL (2.3-3x over) | nodeCreation (40-45%), layoutStabilization (20-25%) |

### Key Metrics to Document

For each test file, record:

1. **Total Time**: Overall rendering time
2. **Phase Breakdown**:
   - dataLoad
   - nodeCreation
   - nodeInitialization
   - edgeCreation
   - layoutStabilization
   - zoomSetup

3. **Bottlenecks**: Phases consuming >20% of total time
4. **Pass/Fail Status**: For each phase and overall

### Example Baseline Analysis

```
dwh-6.fixed.json Baseline Results:
- Total Time: 38,245ms (Target: 15,000ms) ❌ FAIL (155% over)
- Node Creation: 15,234ms (39.8% of total) ⚠️ BOTTLENECK
- Layout Stabilization: 9,456ms (24.7% of total) ⚠️ BOTTLENECK
- Node Initialization: 6,789ms (17.7% of total)
- Edge Creation: 4,123ms (10.8% of total)
- Zoom Setup: 2,643ms (6.9% of total)

Primary Optimization Targets:
1. Node Creation (Expected 85% improvement with Batch DOM)
2. Layout Stabilization (Expected 75% improvement with Memoize)
```

## Step 3: Store Baseline Results

### File Storage

1. **Save JSON results** to:
   ```
   dashboard/performance-results/baseline-results-2025-10-07.json
   ```

2. **Commit to version control:**
   ```powershell
   git add dashboard/performance-results/baseline-results-*.json
   git commit -m "Add baseline performance test results"
   ```

### Documentation

Create a summary document or update PERFORMANCE_IMPLEMENTATION_PLAN.md with:

- Date of baseline tests
- Browser and system information
- Summary of pass/fail results
- Identified bottlenecks
- Expected improvements from planned optimizations

## Step 4: Set Optimization Goals

Based on baseline results, define specific goals:

### Phase 2 Optimization Goals

**After Optimization #1 (Batch DOM Operations):**
- Target: 45% improvement on large datasets
- dwh-6.fixed.json: From ~38s to ~21s
- theme_2.json: From ~40s to ~22s
- nodeCreation should drop from 40% to 5-10% of total time

**After Optimization #3 (Memoize Layout Calculations):**
- Target: Additional 35% improvement (65% total)
- dwh-6.fixed.json: From ~21s to ~13-14s (under 15s target)
- theme_2.json: From ~22s to ~14-16s (under 18s target)
- layoutStabilization should drop from 25% to 5-8% of total time

**Success Criteria:**
- All 5 test files must PASS their targets
- No single phase should exceed 20% of total time (no bottlenecks)
- dwh-6.fixed.json < 15 seconds
- theme_2.json < 18 seconds

## Step 5: Prepare for Optimization Implementation

### Pre-Optimization Checklist

- ✅ Baseline tests completed
- ✅ Results saved to performance-results directory
- ✅ Bottlenecks identified and documented
- ✅ Optimization goals defined
- ✅ Version control committed
- ✅ Browser console.table() outputs captured (optional)

### Next Steps

1. **Review PERFORMANCE_IMPLEMENTATION_PLAN.md**
   - Read Phase 2 - Week 2 section
   - Understand Optimization #1 (Batch DOM Operations)

2. **Prepare development environment**
   - Ensure clean working directory
   - Create feature branch for optimizations

3. **Implement Optimization #1**
   - Follow implementation steps in plan
   - Test frequently during development
   - Commit incremental changes

4. **Run comparison tests**
   - After each optimization, run baseline tests again
   - Save results with appropriate naming
   - Use compare-results.html to analyze improvements

## Using Comparison Tool

After implementing optimizations:

1. **Open comparison tool:**
   ```
   http://localhost:8000/dashboard/compare-results.html
   ```

2. **Load files:**
   - Baseline: `baseline-results-2025-10-07.json`
   - Comparison: `phase2-opt1-results-2025-10-07.json`

3. **Analyze improvements:**
   - View side-by-side metrics
   - Calculate improvement percentages
   - Verify bottlenecks are resolved
   - Confirm tests now pass

## Troubleshooting

### Tests Running Too Slow
- Close other applications
- Use a dedicated browser window
- Clear browser cache
- Restart browser between test runs

### Inconsistent Results
- Run tests multiple times (3-5 runs)
- Calculate average times
- Look for outliers (system load spikes)
- Test at consistent times of day

### Files Not Loading
- Verify local server is running
- Check file paths in data directory
- Look for JSON syntax errors
- Check browser console for errors

## Best Practices

1. **Consistent Testing Environment**
   - Always test in same browser
   - Close unnecessary applications
   - Consistent system state

2. **Multiple Test Runs**
   - Run baseline 3 times
   - Use average of results
   - Discard outliers (system glitches)

3. **Documentation**
   - Record system specs
   - Note browser version
   - Document any unusual conditions
   - Keep change log of optimizations

4. **Version Control**
   - Commit baseline results
   - Commit each optimization separately
   - Tag releases with performance data
   - Track metrics over time

## Summary

✅ **Baseline testing complete when you have:**
- JSON results file saved
- All bottlenecks identified
- Optimization goals defined
- Comparison metrics established
- Version control committed

🎯 **Ready to proceed to Phase 2 optimization implementation**

## Quick Reference Commands

```powershell
# Start local server (if needed)
cd C:\repo\jeroen\flowdash
python -m http.server 8000

# Open baseline test runner
start http://localhost:8000/dashboard/run-baseline-tests.html

# Open comparison tool
start http://localhost:8000/dashboard/compare-results.html

# View results directory
explorer dashboard\performance-results
```

## Files Created

- `dashboard/run-baseline-tests.html` - Automated test suite
- `dashboard/compare-results.html` - Results comparison tool
- `dashboard/performance-results/` - Results storage directory
- `dashboard/performance-results/README.md` - Storage documentation
- `dashboard/BASELINE_TESTING_GUIDE.md` - This file
