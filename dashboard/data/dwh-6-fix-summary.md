# Fix Summary for dwh-6.json

## Problem Identified

The `dwh-6.json` file was not displaying in the flowdash dashboard because it was **missing required `id` properties** on all nodes.

## What Was Wrong

1. **Missing Node IDs**: Every node in the hierarchy was missing an `id` property
   - The dashboard requires unique IDs for node referencing, edge connections, and state management
   - Without IDs, the dashboard couldn't create proper node instances

2. **Settings Structure Issue**: Some settings were at the root level instead of inside a `settings` object
   - Properties like `showGhostlines`, `curved`, `showBoundingBox` were at root level
   - Should be inside `settings: { ... }`

3. **Missing State Properties**: While not critical, nodes typically have a `state` property (e.g., "Updated", "Ready", "Unknown")

## What Was Fixed

The PowerShell script `scripts/add-node-ids.ps1` was created and executed to:

1. **Add Unique IDs**: Generated 885 unique IDs for all nodes in the hierarchy
   - IDs are based on node labels (sanitized and made URL-friendly)
   - Ensures uniqueness by appending numbers when needed
   - Format: `label-text` or `label-text-1`, `label-text-2`, etc.

2. **Restructure Settings**: Moved root-level settings into a proper `settings` object

3. **Preserve Original**: Created `dwh-6.fixed.json` while keeping the original `dwh-6.json` intact

## Fixed File Location

- **Original File**: `dashboard/data/dwh-6.json` (preserved)
- **Fixed File**: `dashboard/data/dwh-6.fixed.json` (ready to use)

## Verification

The fixed JSON file:
- ✓ Is syntactically valid JSON
- ✓ Contains 885 nodes with unique IDs
- ✓ Has properly structured settings
- ✓ Should now display correctly in the dashboard

## How to Use the Fix Script

If you receive another JSON file without IDs, run:

```powershell
.\scripts\add-node-ids.ps1 -InputFile ".\dashboard\data\your-file.json"
```

This will create `your-file.fixed.json` with all IDs added.

### Optional: Specify Output File

```powershell
.\scripts\add-node-ids.ps1 -InputFile ".\dashboard\data\your-file.json" -OutputFile ".\dashboard\data\output.json"
```

## Required JSON Structure for Dashboard

For a JSON file to work with the dashboard, it must have:

**Note:** For complete settings documentation, see `documentation/settings.md`

```json
{
  "settings": {
    "showCenterMark": false,
    "showConnectionPoints": false,
    "showGhostlines": false,
    "curved": true,
    "showBoundingBox": false,
    "toggleCollapseOnStatusChange": true
  },
  "nodes": [
    {
      "id": "unique-id-1",        // REQUIRED
      "label": "Node Label",
      "type": "Lane",
      "category": "Unknown",
      "children": [
        {
          "id": "unique-id-2",    // REQUIRED for every node
          "label": "Child Node",
          // ... more properties
        }
      ]
    }
  ],
  "edges": [
    {
      "sourceName": "source-label",
      "targetName": "target-label"
    }
  ]
}
```

## Testing

To test the fixed file:

1. Open `flowdash-js.html` in a browser
2. The file dropdown now includes "dwh-6.fixed.json"
3. It should be selected by default (index 7)
4. The dashboard should render the complete hierarchy with all 885 nodes

## Prevention

When exporting or generating JSON files for the dashboard:

1. Always include an `id` property for every node
2. Ensure IDs are unique across the entire hierarchy
3. Place all display settings inside a `settings` object at the root level
4. Validate JSON structure before attempting to load in the dashboard

## Script Details

The `add-node-ids.ps1` script:
- Recursively traverses all nodes
- Generates human-readable IDs from labels
- Tracks existing IDs to prevent duplicates
- Logs each ID assignment for verification
- Validates the output JSON
- Preserves the original file

Total processing time: ~1 second for 885 nodes
