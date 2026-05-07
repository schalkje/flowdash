import { test, expect } from '@playwright/test';

test.describe('Node Rendering Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main dashboard
    await page.goto('/dashboard/flowdash-js.html');

    // Wait for the page to load and basic elements to appear
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForSelector('#fileSelect', { timeout: 10000 });

    // Wait for the dashboard to be initialized
    await page.waitForFunction(
      () => {
        return window.dashboard !== undefined;
      },
      { timeout: 15000 },
    );

    // Wait a bit more for the dashboard to be fully ready
    await page.waitForTimeout(2000);

    // Add error handling for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    page.on('pageerror', (error) => {
      console.log('Page error:', error.message);
    });
  });

  // Helper function to wait for nodes to be rendered
  async function waitForNodes(page, timeout = 30000) {
    try {
      // First wait for the dashboard to be ready
      await page.waitForFunction(
        () => {
          return window.dashboard && window.dashboard.getStructure;
        },
        { timeout: 10000 },
      );

      // Wait for node-container elements to appear
      await page.waitForSelector('g.node-container', { timeout });

      // Wait a bit more for the nodes to be fully rendered
      await page.waitForTimeout(1000);

      return true;
    } catch (error) {
      console.log('Failed to find node-container elements:', error.message);

      // Debug: Check what elements are actually present
      const svgContent = await page.locator('svg').innerHTML();
      console.log('SVG content:', svgContent.substring(0, 500) + '...');

      // Check if dashboard is properly initialized
      const dashboardStatus = await page.evaluate(() => {
        if (window.dashboard) {
          return {
            initialized: true,
            structure: window.dashboard.getStructure ? window.dashboard.getStructure() : null,
            hasGetStructure: !!window.dashboard.getStructure,
          };
        }
        return { initialized: false };
      });
      console.log('Dashboard status:', dashboardStatus);

      // Check if there are any other elements in the SVG
      const allElements = await page.locator('svg *').count();
      console.log('Total elements in SVG:', allElements);

      return false;
    }
  }

  test.describe('Rectangle Node Tests', () => {
    test('should render basic rectangle nodes', async ({ page }) => {
      // Load test data with rectangle nodes
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });

      // Wait for nodes to be rendered with better error handling
      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const nodes = page.locator('g.node-container');
      await expect(nodes).toHaveCount.greaterThan(0);

      // Verify rectangle node properties
      for (const node of await nodes.all()) {
        const rect = node.locator('rect');
        await expect(rect).toBeVisible();

        // Verify rectangle has dimensions
        const width = await rect.getAttribute('width');
        const height = await rect.getAttribute('height');
        expect(width).toBeTruthy();
        expect(height).toBeTruthy();
        expect(parseFloat(width)).toBeGreaterThan(0);
        expect(parseFloat(height)).toBeGreaterThan(0);
      }
    });

    test('should render rectangle nodes with different layouts', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-2.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const nodes = page.locator('g.node-container');
      const nodeCount = await nodes.count();
      expect(nodeCount).toBeGreaterThan(0);

      // Verify each node has proper structure
      for (let i = 0; i < Math.min(nodeCount, 5); i++) {
        const node = nodes.nth(i);
        const rect = node.locator('rect');
        const text = node.locator('text');

        await expect(rect).toBeVisible();
        await expect(text).toBeVisible();
      }
    });
  });

  test.describe('Adapter Node Tests', () => {
    test('should render single adapter node', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-3.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const adapterNodes = page.locator('g.node-container[data-type="adapter"]');
      await expect(adapterNodes).toHaveCount.greaterThan(0);

      // Verify adapter node structure
      for (const node of await adapterNodes.all()) {
        const rect = node.locator('rect');
        const text = node.locator('text');

        await expect(rect).toBeVisible();
        await expect(text).toBeVisible();

        // Verify adapter-specific elements
        const codeElement = node.locator('.code');
        if ((await codeElement.count()) > 0) {
          await expect(codeElement).toBeVisible();
        }
      }
    });

    test('should render adapter nodes with full layouts', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-4.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const adapterNodes = page.locator('g.node-container[data-type="adapter"]');
      await expect(adapterNodes).toHaveCount.greaterThan(0);

      // Verify different layout arrangements
      for (const node of await adapterNodes.all()) {
        const layoutElements = node.locator('.layout-element');
        await expect(layoutElements).toBeVisible();

        // Verify layout mode
        const layoutMode = await node.getAttribute('data-layout-mode');
        expect(layoutMode).toBeTruthy();
      }
    });

    test('should render adapter nodes with long text', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-5.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const adapterNodes = page.locator('g.node-container[data-type="adapter"]');
      await expect(adapterNodes).toHaveCount.greaterThan(0);

      // Verify text wrapping and overflow handling
      for (const node of await adapterNodes.all()) {
        const textElements = node.locator('text');
        await expect(textElements).toBeVisible();

        // Check for text truncation or wrapping
        const textContent = await textElements.textContent();
        expect(textContent).toBeTruthy();
      }
    });

    test('should render adapter nodes with role layouts', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-6.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const adapterNodes = page.locator('g.node-container[data-type="adapter"]');
      await expect(adapterNodes).toHaveCount.greaterThan(0);

      // Verify role-based layout elements
      for (const node of await adapterNodes.all()) {
        const roleElements = node.locator('.role-element');
        if ((await roleElements.count()) > 0) {
          await expect(roleElements).toBeVisible();
        }
      }
    });

    test('should render adapter nodes in columns', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-7.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const columnGroups = page.locator('g.node-container[data-type="columns"]');
      const adapterNodes = page.locator('g.node-container[data-type="adapter"]');

      await expect(columnGroups).toHaveCount.greaterThan(0);
      await expect(adapterNodes).toHaveCount.greaterThan(0);

      // Verify adapters are positioned within columns
      for (const adapter of await adapterNodes.all()) {
        const parentGroup = adapter.locator('xpath=..');
        const parentType = await parentGroup.getAttribute('data-type');
        expect(parentType).toBe('columns');
      }
    });

    test('should render adapter nodes with curved edges', async ({ page }) => {
      test.skip(
        true,
        'dwh-8.json fixture not present in dashboard/data/. Restore when generateStressFixture() lands and supplies a column+lane+curved-edges variant.',
      );
      await page.selectOption('#fileSelect', { label: 'dwh-8.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const adapterNodes = page.locator('g.node-container[data-type="adapter"]');
      const curvedEdges = page.locator('path.edge[d*="C"]');

      await expect(adapterNodes).toHaveCount.greaterThan(0);
      await expect(curvedEdges).toHaveCount.greaterThan(0);
    });
  });

  test.describe('Foundation Node Tests', () => {
    test('should render single foundation node', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'foundation-1.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const foundationNodes = page.locator('g.node-container[data-type="foundation"]');
      await expect(foundationNodes).toHaveCount.greaterThan(0);

      // Verify foundation node structure
      for (const node of await foundationNodes.all()) {
        const rect = node.locator('rect');
        const text = node.locator('text');

        await expect(rect).toBeVisible();
        await expect(text).toBeVisible();
      }
    });

    test('should render multiple foundation nodes', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'foundation-2.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const foundationNodes = page.locator('g.node-container[data-type="foundation"]');
      const nodeCount = await foundationNodes.count();
      expect(nodeCount).toBeGreaterThan(1);

      // Verify all foundation nodes are properly spaced
      for (let i = 0; i < Math.min(nodeCount, 3); i++) {
        const node = foundationNodes.nth(i);
        await expect(node).toBeVisible();

        const boundingBox = await node.boundingBox();
        expect(boundingBox).toBeTruthy();
      }
    });

    test('should render foundation nodes in columns', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'foundation-3.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const columnGroups = page.locator('g.node-container[data-type="columns"]');
      const foundationNodes = page.locator('g.node-container[data-type="foundation"]');

      await expect(columnGroups).toHaveCount.greaterThan(0);
      await expect(foundationNodes).toHaveCount.greaterThan(0);
    });

    test('should render foundation nodes with full layout', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'foundation-4.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const foundationNodes = page.locator('g.node-container[data-type="foundation"]');
      await expect(foundationNodes).toHaveCount.greaterThan(0);

      // Verify full layout elements
      for (const node of await foundationNodes.all()) {
        const layoutElements = node.locator('.layout-element');
        if ((await layoutElements.count()) > 0) {
          await expect(layoutElements).toBeVisible();
        }
      }
    });
  });

  test.describe('Node Visual Properties', () => {
    test('should render nodes with correct styling', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const nodes = page.locator('g.node-container');

      for (const node of await nodes.all()) {
        const rect = node.locator('rect');

        // Verify fill color
        const fill = await rect.getAttribute('fill');
        expect(fill).toBeTruthy();

        // Verify stroke
        const stroke = await rect.getAttribute('stroke');
        expect(stroke).toBeTruthy();

        // Verify stroke width
        const strokeWidth = await rect.getAttribute('stroke-width');
        expect(strokeWidth).toBeTruthy();

        // Verify node is visible
        await expect(node).toBeVisible();
      }
    });

    test('should render nodes with different states', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const activeNodes = page.locator('g.node-container.active');
      const inactiveNodes = page.locator('g.node-container:not(.active)');

      // Check that nodes have appropriate state classes
      const totalNodes = await page.locator('g.node-container').count();
      const activeCount = await activeNodes.count();
      const inactiveCount = await inactiveNodes.count();

      expect(activeCount + inactiveCount).toBe(totalNodes);
    });
  });

  test.describe('Node Interaction Tests', () => {
    test('should highlight nodes on hover', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const firstNode = page.locator('g.node-container').first();

      // Hover over node
      await firstNode.hover();
      await page.waitForTimeout(500);

      // Check for hover state
      const hoveredNode = page.locator('g.node-container:hover');
      await expect(hoveredNode).toHaveCount(1);
    });

    test('should allow node dragging', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const firstNode = page.locator('g.node-container').first();
      const initialPosition = await firstNode.boundingBox();

      // Simulate dragging the node
      await firstNode.hover();
      await page.mouse.down();
      await page.mouse.move(initialPosition.x + 100, initialPosition.y + 100);
      await page.mouse.up();

      await page.waitForTimeout(1000);

      // Verify node moved
      const newPosition = await firstNode.boundingBox();
      const deltaX = Math.abs(newPosition.x - initialPosition.x);
      const deltaY = Math.abs(newPosition.y - initialPosition.y);

      expect(deltaX).toBeGreaterThan(0);
      expect(deltaY).toBeGreaterThan(0);
    });

    test('should handle node clicks', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const firstNode = page.locator('g.node-container').first();

      // Click on node
      await firstNode.click();
      await page.waitForTimeout(500);

      // Verify click was registered (this depends on your implementation)
      const selectedNode = page.locator('g.node-container.selected');
      if ((await selectedNode.count()) > 0) {
        await expect(selectedNode).toHaveCount(1);
      }
    });
  });

  test.describe('Node Performance Tests', () => {
    test('should render many nodes efficiently', async ({ page }) => {
      // Load a dataset with many nodes
      await page.selectOption('#fileSelect', { label: 'dwh-7.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const nodes = page.locator('g.node-container');
      const nodeCount = await nodes.count();

      // Should handle reasonable number of nodes
      expect(nodeCount).toBeGreaterThan(0);
      expect(nodeCount).toBeLessThan(1000); // Reasonable limit

      // Verify all nodes are rendered
      for (let i = 0; i < Math.min(nodeCount, 10); i++) {
        const node = nodes.nth(i);
        await expect(node).toBeVisible();
      }
    });

    test('should maintain performance during interactions', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });

      const nodesFound = await waitForNodes(page);
      expect(nodesFound).toBe(true);

      const nodes = page.locator('g.node-container');
      const startTime = Date.now();

      // Perform multiple interactions
      for (let i = 0; i < 5; i++) {
        const node = nodes.nth(i % (await nodes.count()));
        await node.hover();
        await page.waitForTimeout(100);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Interactions should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });
  });
});
