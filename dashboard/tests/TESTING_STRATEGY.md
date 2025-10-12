# Playwright Testing Strategy for D3 Dashboard

## Overview

This document outlines the testing strategy for the D3 dashboard project using [Playwright](https://playwright.dev/). The goal is to ensure robust, reliable, and maintainable end-to-end (E2E) tests that verify user-visible behavior across supported browsers, with a focus on Chromium and WebKit.

---

## 1. Test Scope and Philosophy

- **User-Centric:**
  Tests focus on user-visible behavior, interacting with the dashboard as a real user would (e.g., loading data, clicking buttons, verifying rendered nodes).
- **Isolation:**
  Each test is independent, with no reliance on the state or outcome of other tests.
- **No Third-Party Testing:**
  Tests do not depend on external sites or APIs; all data and assets are local and controlled.
- **Comprehensive Coverage:**
  Tests cover all major dashboard components: edges, nodes, groups, and their interactions.

---

## 2. Browser Coverage

- **Primary Browsers:**
  - **Chromium** (Desktop Chrome)
  - **WebKit** (Desktop Safari)
- **Excluded:**
  - **Firefox** is excluded due to company policy.
- **How to Run:**
  By default, tests run on both Chromium and WebKit. To run only on Chromium:
  ```sh
  npx playwright test --project=chromium
  ```

---

## 3. Test Organization

- **Test Directory:**
  All Playwright tests are located in `dashboard/tests/`.
- **Test Files:**
  Each major feature or component has its own test file:
  - `dashboard.spec.js` - Main dashboard functionality
  - `edges.spec.js` - Edge rendering and behavior tests
  - `nodes.spec.js` - Node rendering and layout tests
  - `groups.spec.js` - Grouping and organization tests
  - `integration.spec.js` - Complex scenarios combining multiple components
- **Test Structure:**
  - Use `test.describe` to group related tests.
  - Use `test.beforeEach` to set up the page state (e.g., navigate to the dashboard, select a data file).

---

## 4. Test Data and Initialization

- **Local Data:**
  All test data (JSON files) are stored in `dashboard/data/`.
- **Test Pages:**
  Individual test scenarios are available as HTML pages in:
  - `4_edges/` - Edge rendering scenarios
  - `5_nodes/` - Node layout scenarios  
  - `6_groups/` - Grouping scenarios
- **Initialization:**
  Tests ensure the dashboard is loaded with a known dataset by selecting a file from the dropdown before running assertions.
  ```js
  await page.goto('/7_dashboard/flowdash-js.html');
  await page.selectOption('#fileSelect', { label: 'dwh-1.json' });
  await page.waitForSelector('g.node-container');
  ```

---

## 5. Comprehensive Test Case Coverage

### 5.1 Edge Test Cases

| Test Case | Description | Covered By | Status |
|-----------|-------------|------------|---------|
| **Simple Edge** | Basic edge between two nodes | `4_edges/40_edges/1_simple.html` | ✅ |
| **Node-to-Node Edge** | Edge connecting different node types | `4_edges/40_edges/2_nodes.html` | ✅ |
| **Edge Demo Layouts** | Various edge layout patterns (grid, shifted, stairs) | `4_edges/40_edges/3_demo.html` | ✅ |
| **Curved Edges** | Curved edge rendering with different layouts | `4_edges/40_edges/4_curved.html` | ✅ |
| **Column Layout Edges** | Edges in column-based layouts | `4_edges/40_edges/5_columns.html` | ✅ |
| **Adapter Column Edges** | Edges connecting adapter nodes in columns | `4_edges/40_edges/6_adapterColumns.html` | ✅ |
| **Columns with Lane Edges** | Edges in mixed column-lane layouts | `4_edges/40_edges/7_columnsWithLane.html` | ✅ |
| **Adapter Columns with Lane** | Complex edge scenarios with adapters and lanes | `4_edges/40_edges/8_adapterColumnsWithLane.html` | ✅ |
| **Grouped Edges** | Edges within grouped node structures | `4_edges/40_edges/9_grouped.html` | ✅ |
| **Edge Curves** | Basic curve rendering techniques | `4_edges/20_curves/curve.html` | ✅ |
| **Edge Markers** | Endpoint markers and styling | `4_edges/30_endpoints/markers.js` | ✅ |
| **Edge Crossing** | Edges that cross over each other | ❌ | 🔄 |
| **Edge States** | Different edge states (active, inactive, error) | ❌ | 🔄 |
| **Edge Types** | Different edge types (SSIS, API, etc.) | ❌ | 🔄 |
| **Edge Labels** | Edge labels and annotations | ❌ | 🔄 |

### 5.2 Node Test Cases

| Test Case | Description | Covered By | Status |
|-----------|-------------|------------|---------|
| **Rectangle Node Basic** | Basic rectangular node rendering | `5_nodes/01_rectNode/node.html` | ✅ |
| **Rectangle Node Layout** | Rectangle node with different layouts | `5_nodes/01_rectNode/rectangleNode.html` | ✅ |
| **Single Adapter Node** | Basic adapter node rendering | `06_adapterNodes/01_single/01_single.html` | ✅ |
| **Adapter Full Layouts** | All adapter layout variations | `06_adapterNodes/02_layouts_full/02_layouts_full.html` | ✅ |
| **Adapter Long Text** | Adapter nodes with long text content | `5_nodes/10_adapter/02_layouts_full_long_text.html` | ✅ |
| **Adapter Role Layouts** | Adapter nodes with role-based layouts | `5_nodes/10_adapter/03_layouts_role.html` | ✅ |
| **Adapter in Columns** | Adapter nodes in column layouts | `5_nodes/10_adapter/04_columns.html` | ✅ |
| **Adapter with Curved Edges** | Adapter nodes with curved connections | `5_nodes/10_adapter/05_curved.html` | ✅ |
| **Single Foundation Node** | Basic foundation node rendering | `5_nodes/11_foundation/01_single.html` | ✅ |
| **Multiple Foundation Nodes** | Multiple foundation nodes together | `5_nodes/11_foundation/02_three.html` | ✅ |
| **Foundation in Columns** | Foundation nodes in column layouts | `5_nodes/11_foundation/03_columns.html` | ✅ |
| **Foundation Full Layout** | Foundation nodes with full layout options | `5_nodes/11_foundation/04_full.html` | ✅ |
| **CSS Theming** | Node styling and theming | `5_nodes/12_css/01_default_theme.html` | ✅ |
| **Node Interaction** | Click, hover, drag interactions | ❌ | 🔄 |
| **Node States** | Different node states (ready, error, processing) | ❌ | 🔄 |
| **Node Sizing** | Dynamic node sizing based on content | ❌ | 🔄 |
| **Node Tooltips** | Node tooltips and information display | ❌ | 🔄 |

### 5.3 Group Test Cases

| Test Case | Description | Covered By | Status |
|-----------|-------------|------------|---------|
| **Simple Group** | Basic group with multiple nodes | `6_groups/60_grouping/01_simple_group.html` | ✅ |
| **Nested Groups** | Groups within groups | `6_groups/60_grouping/02_nested_group.html` | ✅ |
| **Simple Lane** | Basic lane layout | `6_groups/61_lane/01_simple_lane.html` | ✅ |
| **Three Adapters in Lane** | Multiple adapters in lane layout | `6_groups/61_lane/02_threeAdapters.html` | ✅ |
| **Nested Lanes** | Lanes within lanes | `6_groups/61_lane/03_nested.html` | ✅ |
| **Complex Lane Layout** | Complex lane scenarios | `6_groups/61_lane/04_complex.html` | ✅ |
| **Simple Columns** | Basic column layout | `6_groups/62_columns/01_simple_columns.html` | ✅ |
| **Adapters in Columns** | Adapter nodes in column layout | `6_groups/62_columns/02_adapters.html` | ✅ |
| **Nested Columns** | Columns within columns | `6_groups/62_columns/03_nested.html` | ✅ |
| **Columns with Lane** | Mixed column and lane layouts | `6_groups/62_columns/04_lane.html` | ✅ |
| **Multiple Lanes** | Multiple lane layouts | `6_groups/62_columns/04_lanes.html` | ✅ |
| **Advanced Lanes** | Advanced lane and group layouts | `6_groups/63_lanes/lanes.html` | ✅ |
| **Group Collapse/Expand** | Group interaction behaviors | ❌ | 🔄 |
| **Group Drag** | Dragging entire groups | ❌ | 🔄 |
| **Group Resize** | Dynamic group sizing | ❌ | 🔄 |
| **Group Labels** | Group title and label rendering | ❌ | 🔄 |

**Legend:**
- ✅ **Covered** - Test page exists and can be automated
- 🔄 **Missing** - Test case identified but no page exists yet
- ❌ **Not Covered** - Test case not yet identified

---

## 6. Playwright Implementation Strategy

### 6.1 Test Structure for Individual Components

```js
// Example: edges.spec.js
import { test, expect } from '@playwright/test';

test.describe('Edge Rendering Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/flowdash-js.html');
  });

  test.describe('Simple Edge Scenarios', () => {
    test('should render simple edge between two nodes', async ({ page }) => {
      // Load specific test data
      await page.selectOption('#fileSelect', { label: 'edge-simple.json' });
      await page.waitForSelector('g.node-container');
      
      // Verify edge rendering
      const edges = page.locator('path.edge');
      await expect(edges).toHaveCount(1);
      
      // Verify edge connects correct nodes
      const sourceNode = page.locator('g.node-container[data-id="source"]');
      const targetNode = page.locator('g.node-container[data-id="target"]');
      await expect(sourceNode).toBeVisible();
      await expect(targetNode).toBeVisible();
    });
  });
});
```

### 6.2 Test Data Management

Create specific test data files for each scenario:

```js
// dashboard/data/test-scenarios/
// edge-simple.json
// edge-curved.json
// node-adapter-single.json
// group-simple.json
// etc.
```

### 6.3 Automated Test Generation

Create a test generator that can automatically create tests from existing HTML pages:

```js
// test-generator.js
const testPages = [
  { path: '4_edges/40_edges/1_simple.html', category: 'edges', name: 'simple' },
  { path: '4_edges/40_edges/4_curved.html', category: 'edges', name: 'curved' },
  // ... more pages
];

// Generate test files automatically
```

### 6.4 Visual Regression Testing

Implement visual regression tests for critical scenarios:

```js
test('edge rendering should match baseline', async ({ page }) => {
  await page.goto('/4_edges/40_edges/1_simple.html');
  await page.waitForSelector('svg');
  
  // Take screenshot and compare with baseline
  await expect(page.locator('svg')).toHaveScreenshot('simple-edge.png');
});
```

---

## 7. Selectors and Assertions

- **Selectors:**
  - Use stable, user-facing selectors (e.g., `g.node-container`, `.zoom-button`).
  - Avoid relying on implementation details that may change.
  - Use data attributes for reliable selection: `[data-id="node-id"]`
- **Assertions:**
  - Check for the presence and correct positioning of nodes, headers, and controls.
  - Use Playwright's `expect` API for robust assertions.
  - Prefer soft assertions for non-critical checks to gather more feedback per run.
  - Verify visual properties: position, size, color, visibility

---

## 8. Parallelism and Performance

- **Parallel Execution:**
  Playwright runs tests in parallel by default for speed.
- **Sharding (CI):**
  For large suites, use sharding to split tests across multiple CI machines.
- **Test Categories:**
  - **Fast Tests** (< 5s): Basic rendering, simple interactions
  - **Medium Tests** (5-15s): Complex layouts, multiple components
  - **Slow Tests** (> 15s): Large datasets, complex interactions

---

## 9. Web Server Configuration

- **Local Server:**
  The dashboard is served via Python's HTTP server on port 8000.
- **Base URL:**
  Set in Playwright config to `http://localhost:8000` for consistent test navigation.
- **Test Pages:**
  Individual test pages are accessible via the main index.html navigation.

---

## 10. Continuous Integration (CI)

- **CI Setup:**
  - Only install required browsers (Chromium, WebKit).
  - Run tests on every commit and pull request.
  - Upload Playwright reports as CI artifacts.
  - Run visual regression tests on main branch only.
- **Example CI Command:**
  ```sh
  npx playwright install chromium webkit --with-deps
  npx playwright test
  npx playwright show-report
  ```

---

## 11. Test Implementation Priority

### Phase 1: Core Functionality (High Priority)
1. **Edge Rendering Tests** - All existing edge scenarios
2. **Node Rendering Tests** - All existing node scenarios  
3. **Group Rendering Tests** - All existing group scenarios
4. **Basic Interactions** - Click, hover, basic drag

### Phase 2: Advanced Features (Medium Priority)
1. **Complex Layouts** - Mixed scenarios combining multiple components
2. **State Management** - Node/edge states, loading states
3. **Performance Tests** - Large datasets, rendering performance
4. **Accessibility Tests** - Keyboard navigation, screen reader support

### Phase 3: Edge Cases (Lower Priority)
1. **Error Handling** - Invalid data, network errors
2. **Browser Compatibility** - Cross-browser specific issues
3. **Visual Regression** - Automated visual testing
4. **Stress Tests** - Very large datasets, rapid interactions

---

## 12. Sample Test Implementation

```js
import { test, expect } from '@playwright/test';

test.describe('Dashboard Component Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/flowdash-js.html');
  });

  test.describe('Edge Scenarios', () => {
    test('simple edge between two nodes', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'edge-simple.json' });
      await page.waitForSelector('g.node-container');
      
      const edges = page.locator('path.edge');
      const nodes = page.locator('g.node-container');
      
      await expect(edges).toHaveCount(1);
      await expect(nodes).toHaveCount(2);
    });

    test('curved edges render correctly', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'edge-curved.json' });
      await page.waitForSelector('path.edge');
      
      const curvedEdges = page.locator('path.edge[d*="C"]'); // Curved paths
      await expect(curvedEdges).toHaveCount.greaterThan(0);
    });
  });

  test.describe('Node Scenarios', () => {
    test('adapter nodes render with correct layout', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'node-adapter.json' });
      await page.waitForSelector('g.node-container');
      
      const adapterNodes = page.locator('g.node-container[data-type="adapter"]');
      await expect(adapterNodes).toHaveCount.greaterThan(0);
      
      // Verify layout elements
      const layoutElements = adapterNodes.locator('.layout-element');
      await expect(layoutElements).toBeVisible();
    });
  });

  test.describe('Group Scenarios', () => {
    test('simple group contains child nodes', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'group-simple.json' });
      await page.waitForSelector('g.node-container');
      
      const groupNodes = page.locator('g.node-container[data-type="group"]');
      const childNodes = page.locator('g.node-container[data-parent]');
      
      await expect(groupNodes).toHaveCount(1);
      await expect(childNodes).toHaveCount.greaterThan(0);
    });
  });
});
```

---

## 13. Troubleshooting

- **No Nodes Found:**
  Ensure a data file is selected and the dashboard is fully loaded before assertions.
- **Browser Not Allowed:**
  Remove or comment out unsupported browsers in `playwright.config.cjs`.
- **Test Page Not Found:**
  Verify the test page exists and is accessible via the main index.html.
- **Visual Regression Failures:**
  Update baseline images after intentional UI changes.

---

## 14. Next Steps

1. **Create Test Data Files** - Convert existing HTML test pages to JSON data files
2. **Implement Core Tests** - Start with Phase 1 test scenarios
3. **Set Up CI Pipeline** - Configure automated testing
4. **Add Missing Test Cases** - Create HTML pages for identified missing scenarios
5. **Performance Monitoring** - Add performance benchmarks
6. **Documentation** - Maintain test documentation and examples

---

## References

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Test Configuration](https://playwright.dev/docs/test-configuration)
- [Playwright CI Guide](https://playwright.dev/docs/ci)
- [Visual Regression Testing](https://playwright.dev/docs/test-screenshots)

---

This extended strategy ensures comprehensive coverage of your dashboard library's functionality while maintaining the user-centric testing philosophy and providing a clear roadmap for implementation. 