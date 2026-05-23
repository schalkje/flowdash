// revealNode spec (issue #14, task 5.4). Walks the collapsed-ancestor chain
// and expands each via the existing collapse setter; resolves after the
// render flush.

import { test, expect } from '@playwright/test';
import { loadDashboard, baselineData } from './helpers/api-hooks.js';

test.describe('Dashboard.revealNode', () => {
  test('expands a single collapsed ancestor and bounds become non-null', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(async () => {
      const lane = window.dashboard.main.root.getNode('lane-a');
      lane.collapsed = true;
      await window.dashboard.afterRender();
      const boundsBefore = window.dashboard.getNodeBounds('leaf-a1');
      await window.dashboard.revealNode('leaf-a1');
      const boundsAfter = window.dashboard.getNodeBounds('leaf-a1');
      const laneCollapsed = window.dashboard.main.root.getNode('lane-a').collapsed;
      return { boundsBefore, boundsAfter, laneCollapsed };
    });
    expect(result.boundsBefore).toBeNull();
    expect(result.boundsAfter).not.toBeNull();
    expect(result.laneCollapsed).toBe(false);
  });

  test('expands nested collapsed ancestors', async ({ page }) => {
    // Build a deeper hierarchy: root → outer (Lane) → inner (Lane) → leaf.
    const data = baselineData();
    data.nodes[0].children[0] = {
      id: 'outer',
      label: 'outer',
      type: 'Lane',
      children: [
        {
          id: 'inner',
          label: 'inner',
          type: 'Lane',
          children: [{ id: 'deep-leaf', label: 'deep', type: 'Node' }],
        },
      ],
    };
    await loadDashboard(page, data);
    const result = await page.evaluate(async () => {
      const outer = window.dashboard.main.root.getNode('outer');
      const inner = window.dashboard.main.root.getNode('inner');
      // Collapse innermost first so the chain is meaningful.
      inner.collapsed = true;
      await window.dashboard.afterRender();
      outer.collapsed = true;
      await window.dashboard.afterRender();
      await window.dashboard.revealNode('deep-leaf');
      const afterOuter = window.dashboard.main.root.getNode('outer').collapsed;
      const afterInner = window.dashboard.main.root.getNode('inner').collapsed;
      const bounds = window.dashboard.getNodeBounds('deep-leaf');
      return { afterOuter, afterInner, bounds };
    });
    expect(result.afterOuter).toBe(false);
    expect(result.afterInner).toBe(false);
    expect(result.bounds).not.toBeNull();
  });

  test('already-visible node resolves with no state change', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(async () => {
      const collapsedBefore = window.dashboard.main.root.getNode('lane-a').collapsed;
      await window.dashboard.revealNode('leaf-a1');
      const collapsedAfter = window.dashboard.main.root.getNode('lane-a').collapsed;
      return { collapsedBefore, collapsedAfter };
    });
    expect(result.collapsedBefore).toBe(false);
    expect(result.collapsedAfter).toBe(false);
  });

  test('unknown id rejects with a message identifying the id', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const err = await page.evaluate(async () => {
      try {
        await window.dashboard.revealNode('does-not-exist');
        return null;
      } catch (e) {
        return e.message;
      }
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/does-not-exist/);
  });

  test('removed id rejects in the same shape as unknown id', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(async () => {
      await window.dashboard.addNode('lane-b', {
        id: 'transient',
        label: 'transient',
        type: 'Node',
        children: [],
      });
      await window.dashboard.removeNode('transient');
      try {
        await window.dashboard.revealNode('transient');
        return { rejected: false };
      } catch (e) {
        return { rejected: true, message: e.message };
      }
    });
    expect(result.rejected).toBe(true);
    expect(result.message).toMatch(/transient/);
  });
});
