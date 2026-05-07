# Performance Results Storage

This directory stores baseline and post-optimization performance test results for comparison.

## File Naming Convention

- `baseline-results-YYYY-MM-DD.json` - Initial baseline before any optimizations
- `phase2-opt1-results-YYYY-MM-DD.json` - After implementing Optimization #1 (Batch DOM)
- `phase2-opt3-results-YYYY-MM-DD.json` - After implementing Optimization #3 (Memoize)
- `phase2-complete-results-YYYY-MM-DD.json` - After all Phase 2 optimizations
- `final-results-YYYY-MM-DD.json` - Final results after all optimizations

## Results Structure

Each JSON file contains:

```json
{
  "metadata": {
    "testDate": "ISO timestamp",
    "browser": "User agent string",
    "phase": "Pre-Optimization (Baseline) | Phase 2 - Optimization #1 | etc.",
    "optimizationsApplied": ["List of optimizations"]
  },
  "results": [
    {
      "file": "dwh-1.json",
      "description": "Baseline - 4 nodes",
      "nodeCount": 4,
      "timestamp": "ISO timestamp",
      "metrics": {
        "phases": {
          "dataLoad": 123,
          "nodeCreation": 234,
          "nodeInitialization": 345,
          "edgeCreation": 56,
          "layoutStabilization": 123,
          "zoomSetup": 45,
          "total": 926
        },
        "nodeStats": {
          "totalNodes": 4,
          "containerNodes": 2,
          "leafNodes": 2,
          "maxDepth": 3
        }
      },
      "targets": {
        /* target thresholds */
      },
      "results": {
        /* pass/fail for each phase */
      },
      "summary": {
        "passed": 6,
        "failed": 0,
        "overallPass": true
      },
      "bottlenecks": [
        /* phases >20% of total time */
      ]
    }
    // ... more test results
  ]
}
```

## Usage

### Running Baseline Tests

1. Open `run-baseline-tests.html` in your browser
2. Click "▶️ Start Baseline Tests"
3. Wait for all 5 tests to complete (~2-3 minutes)
4. Click "💾 Download Results (JSON)" to save to this directory
5. Manually rename the file if needed to follow naming convention

### Comparing Results

Use `compare-results.html` to:

- Load multiple result files
- Compare metrics side-by-side
- Calculate improvement percentages
- Visualize performance trends

## Important Notes

- Always run tests in the same browser for consistent comparison
- Close other applications to minimize system load variance
- Run tests multiple times and use average results for accuracy
- Store results in this directory for version control tracking
