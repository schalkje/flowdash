# Prerender Width Fix - October 12, 2025

## Issue Description

When loading `dwh-1.prerender.json`, the archive block was being displayed with width **80px** instead of the prerendered width of **126.67px** as specified in the JSON data.

However, when displaying the non-prerendered file `dwh-1.json`, the layout was calculated correctly and the archive node was displayed at the proper size.

## Root Cause

The issue was in the `nodeAdapter.js` file, specifically in two locations:

### 1. `standardizeChildDimensions()` method (line 256)

This method was forcing all child nodes (staging, archive, transform) to use standard widths:

- **80px** for role display mode
- **150px** for full display mode

The method did not check whether the node was using prerender data, so it was **overwriting** the prerendered width values.

```javascript
// OLD CODE - Always overwrites dimensions
standardizeChildDimensions() {
  const isRoleMode = this.data.layout.displayMode === DisplayMode.ROLE;
  const standardWidth = isRoleMode ? 80 : 150;
  const standardHeight = 44;

  [this.stagingNode, this.archiveNode, this.transformNode].forEach((child) => {
    if (!child) return;
    
    child.data.width = standardWidth;  // ❌ Overwrites prerender width!
    child.data.height = standardHeight;
    
    if (typeof child.resize === 'function') {
      child.resize({ width: standardWidth, height: standardHeight });
    }
  });
}
```

### 2. `initChildren()` method role mode block (line 218)

In role display mode, there was additional code that explicitly set child widths to 80px, again without checking for prerender data:

```javascript
// OLD CODE - Forces width to 80 in role mode
if (this.data.layout.displayMode === DisplayMode.ROLE) {
  [this.stagingNode, this.archiveNode, this.transformNode].forEach((child) => {
    if (!child) return;
    child.data.width = 80;  // ❌ Overwrites prerender width!
    // ... label update code ...
  });
}
```

## Solution

The fix adds checks for the `_hasPrerenderData` flag (which is set in the base node constructor when prerender data is present) to **skip dimension standardization** when using prerendered data.

### Fix 1: `standardizeChildDimensions()` method

```javascript
// NEW CODE - Skip standardization when using prerender
standardizeChildDimensions() {
  // Skip standardization if using prerender data - preserve the prerendered dimensions
  if (this._hasPrerenderData) {
    return;  // ✅ Exit early, preserve prerender widths
  }

  const isRoleMode = this.data.layout.displayMode === DisplayMode.ROLE;
  const standardWidth = isRoleMode ? 80 : 150;
  const standardHeight = 44;

  [this.stagingNode, this.archiveNode, this.transformNode].forEach((child) => {
    if (!child) return;
    
    child.data.width = standardWidth;
    child.data.height = standardHeight;
    
    if (typeof child.resize === 'function') {
      child.resize({ width: standardWidth, height: standardHeight });
    }
  });
}
```

### Fix 2: `initChildren()` role mode handling

```javascript
// NEW CODE - Conditional handling based on prerender
if (this.data.layout.displayMode === DisplayMode.ROLE && !this._hasPrerenderData) {
  // Standard mode: force to 80px width
  [this.stagingNode, this.archiveNode, this.transformNode].forEach((child) => {
    if (!child) return;
    child.data.width = 80;
    // ... update labels ...
  });
} else if (this.data.layout.displayMode === DisplayMode.ROLE && this._hasPrerenderData) {
  // Prerender mode: keep prerendered width, only update labels
  [this.stagingNode, this.archiveNode, this.transformNode].forEach((child) => {
    if (!child) return;
    const roleText = child.data.role || child.data.category || child.data.label;
    if (typeof child.redrawText === 'function') {
      child.redrawText(roleText, child.data.width);  // ✅ Use existing width
    } else {
      child.data.label = roleText;
    }
  });
}
```

## Testing

A test file `test-prerender-width-fix.html` has been created to verify the fix. It displays two dashboards side-by-side:

1. **With Prerender Data** (`dwh-1.prerender.json`)
   - Expected: Archive width = **126.67px** ✅
   
2. **Without Prerender Data** (`dwh-1.json`)
   - Expected: Archive width = **80px** (standard) ✅

### To Run the Test

```powershell
cd c:\repo\jeroen\flowdash\dashboard
python -m http.server 8001
```

Then open: <http://localhost:8001/test-prerender-width-fix.html>

Check the browser console for verification output showing the actual widths.

## Impact

This fix ensures that:

1. ✅ **Prerendered dimensions are preserved** - Nodes with prerender data maintain their exact calculated dimensions
2. ✅ **Standard layout still works** - Nodes without prerender data continue to use the standard dimension calculation
3. ✅ **No breaking changes** - The fix only affects prerender mode, non-prerender layouts are unchanged
4. ✅ **Consistent behavior** - Both `standardizeChildDimensions()` and role mode handling now respect prerender data

## Files Modified

- `c:\repo\jeroen\flowdash\dashboard\js\nodeAdapter.js`
  - Updated `standardizeChildDimensions()` method (line ~256)
  - Updated `initChildren()` role mode handling (line ~218)
  - Updated `initializeNodeDataStatic()` child normalization (line ~130)
  - Updated `getOrCreateChildNodeForRole()` role mode check (line ~374)
  - Updated `initChildNode()` copyChild width setting (line ~413)

## Files Added

- `c:\repo\jeroen\flowdash\dashboard\test-prerender-width-fix.html`
  - Test file to verify the fix works correctly
