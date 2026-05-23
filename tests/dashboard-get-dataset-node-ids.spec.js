// getDatasetNodeIds spec (issue #14, task 6.2). Returns string[] of node
// ids sharing a datasetId, in tree-walk order.

import { test, expect } from '@playwright/test';
import { loadDashboard, baselineData } from './helpers/api-hooks.js';

test.describe('Dashboard.getDatasetNodeIds', () => {
  test('returns all placements in tree-walk order', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const ids = await page.evaluate(() => window.dashboard.getDatasetNodeIds('ds-shared'));
    // Tree-walk order: lane-a children before lane-b children → ['leaf-a1', 'leaf-b1']
    expect(ids).toEqual(['leaf-a1', 'leaf-b1']);
  });

  test('single placement returns one id', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const ids = await page.evaluate(() => window.dashboard.getDatasetNodeIds('ds-unique'));
    expect(ids).toEqual(['leaf-a2']);
  });

  test('unknown datasetId returns []', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const ids = await page.evaluate(() => window.dashboard.getDatasetNodeIds('does-not-exist'));
    expect(ids).toEqual([]);
  });

  test('returned ids are accepted by getNodeBounds / revealNode / setNodeClass without throwing', async ({
    page,
  }) => {
    await loadDashboard(page, baselineData());
    const ok = await page.evaluate(async () => {
      const ids = window.dashboard.getDatasetNodeIds('ds-shared');
      for (const id of ids) {
        const bounds = window.dashboard.getNodeBounds(id); // may be null but must not throw
        window.dashboard.setNodeClass(id, 'test-class', true); // void, must not throw
        await window.dashboard.revealNode(id); // must resolve, not reject
      }
      return ids.length;
    });
    expect(ok).toBe(2);
  });
});
