# FlowDash Layout Properties Reference

This document provides a comprehensive overview of all `layout` properties available across different node types in FlowDash.

## Table of Contents

- [Common Layout Properties](#common-layout-properties)
- [Node Type Specific Properties](#node-type-specific-properties)
  - [BaseNode / RectangularNode](#basenode--rectangularnode)
  - [CircleNode](#circlenode)
  - [BaseContainerNode](#basecontainernode)
  - [AdapterNode](#adapternode)
  - [MartNode](#martnode)
  - [FoundationNode](#foundationnode)
  - [ColumnsNode](#columnsnode)
  - [LaneNode](#lanenode)
  - [GroupNode](#groupnode)

---

## Common Layout Properties

These properties are available on **BaseContainerNode** and all container node types that extend it.

### `minimumSize`

Defines the minimum dimensions for a container node.

**Type:** `Object`

**Properties:**
- `width` (number): Minimum width in pixels. Default: `0`
- `height` (number): Minimum height in pixels. Default: `0`
- `useRootRatio` (boolean): Whether to maintain aspect ratio from root settings. Default: `false`

**Example:**
```javascript
{
  layout: {
    minimumSize: {
      width: 200,
      height: 100,
      useRootRatio: false
    }
  }
}
```

---

## Node Type Specific Properties

### BaseNode / RectangularNode

Simple rectangular nodes that don't contain children.

#### `layoutMode`

Controls how the node's width is calculated based on its text content.

**Type:** `string`

**Possible Values:**
- `'default'` - Uses provided width or default (150px), expands to fit text with padding
- `'auto-size'` - Calculates width based on text, minimum 60px
- `'fixed-size'` - Uses exact dimensions without expansion based on text

**Default:** `'default'`

**Example:**
```javascript
{
  layout: {
    layoutMode: 'auto-size'  // Node will resize to fit text
  }
}
```

---

### CircleNode

Circular nodes with radius-based sizing.

**No specific layout properties.** Circle nodes use `radius` property directly on the node data, not in the layout object.

**Example:**
```javascript
{
  radius: 30  // Not in layout object
}
```

---

### BaseContainerNode

Base class for all container nodes. These properties are inherited by all container types.

#### `minimumSize`

See [Common Layout Properties](#common-layout-properties) above.

#### `minimumColumnWidth`

*(Used by ColumnsNode)* Minimum width for each column.

**Type:** `number`

**Default:** `0`

---

### AdapterNode

Container representing data pipeline adapters with staging, archive, and transform components.

#### `displayMode`

Controls how child nodes (staging/archive/transform) are displayed.

**Type:** `string`

**Possible Values:**
- `'full'` - Shows full labels with descriptive text (e.g., "Staging MyAdapter")
- `'role'` - Shows only role names (e.g., "staging", "archive", "transform")

**Default:** `'full'`

**Child Node Width:**
- Role mode: `80px` per child
- Full mode: `150px` per child

#### `mode`

Determines which child components are created and displayed.

**Type:** `string`

**Possible Values:**
- `'manual'` - No automatic child creation
- `'full'` - Creates staging, archive, and transform nodes
- `'archive-only'` - Creates only archive node
- `'staging-archive'` - Creates staging and archive nodes
- `'staging-transform'` - Creates staging and transform nodes

**Default:** `'full'`

#### `arrangement`

Controls the visual layout of child components.

**Type:** `number` (integer 1-5)

**Possible Values:**
1. **Arrangement 1** - Full Archive Layout
   - Archive on top row (aligned with 2/3 of staging width)
   - Staging bottom left, Transform bottom right
   - Total width: staging + spacing + transform (or archive width, whichever is larger)

2. **Arrangement 2** - Full Transform Layout
   - Archive top left, Transform top right (same row as staging)
   - Staging bottom left
   - Two-column layout with vertical stacking

3. **Arrangement 3** - Full Staging Layout
   - Staging on left (tall, spans full height)
   - Archive top right, Transform bottom right
   - Staging height = archive height + spacing + transform height

4. **Arrangement 4** - Horizontal Line
   - Two nodes in horizontal row (staging + archive OR staging + transform)
   - Used for `'staging-archive'` and `'staging-transform'` modes

5. **Arrangement 5** - Single Node
   - Single archive node (centered)
   - Used for `'archive-only'` mode

**Default:** `1` (validated and defaults to 1 if invalid)

**Size Impact:**
- Arrangements 4-5: Height = 44px
- Arrangement 5 (archive-only):
  - Role mode: Width = 96px (80 + margins)
  - Full mode: Width = 166px (150 + margins)

**Example:**
```javascript
{
  layout: {
    displayMode: 'role',
    mode: 'full',
    arrangement: 1
  }
}
```

---

### MartNode

Container representing data marts with load and report components.

#### `displayMode`

Controls how child nodes (load/report) are displayed.

**Type:** `string`

**Possible Values:**
- `'full'` - Shows full descriptive labels
- `'role'` - Shows only role names ("load", "report")

**Default:** `'role'`

**Child Node Width:**
- Role mode: `120px` per child
- Full mode: `150px` per child

#### `orientation`

Controls the arrangement direction of load and report nodes.

**Type:** `string`

**Possible Values:**
- `'horizontal'` - Load left, report right (default)
- `'horizontal_line'` - Same as horizontal
- `'vertical'` - Load top, report bottom
- `'rotate90'` - Same as vertical
- `'rotate270'` - Report top, load bottom (reversed vertical)

**Default:** `'horizontal'`

#### `mode`

Determines child component creation behavior.

**Type:** `string`

**Possible Values:**
- `'manual'` - No automatic child creation
- `'auto'` - Automatically creates load and report nodes

**Default:** `'auto'`

**Size Impact (Role Mode):**
- Horizontal spacing: `20px`
- Vertical margins: `16px` (8px left + 8px right)
- Height: `60px`
- Width: `roleWidth + roleWidth + spacing + margins` = `120 + 120 + 20 + 16 = 276px`

**Example:**
```javascript
{
  layout: {
    displayMode: 'role',
    orientation: 'vertical',
    mode: 'auto'
  }
}
```

---

### FoundationNode

Container representing foundation data layers with raw and base components.

#### `displayMode`

Controls how child nodes (raw/base) are displayed.

**Type:** `string`

**Possible Values:**
- `'full'` - Shows full descriptive labels
- `'role'` - Shows only role names ("raw", "base")

**Default:** `'role'`

**Child Node Width:**
- Role mode: `80px` per child
- Full mode: `150px` per child

#### `orientation`

Controls the arrangement direction of raw and base nodes.

**Type:** `string`

**Possible Values:**
- `'horizontal'` - Raw left, base right (default)
- `'horizontal_line'` - Same as horizontal
- `'vertical'` - Raw top, base bottom
- `'rotate90'` - Same as vertical
- `'rotate270'` - Base top, raw bottom (reversed vertical)

**Default:** `'horizontal'`

#### `mode`

Determines child component creation behavior.

**Type:** `string`

**Possible Values:**
- `'manual'` - No automatic child creation
- `'auto'` - Automatically creates raw and base nodes

**Default:** `'auto'`

**Size Impact (Role Mode):**
- Width: `80 + 80 + 20 + 16 = 196px` (two roles + spacing + margins)
- Height: `44px`

**Example:**
```javascript
{
  layout: {
    displayMode: 'role',
    orientation: 'horizontal',
    mode: 'auto'
  }
}
```

---

### ColumnsNode

Container that arranges children in a horizontal row (columns).

#### `minimumColumnWidth`

Minimum width for each column/child node.

**Type:** `number`

**Default:** `0`

**Note:** This property is defined in the base class but primarily used by ColumnsNode for horizontal layouts.

**Example:**
```javascript
{
  layout: {
    minimumColumnWidth: 100,
    minimumSize: {
      height: 60,
      useRootRatio: false
    }
  }
}
```

**Layout Behavior:**
- Children are arranged horizontally (left to right)
- Horizontal spacing between children: `20px` (from settings)
- Container width = sum of child widths + spacing + margins
- Container height = max child height + header + margins

---

### LaneNode

Container that arranges children in a vertical stack (lanes).

**No specific layout properties beyond base container.**

Uses `minimumSize` from BaseContainerNode.

**Layout Behavior:**
- Children are stacked vertically (top to bottom)
- Vertical spacing between children: `10px` (from settings)
- Container width = max child width + margins
- Container height = sum of child heights + spacing + header + margins

**Example:**
```javascript
{
  layout: {
    minimumSize: {
      width: 150,
      height: 100,
      useRootRatio: false
    }
  }
}
```

---

### GroupNode

General-purpose container that maintains relative positions of children.

**No specific layout properties beyond base container.**

Uses `minimumSize` from BaseContainerNode.

**Layout Behavior:**
- Preserves existing relative positions of children
- Normalizes positions to be centered around (0,0)
- Sizes container to fit all children with margins

**Example:**
```javascript
{
  layout: {
    minimumSize: {
      width: 200,
      height: 150,
      useRootRatio: true
    }
  }
}
```

---

## Pre-render Layout Data

All nodes support pre-render data to improve initial load performance.

### `prerender`

Contains cached position and size information from a previous render.

**Type:** `Object`

**Properties:**
- `x` (number): Pre-calculated x position
- `y` (number): Pre-calculated y position
- `width` (number): Pre-calculated width
- `height` (number): Pre-calculated height
- `minimumSize` (object, optional): Pre-calculated minimum size for containers
  - `width` (number): Minimum width
  - `height` (number): Minimum height

**Example:**
```javascript
{
  prerender: {
    x: 150,
    y: 200,
    width: 180,
    height: 60,
    minimumSize: {
      width: 150,
      height: 44
    }
  }
}
```

**Note:** Pre-render data is typically generated automatically using the `generatePrerenderData()` utility function and should not be manually created.

---

## Summary Table

| Node Type | Layout Properties | Possible Values |
|-----------|------------------|----------------|
| **RectangularNode** | `layoutMode` | `'default'`, `'auto-size'`, `'fixed-size'` |
| **CircleNode** | *(none)* | Uses `radius` on node data |
| **AdapterNode** | `displayMode` | `'full'`, `'role'` |
|  | `mode` | `'manual'`, `'full'`, `'archive-only'`, `'staging-archive'`, `'staging-transform'` |
|  | `arrangement` | `1`, `2`, `3`, `4`, `5` |
| **MartNode** | `displayMode` | `'full'`, `'role'` |
|  | `orientation` | `'horizontal'`, `'horizontal_line'`, `'vertical'`, `'rotate90'`, `'rotate270'` |
|  | `mode` | `'manual'`, `'auto'` |
| **FoundationNode** | `displayMode` | `'full'`, `'role'` |
|  | `orientation` | `'horizontal'`, `'horizontal_line'`, `'vertical'`, `'rotate90'`, `'rotate270'` |
|  | `mode` | `'manual'`, `'auto'` |
| **ColumnsNode** | `minimumColumnWidth` | Any number >= 0 |
| **LaneNode** | *(none specific)* | Uses base container properties |
| **GroupNode** | *(none specific)* | Uses base container properties |
| **All Containers** | `minimumSize.width` | Any number >= 0 |
|  | `minimumSize.height` | Any number >= 0 |
|  | `minimumSize.useRootRatio` | `true`, `false` |

---

## Related Documentation

- See `configManager.js` for default settings and configuration merging
- See `zoomManager.js` for layout-related zoom and fit calculations
- See `zones/` directory for zone-based layout system implementation

---

*Last Updated: 2024*
