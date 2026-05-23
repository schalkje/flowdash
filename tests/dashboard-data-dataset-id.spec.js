// data-dataset-id DOM attribute spec (issue #14, task 7.3). Every rendered
// top-level node <g> whose node has a non-empty data.datasetId carries the
// attribute alongside the existing id.

import { test, expect } from '@playwright/test';
import { loadDashboard, baselineData, GRAPH_SCOPE } from './helpers/api-hooks.js';

test.describe('data-dataset-id DOM attribute', () => {
  test('node with datasetId carries both id and data-dataset-id', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate((scope) => {
      const g = document.querySelector(`${scope} g[id="leaf-a1"]`);
      return {
        idAttr: g?.getAttribute('id'),
        datasetAttr: g?.getAttribute('data-dataset-id'),
      };
    }, GRAPH_SCOPE);
    expect(result.idAttr).toBe('leaf-a1');
    expect(result.datasetAttr).toBe('ds-shared');
  });

  test('all placements sharing a datasetId carry the attribute', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const matches = await page.evaluate(
      (scope) =>
        Array.from(document.querySelectorAll(`${scope} g[data-dataset-id="ds-shared"]`)).map((g) =>
          g.getAttribute('id'),
        ),
      GRAPH_SCOPE,
    );
    expect(matches).toEqual(['leaf-a1', 'leaf-b1']);
  });

  test('node without datasetId has no data-dataset-id attribute (id only)', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate((scope) => {
      const g = document.querySelector(`${scope} g[id="leaf-b2"]`);
      return {
        idAttr: g?.getAttribute('id'),
        hasDatasetAttr: g?.hasAttribute('data-dataset-id'),
      };
    }, GRAPH_SCOPE);
    expect(result.idAttr).toBe('leaf-b2');
    expect(result.hasDatasetAttr).toBe(false);
  });

  test('querySelectorAll([data-dataset-id="X"]) returns all placements in source order', async ({
    page,
  }) => {
    await loadDashboard(page, baselineData());
    const count = await page.evaluate(
      (scope) => document.querySelectorAll(`${scope} g[data-dataset-id="ds-shared"]`).length,
      GRAPH_SCOPE,
    );
    expect(count).toBe(2);
  });
});
