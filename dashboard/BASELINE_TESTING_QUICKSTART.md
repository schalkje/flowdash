# Baseline Testing - Quick Start

## ✅ Everything is Ready!

All baseline testing tools have been created and are ready to use.

## 🚀 Quick Start (3 Steps)

### Step 1: Open the Baseline Test Runner

Your local server is already running on port 8000. Simply open:

```
http://localhost:8000/dashboard/run-baseline-tests.html
```

Or run in PowerShell:
```powershell
start http://localhost:8000/dashboard/run-baseline-tests.html
```

### Step 2: Run the Tests

1. Click the **"▶️ Start Baseline Tests"** button
2. Wait 2-3 minutes while all 5 files are tested
3. Watch the progress bar and status updates

The suite will automatically test:
- ✅ dwh-1.json (4 nodes)
- ✅ dwh-5.json (21 nodes)
- ✅ theme_1.json (52 nodes)
- ✅ theme_2.json (875 nodes)
- ✅ dwh-6.fixed.json (885 nodes)

### Step 3: Save the Results

1. Click **"💾 Download Results (JSON)"** button when tests complete
2. Save to: `dashboard/performance-results/`
3. Rename to: `baseline-results-2025-10-07.json` (today's date)

## 📊 What You'll See

### For Each Test File

**Metrics Table:**
- Total time vs target
- Phase-by-phase breakdown (node creation, initialization, edges, layout, zoom)
- Pass/Fail status for each phase
- ⚠️ Bottleneck warnings for slow phases

**Summary:**
- Node count and test description
- Overall PASS/FAIL status
- Number of phases passed/failed

**JSON Output:**
- Complete results in JSON format
- Ready for comparison tool
- Can be copied or downloaded

## 🎯 Expected Results (Pre-Optimization)

| File | Expected | Status |
|------|----------|--------|
| dwh-1.json | ~500ms | ✅ PASS |
| dwh-5.json | ~2,000ms | ⚠️ Close |
| theme_1.json | ~3,500ms | ⚠️ Close/FAIL |
| theme_2.json | ~40,000ms | ❌ FAIL (2.2x over) |
| dwh-6.fixed.json | ~40,000ms | ❌ FAIL (2.7x over) |

**Primary Bottlenecks Expected:**
- 🔴 Node Creation: 35-40% of total time
- 🟡 Layout Stabilization: 20-25% of total time

These are exactly what we'll optimize in Phase 2!

## 🔄 After Running Tests

### Compare Results Later

After implementing optimizations, use the comparison tool:

```powershell
start http://localhost:8000/dashboard/compare-results.html
```

Then:
1. Load baseline results
2. Load post-optimization results
3. View side-by-side comparison with improvement percentages

## 📁 Files Created

All ready to use:

- ✅ `dashboard/run-baseline-tests.html` - Automated test runner
- ✅ `dashboard/compare-results.html` - Results comparison tool
- ✅ `dashboard/performance-results/` - Results storage folder
- ✅ `dashboard/test-performance.html` - Manual test harness (already existed, now extended)

## 📚 Full Documentation

For detailed information:
- `dashboard/BASELINE_TESTING_GUIDE.md` - Complete testing guide
- `dashboard/EXTENDED_TEST_SCOPE.md` - Test scope details
- `dashboard/performance-results/README.md` - Results storage info

## 🎬 Ready to Start!

Everything is set up. Just open the link and click Start:

```powershell
start http://localhost:8000/dashboard/run-baseline-tests.html
```

---

**Time Required:** 2-3 minutes for all tests  
**Browser:** Any modern browser (Chrome, Edge, Firefox)  
**Storage:** Results will be saved to `performance-results/` folder

Good luck! 🚀
