# Pre-Render Generator Fixes - October 11, 2025

## Issues Fixed

### 1. ✅ Remove Default Layout Block
**Problem**: Columns nodes (and other nodes) were getting empty or default-only `layout` blocks in the output.

**Solution**: 
- More aggressive cleanup of layout properties
- Remove `layout.mode` if it's "vertical" (default)
- Remove `layout.padding` if it's 0 (default)
- Remove `layout.spacing` if it's 0 (default)
- Only include `layout` object if it has non-default properties

**Example Before**:
```json
{
  "id": "columns-1",
  "type": "columns",
  "layout": {
    "minimumSize": {
      "width": 0,
      "height": 0,
      "useRootRatio": false
    }
  }
}
```

**Example After**:
```json
{
  "id": "columns-1",
  "type": "columns",
  "prerender": {
    "x": 100,
    "y": 200,
    "width": 300,
    "height": 400
  }
}
```

### 2. ✅ Prerender Before Children
**Problem**: The `prerender` object was appearing after `children` in the JSON output, making it harder to read.

**Solution**: 
- Rebuilt object property order in `extractNodePositionsFromTree()`
- Property order now: basic props → `prerender` → `layout` (if needed) → `children`

**Example Before**:
```json
{
  "id": "parent",
  "type": "foundation",
  "children": [...],
  "prerender": {...}
}
```

**Example After**:
```json
{
  "id": "parent",
  "type": "foundation",
  "prerender": {
    "x": 100,
    "y": 200,
    "width": 300,
    "height": 400
  },
  "children": [...]
}
```

### 3. ✅ Edge Prerender Information
**Problem**: Need to verify edges have prerender path data.

**Solution**:
- Improved edge path extraction to properly query DOM structure
- Edge structure: `<g class="edge type" id="source--type--target"><path class="path" d="..."/></g>`
- Extracts `d` attribute from path element
- Adds logging to show how many edges have paths extracted

**Example Edge Output**:
```json
{
  "id": "node1--uses--node2",
  "source": "node1",
  "target": "node2",
  "type": "uses",
  "prerender": {
    "path": "M100,200L150,250C160,260,170,270,180,280L200,300"
  }
}
```

## Code Changes

### File: `dashboard/js/dashboard.js`

**Function: `extractNodePositionsFromTree()`**
- Changed from `{ ...nodeData }` spread to explicit property ordering
- Added removal of default layout properties (mode, padding, spacing)
- Ensures prerender comes before children in object order

**Function: `extractEdgePaths()`**
- Changed from querying `path.edge` to `g.edge` (edge groups)
- Then queries child `path.path` for the actual path data
- Better ID matching using source--type--target pattern
- Added console logging for debugging

## Testing Instructions

### 1. Start Server
```powershell
cd C:\repo\jeroen\flowdash
python -m http.server 8000
```

### 2. Open Generator
Navigate to: http://localhost:8000/dashboard/prerender-generator.html

### 3. Test with Sample Data
Load: `dashboard/data/dwh-1.json` (4 nodes)

### 4. Verify Output

**Check Nodes:**
- ✅ No `width` or `height` at root level
- ✅ Has `prerender` object with x, y, width, height
- ✅ `prerender` appears BEFORE `children`
- ✅ No `layout` block if all defaults
- ✅ If `layout` exists, it has non-default values

**Check Edges:**
- ✅ Has `prerender` object with `path` property
- ✅ Path is a valid SVG path string (starts with M, has L/C commands)

**Check Console:**
- Should see: "🎨 Extracted paths for X edges (Y total)"
- X should equal or be close to Y

### 5. Example Valid Output

```json
{
  "nodes": [
    {
      "id": "root",
      "type": "foundation",
      "label": "Root Node",
      "prerender": {
        "x": 500.5,
        "y": 250.25,
        "width": 334,
        "height": 124
      },
      "children": [
        {
          "id": "child1",
          "type": "basic",
          "label": "Child 1",
          "prerender": {
            "x": 300,
            "y": 400,
            "width": 200,
            "height": 80
          }
        }
      ]
    }
  ],
  "edges": [
    {
      "id": "root--contains--child1",
      "source": "root",
      "target": "child1",
      "type": "contains",
      "prerender": {
        "path": "M500.5,312.25L300,360"
      }
    }
  ],
  "settings": {
    "usePrerender": true,
    "prerenderMetadata": {
      "version": "1.0",
      "generated": "2025-10-11T...",
      "generatedBy": "flowdash-prerender-generator",
      "nodeCount": 2,
      "edgeCount": 1,
      "expandedState": true,
      "statusRulesApplied": false
    }
  }
}
```

## Known Behaviors

1. **Property Order**: JavaScript object property order is insertion order for string keys, so our manual ordering should be preserved in JSON.stringify()

2. **Layout Defaults**: The following are considered defaults and will be removed:
   - `minimumSize: { width: 0, height: 0, useRootRatio: false }`
   - `mode: "vertical"`
   - `padding: 0`
   - `spacing: 0`

3. **Edge ID Format**: Edges use format `source--type--target` for ID matching

4. **Missing Edge Paths**: If an edge doesn't have a rendered path (e.g., between collapsed nodes), it won't have prerender data. This is expected.

## Performance Impact

These changes should have minimal impact on generation time:
- Property reordering: Negligible (same number of operations)
- Layout cleanup: Slight improvement (fewer properties to serialize)
- Edge extraction: Slightly better (more targeted DOM queries)

## Next Steps

After verifying these fixes work:
1. Test with larger dashboards (e.g., esr.json with 885 nodes)
2. Verify JSON file size impact (should be smaller due to layout cleanup)
3. Proceed with Phase 2: Dashboard loading modifications to USE the pre-render data
