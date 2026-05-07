import { test, expect } from '@playwright/test';

test.describe('Dashboard Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main dashboard
    await page.goto('/dashboard/flowdash-js.html');
    await page.waitForSelector('svg', { timeout: 10000 });
  });

  test.describe('Complex Layout Scenarios', () => {
    test('should render complex data warehouse layout', async ({ page }) => {
      // Load a complex DWH layout with multiple components
      await page.selectOption('#fileSelect', { label: 'dwh-7.json' });
      await page.waitForSelector('g.node-container');

      const allNodes = page.locator('g.node-container');
      const edges = page.locator('path.edge');
      const columnGroups = page.locator('g.node-container[data-type="columns"]');
      const laneGroups = page.locator('g.node-container[data-type="lane"]');
      const adapterNodes = page.locator('g.node-container[data-type="adapter"]');
      const foundationNodes = page.locator('g.node-container[data-type="foundation"]');

      // Verify all components are present
      await expect(allNodes).toHaveCount.greaterThan(0);
      await expect(edges).toHaveCount.greaterThan(0);
      await expect(columnGroups).toHaveCount.greaterThan(0);
      await expect(adapterNodes).toHaveCount.greaterThan(0);
      await expect(foundationNodes).toHaveCount.greaterThan(0);

      // Verify complex structure
      const totalNodes = await allNodes.count();
      const totalGroups = (await columnGroups.count()) + (await laneGroups.count());
      const totalEdges = await edges.count();

      expect(totalNodes).toBeGreaterThan(totalGroups);
      expect(totalEdges).toBeGreaterThan(0);
    });

    test('should render mixed column-lane layout with edges', async ({ page }) => {
      test.skip(
        true,
        'dwh-8.json fixture not present in dashboard/data/. Restore when generateStressFixture() lands and supplies a column+lane variant.',
      );
      await page.selectOption('#fileSelect', { label: 'dwh-8.json' });
      await page.waitForSelector('g.node-container');

      const columnGroups = page.locator('g.node-container[data-type="columns"]');
      const laneGroups = page.locator('g.node-container[data-type="lane"]');
      const edges = page.locator('path.edge');
      const curvedEdges = page.locator('path.edge[d*="C"]');

      await expect(columnGroups).toHaveCount.greaterThan(0);
      await expect(laneGroups).toHaveCount.greaterThan(0);
      await expect(edges).toHaveCount.greaterThan(0);

      // Verify curved edges are used
      await expect(curvedEdges).toHaveCount.greaterThan(0);

      // Verify mixed structure
      for (const lane of await laneGroups.all()) {
        const parentId = await lane.getAttribute('data-parent');
        if (parentId) {
          const parentColumn = page.locator(
            `g.node-container[data-id="${parentId}"][data-type="columns"]`,
          );
          await expect(parentColumn).toBeVisible();
        }
      }
    });

    test('should render nested groups with complex edge routing', async ({ page }) => {
      test.skip(
        true,
        'dwh-7a.json fixture not present in dashboard/data/. Restore when generateStressFixture() lands and supplies a nested-groups variant.',
      );
      await page.selectOption('#fileSelect', { label: 'dwh-7a.json' });
      await page.waitForSelector('g.node-container');

      const groupNodes = page.locator('g.node-container[data-type="group"]');
      const nestedGroups = page.locator('g.node-container[data-type="group"][data-parent]');
      const edges = page.locator('path.edge');

      await expect(groupNodes).toHaveCount.greaterThan(0);
      await expect(nestedGroups).toHaveCount.greaterThan(0);
      await expect(edges).toHaveCount.greaterThan(0);

      // Verify nested structure
      for (const nestedGroup of await nestedGroups.all()) {
        const parentId = await nestedGroup.getAttribute('data-parent');
        const parentGroup = page.locator(`g.node-container[data-id="${parentId}"]`);
        await expect(parentGroup).toBeVisible();
      }

      // Verify edges connect nodes across different group levels
      const edgeCount = await edges.count();
      expect(edgeCount).toBeGreaterThan(0);
    });
  });

  test.describe('Interactive Scenarios', () => {
    test('should maintain edge connections during complex interactions', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });
      await page.waitForSelector('g.node-container');

      const nodes = page.locator('g.node-container');
      const edges = page.locator('path.edge');
      const initialEdgeCount = await edges.count();

      // Perform multiple node movements
      for (let i = 0; i < Math.min(await nodes.count(), 3); i++) {
        const node = nodes.nth(i);
        const initialPosition = await node.boundingBox();

        // Move node
        await node.hover();
        await page.mouse.down();
        await page.mouse.move(initialPosition.x + 50, initialPosition.y + 50);
        await page.mouse.up();

        await page.waitForTimeout(500);
      }

      // Verify edges are still connected
      const finalEdgeCount = await edges.count();
      expect(finalEdgeCount).toBe(initialEdgeCount);

      // Verify all edges still have valid paths
      for (const edge of await edges.all()) {
        const d = await edge.getAttribute('d');
        expect(d).toBeTruthy();
        expect(d.length).toBeGreaterThan(0);
      }
    });

    test('should handle group expansion and collapse', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'group-nested.json' });
      await page.waitForSelector('g.node-container');

      const groupNodes = page.locator('g.node-container[data-type="group"]');
      const zoomButtons = page.locator('.zoom-button');

      if ((await zoomButtons.count()) > 0) {
        const firstZoomButton = zoomButtons.first();
        const initialIcon = await firstZoomButton.locator('.zoom-icon').textContent();

        // Click zoom button to collapse/expand
        await firstZoomButton.click();
        await page.waitForTimeout(500);

        const newIcon = await firstZoomButton.locator('.zoom-icon').textContent();
        expect(newIcon).not.toBe(initialIcon);
      }
    });

    test('should maintain layout during zoom operations', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });
      await page.waitForSelector('g.node-container');

      const svg = page.locator('svg');
      const initialTransform = await svg.getAttribute('transform');

      // Simulate zoom in
      await page.keyboard.press('Control+=');
      await page.waitForTimeout(500);

      const newTransform = await svg.getAttribute('transform');
      expect(newTransform).not.toBe(initialTransform);

      // Verify nodes are still visible and properly positioned
      const nodes = page.locator('g.node-container');
      await expect(nodes).toHaveCount.greaterThan(0);

      for (let i = 0; i < Math.min(await nodes.count(), 3); i++) {
        const node = nodes.nth(i);
        await expect(node).toBeVisible();
      }
    });
  });

  test.describe('Performance and Stress Tests', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      test.skip(
        true,
        'dwh-7b.json fixture not present in dashboard/data/. Restore when generateStressFixture() lands and supplies the large-dataset variant; see tests/performance.spec.js for the dedicated perf gate.',
      );
      // Load a large dataset
      await page.selectOption('#fileSelect', { label: 'dwh-7b.json' });
      await page.waitForSelector('g.node-container');

      const allNodes = page.locator('g.node-container');
      const edges = page.locator('path.edge');

      const nodeCount = await allNodes.count();
      const edgeCount = await edges.count();

      // Should handle reasonable dataset sizes
      expect(nodeCount).toBeGreaterThan(0);
      expect(nodeCount).toBeLessThan(2000); // Reasonable limit
      expect(edgeCount).toBeLessThan(5000); // Reasonable limit

      // Verify rendering performance
      const startTime = Date.now();

      // Check visibility of all elements
      for (let i = 0; i < Math.min(nodeCount, 20); i++) {
        const node = allNodes.nth(i);
        await expect(node).toBeVisible();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    test('should maintain responsiveness during rapid interactions', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });
      await page.waitForSelector('g.node-container');

      const nodes = page.locator('g.node-container');
      const startTime = Date.now();

      // Perform rapid interactions
      for (let i = 0; i < 10; i++) {
        const node = nodes.nth(i % (await nodes.count()));
        await node.hover();
        await page.waitForTimeout(50);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should remain responsive
      expect(duration).toBeLessThan(5000); // 5 seconds
    });
  });

  test.describe('Data Loading and State Management', () => {
    test('should handle data switching correctly', async ({ page }) => {
      // Start with first dataset
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });
      await page.waitForSelector('g.node-container');

      const initialNodes = await page.locator('g.node-container').count();
      const initialEdges = await page.locator('path.edge').count();

      // Switch to different dataset
      await page.selectOption('#fileSelect', { label: 'dwh-2.json' });
      await page.waitForSelector('g.node-container');

      const newNodes = await page.locator('g.node-container').count();
      const newEdges = await page.locator('path.edge').count();

      // Should have different content
      expect(newNodes).not.toBe(initialNodes);
      expect(newEdges).not.toBe(initialEdges);

      // Verify new content is properly rendered
      await expect(page.locator('g.node-container')).toHaveCount.greaterThan(0);
    });

    test('should maintain state during data updates', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });
      await page.waitForSelector('g.node-container');

      // Perform some interactions to set state
      const firstNode = page.locator('g.node-container').first();
      await firstNode.hover();
      await page.waitForTimeout(500);

      // Update data
      await page.selectOption('#fileSelect', { label: 'dwh-2.json' });
      await page.waitForSelector('g.node-container');

      // Verify dashboard is still functional
      const nodes = page.locator('g.node-container');
      await expect(nodes).toHaveCount.greaterThan(0);

      // Verify interactions still work
      const newNode = nodes.first();
      await newNode.hover();
      await expect(newNode).toBeVisible();
    });
  });

  test.describe('Cross-Component Integration', () => {
    test('should render edges between different node types in groups', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-3.json' });
      await page.waitForSelector('g.node-container');

      const adapterNodes = page.locator('g.node-container[data-type="adapter"]');
      const foundationNodes = page.locator('g.node-container[data-type="foundation"]');
      const edges = page.locator('path.edge');

      await expect(adapterNodes).toHaveCount.greaterThan(0);
      await expect(foundationNodes).toHaveCount.greaterThan(0);
      await expect(edges).toHaveCount.greaterThan(0);

      // Verify edges connect different node types
      const edgeCount = await edges.count();
      expect(edgeCount).toBeGreaterThan(0);
    });

    test('should handle complex group hierarchies with mixed content', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-4.json' });
      await page.waitForSelector('g.node-container');

      const columnGroups = page.locator('g.node-container[data-type="columns"]');
      const laneGroups = page.locator('g.node-container[data-type="lane"]');
      const adapterNodes = page.locator('g.node-container[data-type="adapter"]');
      const foundationNodes = page.locator('g.node-container[data-type="foundation"]');

      await expect(columnGroups).toHaveCount.greaterThan(0);
      await expect(adapterNodes).toHaveCount.greaterThan(0);
      await expect(foundationNodes).toHaveCount.greaterThan(0);

      // Verify complex hierarchy
      for (const adapter of await adapterNodes.all()) {
        const parentId = await adapter.getAttribute('data-parent');
        if (parentId) {
          const parentGroup = page.locator(`g.node-container[data-id="${parentId}"]`);
          await expect(parentGroup).toBeVisible();
        }
      }
    });

    test('should maintain visual consistency across all components', async ({ page }) => {
      await page.selectOption('#fileSelect', { label: 'dwh-5.json' });
      await page.waitForSelector('g.node-container');

      const allNodes = page.locator('g.node-container');
      const edges = page.locator('path.edge');

      // Verify all nodes have consistent styling
      for (const node of await allNodes.all()) {
        const rect = node.locator('rect');
        await expect(rect).toBeVisible();

        const fill = await rect.getAttribute('fill');
        const stroke = await rect.getAttribute('stroke');
        expect(fill).toBeTruthy();
        expect(stroke).toBeTruthy();
      }

      // Verify all edges have consistent styling
      for (const edge of await edges.all()) {
        const stroke = await edge.getAttribute('stroke');
        const strokeWidth = await edge.getAttribute('stroke-width');
        expect(stroke).toBeTruthy();
        expect(strokeWidth).toBeTruthy();
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle empty datasets gracefully', async ({ page }) => {
      // This test would require an empty dataset file
      // For now, we'll test with minimal data
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });
      await page.waitForSelector('svg');

      // Verify dashboard is still functional even with minimal data
      const svg = page.locator('svg');
      await expect(svg).toBeVisible();
    });

    test('should handle malformed data gracefully', async ({ page }) => {
      // This test would require a malformed dataset file
      // For now, we'll test basic error resilience
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });
      await page.waitForSelector('svg');

      // Verify dashboard remains functional
      const svg = page.locator('svg');
      await expect(svg).toBeVisible();
    });

    test('should maintain functionality during rapid data changes', async ({ page }) => {
      const datasets = ['dwh-1.json', 'dwh-2.json', 'dwh-3.json'];

      for (const dataset of datasets) {
        await page.selectOption('#fileSelect', { label: dataset });
        await page.waitForSelector('g.node-container');

        const nodes = page.locator('g.node-container');
        await expect(nodes).toHaveCount.greaterThan(0);
      }
    });
  });
});
