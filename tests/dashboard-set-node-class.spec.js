// setNodeClass spec (issue #14, task 8.2). Toggles a CSS class on the
// rendered <g> for the given unique id; silent no-op for unknown ids and
// for placements detached behind a collapsed ancestor.

import { test, expect } from '@playwright/test';
import { loadDashboard, baselineData, GRAPH_SCOPE } from './helpers/api-hooks.js';

test.describe('Dashboard.setNodeClass', () => {
  test('add a class to a rendered node', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const cls = await page.evaluate((scope) => {
      window.dashboard.setNodeClass('leaf-a1', 'highlighted', true);
      return document.querySelector(`${scope} g[id="leaf-a1"]`)?.classList.contains('highlighted');
    }, GRAPH_SCOPE);
    expect(cls).toBe(true);
  });

  test('remove a class previously added', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const cls = await page.evaluate((scope) => {
      window.dashboard.setNodeClass('leaf-a1', 'highlighted', true);
      window.dashboard.setNodeClass('leaf-a1', 'highlighted', false);
      return document.querySelector(`${scope} g[id="leaf-a1"]`)?.classList.contains('highlighted');
    }, GRAPH_SCOPE);
    expect(cls).toBe(false);
  });

  test('multi-placement fan-out via getDatasetNodeIds', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const counts = await page.evaluate((scope) => {
      const ids = window.dashboard.getDatasetNodeIds('ds-shared');
      for (const id of ids) window.dashboard.setNodeClass(id, 'search-active', true);
      const matches = Array.from(document.querySelectorAll(`${scope} g.search-active`)).map((g) =>
        g.getAttribute('id'),
      );
      return matches;
    }, GRAPH_SCOPE);
    expect(counts.sort()).toEqual(['leaf-a1', 'leaf-b1'].sort());
  });

  test('unknown id is a silent no-op (no throw, no DOM mutation)', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate((scope) => {
      const before = document.querySelectorAll(`${scope} g.highlighted`).length;
      let threw = false;
      try {
        window.dashboard.setNodeClass('does-not-exist', 'highlighted', true);
      } catch {
        threw = true;
      }
      const after = document.querySelectorAll(`${scope} g.highlighted`).length;
      return { threw, before, after };
    }, GRAPH_SCOPE);
    expect(result.threw).toBe(false);
    expect(result.after).toBe(result.before);
  });

  test('hidden placement (detached <g>) is a silent no-op', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(async (scope) => {
      const lane = window.dashboard.main.root.getNode('lane-a');
      lane.collapsed = true;
      await window.dashboard.afterRender();
      let threw = false;
      try {
        window.dashboard.setNodeClass('leaf-a1', 'highlighted', true);
      } catch {
        threw = true;
      }
      // The detached node has no rendered <g> under #graph.
      const matches = document.querySelectorAll(`${scope} g.highlighted`).length;
      return { threw, matches };
    }, GRAPH_SCOPE);
    expect(result.threw).toBe(false);
    expect(result.matches).toBe(0);
  });
});
