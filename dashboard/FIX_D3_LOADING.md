# Test Performance Page - D3 Loading Fix

## Issue
The test-performance.html page was throwing an error:
```
Uncaught (in promise) ReferenceError: d3 is not defined
    at runPerformanceTest (test-performance.html:160:25)
```

## Root Cause
The page was using `<script type="module">` which loads asynchronously, but D3 library (loaded via regular `<script>` tags) wasn't guaranteed to be available when the module code started executing.

## Solution Applied

### 1. Added D3 Script Tags
Added the required D3 libraries to the `<head>` section:
```html
<script src="libs/d3.min.js"></script>
<script src="libs/d3-shape.min.js"></script>
<script src="libs/d3-dag.iife.min.js"></script>
```

### 2. Added D3 Availability Check
Added a promise-based wait function to ensure D3 is loaded before executing the module code:
```javascript
// Wait for D3 to be available
function waitForD3() {
    return new Promise((resolve) => {
        if (typeof d3 !== 'undefined') {
            resolve();
        } else {
            const checkD3 = setInterval(() => {
                if (typeof d3 !== 'undefined') {
                    clearInterval(checkD3);
                    resolve();
                }
            }, 50);
        }
    });
}

await waitForD3();
```

## Files Modified
- ✅ `dashboard/test-performance.html`

## Additional Fixes Applied

### Issue 2: fetchDashboardFile is not a function
**Error:** `TypeError: flowDashboard.fetchDashboardFile is not a function`

**Cause:** The `fetchDashboardFile` function was exported from `data.js`, not from `dashboard.js`

**Solution:** Re-exported `fetchDashboardFile` from `dashboard.js` for convenience:

In `dashboard.js`:
```javascript
// At the top (already imported):
import { fetchDashboardFile } from "./data.js";

// At the bottom (added to exports):
export { showLoader as showLoading, hideLoader as hideLoading, fetchDashboardFile };
```

In `test-performance.html`, simplified to single import:
```javascript
// Before:
import * as flowDashboard from './js/dashboard.js';
import { fetchDashboardFile } from './js/data.js';

// After (cleaner):
import { Dashboard, fetchDashboardFile } from './js/dashboard.js';
```

Usage:
```javascript
const data = await fetchDashboardFile(filename);
const dashboard = new Dashboard(data);
```

## Verification Steps
1. Open test-performance.html in browser
2. Open browser console
3. Select "dwh-1.json" from dropdown
4. Click "Run Performance Test"
5. Verify no errors and metrics appear

## Expected Output
You should see:
- No console errors
- Test results appear in the page
- Performance metrics logged to console
- Pass/fail status for each phase

## Additional Notes
This same pattern (waiting for D3) might be needed in other test pages if they use ES6 modules with D3. The flowdash-js.html demo page doesn't have this issue because it uses regular script tags throughout.
