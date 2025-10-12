# Pre-Render Feature Usage Guide

## Quick Start

### 1. Generate Pre-Render Data

Use the standalone generator tool:

```bash
# Start a web server
python -m http.server 8000

# Open http://localhost:8000/dashboard/prerender-generator.html
# Drag and drop your dashboard JSON file
# Click "Download Enhanced JSON"
```

### 2. Use Pre-Rendered Dashboard

Load the enhanced JSON in your application:

```javascript
// The dashboard will automatically detect and use pre-render data
const dashboard = new Dashboard(enhancedDashboardData);
await dashboard.initialize('#container');
```

## API Usage

### Generate Pre-Render Data Programmatically

```javascript
import { generatePrerenderData } from './js/dashboard.js';

// Load your original dashboard data
const dashboardData = await fetch('my-dashboard.json').then(r => r.json());

// Generate pre-render data
const enhanced = await generatePrerenderData(dashboardData);

// Save or use the enhanced data
console.log(`Added pre-render data for ${enhanced.settings.prerenderMetadata.nodeCount} nodes`);
```

### Check if Dashboard Has Pre-Render Data

```javascript
import { hasPrerenderData } from './js/dashboard.js';

if (hasPrerenderData(dashboardData)) {
  console.log('Dashboard has pre-render data - fast loading enabled');
} else {
  console.log('Dashboard will use standard layout calculation');
}
```

## Data Structure

Pre-render data is embedded in each node:

```json
{
  "id": "node-1",
  "label": "My Node",
  "prerender": {
    "x": 100.5,
    "y": 200.25,
    "width": 334,
    "height": 74
  },
  "children": [...]
}
```

And in each edge:

```json
{
  "id": "edge-1",
  "source": "node-1",
  "target": "node-2",
  "prerender": {
    "path": "M100,200L150,250..."
  }
}
```

Settings are updated to indicate pre-render availability:

```json
{
  "settings": {
    "usePrerender": true,
    "prerenderMetadata": {
      "version": "1.0",
      "generated": "2024-01-15T10:30:00.000Z",
      "generatedBy": "flowdash-prerender-generator",
      "nodeCount": 885,
      "edgeCount": 1240,
      "expandedState": true,
      "statusRulesApplied": false
    }
  }
}
```

## Performance Benefits

Expected improvements for large dashboards:
- **885 nodes**: ~45% faster (40s → 22s)
- **Layout calculation**: Skip entirely with pre-render
- **Initial render**: Immediate positioning
- **Status rules**: Deferred to after render

## Implementation Status

**Phase 1: Complete** ✅
- Generator tool (`prerender-generator.html`)
- Core API functions (`generatePrerenderData`, etc.)
- Data structure cleanup (width/height placement, default removal)

**Phase 2: Pending** 🔨
- Dashboard fast-path loading
- Apply pre-render positions during node creation
- Skip layout calculations when pre-render available
- Two-pass rendering (fast render → deferred status)

## Related Documentation

- [Pre-Render Design Specification](./documentation/pre-render.md)
- [Implementation Plan](./PRERENDER_IMPLEMENTATION_PLAN.md)
- [Quick Start Guide](./PRERENDER_QUICKSTART.md)

## Testing

Test with the sample dashboard:

```bash
# Generate pre-render data
# 1. Open prerender-generator.html
# 2. Load tests/data/dwh-1.json (4 nodes)
# 3. Verify output has prerender objects
# 4. Download enhanced JSON

# Verify structure
node -e "console.log(JSON.stringify(require('./dwh-1-enhanced.json').nodes[0], null, 2))"
```

Expected output structure:
```json
{
  "id": "root",
  "label": "Root Node",
  "prerender": {
    "x": 100,
    "y": 50,
    "width": 300,
    "height": 100
  }
  // Note: width and height NOT at root level
  // Note: no layout.minimumSize if all defaults
}
```
