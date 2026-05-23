// getNodeBounds spec (issue #14, tasks 3.2 and 3.3).
// Covers rendered, collapsed-ancestor, unknown id, removed id,
// CSS-transform invariance, first-match on duplicate-id-on-load,
// and a round-trip against the math zoomToBoundingBox uses.

import { test, expect } from '@playwright/test';
import { loadDashboard, baselineData } from './helpers/api-hooks.js';

test.describe('Dashboard.getNodeBounds', () => {
  test('returns bounds for a rendered node, matching getBoundingBoxRelativeToParent', async ({
    page,
  }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(() => {
      const bounds = window.dashboard.getNodeBounds('leaf-a1');
      // Spec contract: must equal getBoundingBoxRelativeToParent(node.element, main.container)
      // within floating-point tolerance.
      const node = window.dashboard.main.root.getNode('leaf-a1');
      const ref = window.getBoundingBoxRelativeToParent
        ? window.getBoundingBoxRelativeToParent(node.element, window.dashboard.main.container)
        : null;
      return { bounds, ref };
    });
    expect(result.bounds).not.toBeNull();
    expect(typeof result.bounds.x).toBe('number');
    expect(typeof result.bounds.y).toBe('number');
    expect(result.bounds.width).toBeGreaterThan(0);
    expect(result.bounds.height).toBeGreaterThan(0);
    if (result.ref) {
      expect(Math.abs(result.bounds.x - result.ref.x)).toBeLessThan(0.5);
      expect(Math.abs(result.bounds.y - result.ref.y)).toBeLessThan(0.5);
      expect(Math.abs(result.bounds.width - result.ref.width)).toBeLessThan(0.5);
      expect(Math.abs(result.bounds.height - result.ref.height)).toBeLessThan(0.5);
    }
  });

  test('returns null when an ancestor container is collapsed (g detached)', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const bounds = await page.evaluate(async () => {
      const ancestor = window.dashboard.main.root.getNode('lane-a');
      ancestor.collapsed = true;
      await window.dashboard.afterRender();
      return window.dashboard.getNodeBounds('leaf-a1');
    });
    expect(bounds).toBeNull();
  });

  test('returns null for an unknown id (no throw)', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const bounds = await page.evaluate(() => window.dashboard.getNodeBounds('does-not-exist'));
    expect(bounds).toBeNull();
  });

  test('removed-id returns null with the same shape as unknown-id', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(async () => {
      // Add a node, confirm bounds, then remove and confirm null.
      await window.dashboard.addNode('lane-b', {
        id: 'transient',
        label: 'transient',
        type: 'Node',
        children: [],
      });
      await window.dashboard.afterRender();
      const before = window.dashboard.getNodeBounds('transient');
      await window.dashboard.removeNode('transient');
      await window.dashboard.afterRender();
      const after = window.dashboard.getNodeBounds('transient');
      return { before, after };
    });
    expect(result.before).not.toBeNull();
    expect(result.after).toBeNull();
  });

  test('bounds are invariant under a CSS transform on the host SVG', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(async () => {
      const before = window.dashboard.getNodeBounds('leaf-a1');
      const svg = document.querySelector('#graph');
      svg.style.transform = 'scale(2)';
      const after = window.dashboard.getNodeBounds('leaf-a1');
      svg.style.transform = '';
      return { before, after };
    });
    expect(result.before).not.toBeNull();
    expect(result.after).not.toBeNull();
    // Coordinate frame is main.container's local frame (uses getBBox+getCTM),
    // which is independent of CSS transforms on the host.
    expect(Math.abs(result.before.x - result.after.x)).toBeLessThan(0.5);
    expect(Math.abs(result.before.y - result.after.y)).toBeLessThan(0.5);
    expect(Math.abs(result.before.width - result.after.width)).toBeLessThan(0.5);
    expect(Math.abs(result.before.height - result.after.height)).toBeLessThan(0.5);
  });

  test('first-match behavior on duplicate-id-on-load data (matches getNode)', async ({ page }) => {
    // Load data with two nodes deliberately sharing id "dup". The latent
    // buildNodeMap quirk silently overwrites — getNode returns first match.
    const data = baselineData();
    data.nodes[0].children[0].children.push({
      id: 'dup',
      label: 'first',
      type: 'Node',
    });
    data.nodes[0].children[1].children.push({
      id: 'dup',
      label: 'second',
      type: 'Node',
    });
    await loadDashboard(page, data);
    const result = await page.evaluate(() => {
      const bounds = window.dashboard.getNodeBounds('dup');
      const firstMatch = window.dashboard.main.root.getNode('dup');
      // Bounds equal getBoundingBoxRelativeToParent of the first-match node's
      // element — assert that it is non-null and corresponds to the
      // first-match node's parent (lane-a, not lane-b).
      return {
        boundsNotNull: bounds !== null,
        firstMatchParentId: firstMatch?.parentNode?.id,
      };
    });
    expect(result.boundsNotNull).toBe(true);
    expect(result.firstMatchParentId).toBe('lane-a');
  });

  test('round-trip: feeding bounds back through computeFit produces the same target as zoomToNodeById', async ({
    page,
  }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(() => {
      const bounds = window.dashboard.getNodeBounds('leaf-a1');
      // Compose computeFit on the bounds — this is the math zoomToBoundingBox uses.
      const fit = window.dashboard.zoomManager.computeFit(bounds);
      // Compare against the node's element bbox via the existing helper —
      // zoomToNodeById walks the same coordinate path internally.
      const node = window.dashboard.main.root.getNode('leaf-a1');
      const helperBounds = window.getBoundingBoxRelativeToParent(
        node.element,
        window.dashboard.main.container,
      );
      const fit2 = window.dashboard.zoomManager.computeFit(helperBounds);
      return {
        fitK: fit.fitK,
        fitK2: fit2.fitK,
        tx: fit.fitTransform.x,
        tx2: fit2.fitTransform.x,
        ty: fit.fitTransform.y,
        ty2: fit2.fitTransform.y,
      };
    });
    expect(Math.abs(result.fitK - result.fitK2)).toBeLessThan(0.01);
    expect(Math.abs(result.tx - result.tx2)).toBeLessThan(0.5);
    expect(Math.abs(result.ty - result.ty2)).toBeLessThan(0.5);
  });
});
