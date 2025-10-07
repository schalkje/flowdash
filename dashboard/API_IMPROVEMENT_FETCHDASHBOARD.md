# Dashboard.js API Improvement - Re-export fetchDashboardFile

## Summary
Re-exported `fetchDashboardFile` from `dashboard.js` to provide a cleaner, single-import API for users of the dashboard module.

## Changes Made

### 1. Updated dashboard.js
**File:** `dashboard/js/dashboard.js`

Added `fetchDashboardFile` to the existing export statement at the end of the file:

```javascript
// Before:
export { showLoader as showLoading, hideLoader as hideLoading };

// After:
export { showLoader as showLoading, hideLoader as hideLoading, fetchDashboardFile };
```

The function was already imported at the top of the file from `data.js`, so this simply re-exports it for convenience.

### 2. Updated test-performance.html
**File:** `dashboard/test-performance.html`

Simplified the import to use a single module:

```javascript
// Before:
import * as flowDashboard from './js/dashboard.js';
import { fetchDashboardFile } from './js/data.js';

// After:
import { Dashboard, fetchDashboardFile } from './js/dashboard.js';
```

And updated usage from:
```javascript
currentDashboard = new flowDashboard.Dashboard(data);
```

To:
```javascript
currentDashboard = new Dashboard(data);
```

## Benefits

1. **Single Import Point**: Users only need to import from `dashboard.js` to get everything they need
2. **Cleaner Code**: No need for namespace prefix (`flowDashboard.Dashboard`)
3. **Better API Design**: Related functionality is accessible from a single module
4. **Backwards Compatible**: The original `data.js` export still exists for anyone using it directly

## Usage Examples

### Before (Multiple Imports)
```javascript
import * as flowDashboard from './js/dashboard.js';
import { fetchDashboardFile } from './js/data.js';

const data = await fetchDashboardFile('data/my-dashboard.json');
const dashboard = new flowDashboard.Dashboard(data);
```

### After (Single Import)
```javascript
import { Dashboard, fetchDashboardFile } from './js/dashboard.js';

const data = await fetchDashboardFile('data/my-dashboard.json');
const dashboard = new Dashboard(data);
```

## Files Modified
- ✅ `dashboard/js/dashboard.js` - Added `fetchDashboardFile` to exports
- ✅ `dashboard/test-performance.html` - Updated to use single import

## Backward Compatibility
✅ **Fully backward compatible** - The original `data.js` export remains unchanged, so existing code using `import { fetchDashboardFile } from './js/data.js'` will continue to work.

## Testing
Verified that:
- ✅ test-performance.html works correctly
- ✅ fetchDashboardFile can be imported from dashboard.js
- ✅ Dashboard class can be imported directly
- ✅ No breaking changes to existing functionality

## Recommendation
Going forward, use this import pattern in documentation and examples:
```javascript
import { Dashboard, fetchDashboardFile } from './js/dashboard.js';
```
