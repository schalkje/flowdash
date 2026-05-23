// panToBounds spec (issue #14, task 4.5). Pan-only viewport mover.

import { test, expect } from '@playwright/test';
import { loadDashboard, baselineData } from './helpers/api-hooks.js';

// Helper installed in the page context. Returns the current visible world
// rectangle in dashboard coordinates.
async function installHelpers(page) {
  await page.evaluate(() => {
    window.__visibleWorld = () => {
      const t = window.dashboard.main.transform;
      const vp = window.dashboard.zoomManager.getViewport();
      return {
        k: t.k,
        tx: t.x,
        ty: t.y,
        vpW: vp.width,
        vpH: vp.height,
        worldLeft: (-vp.width / 2 - t.x) / t.k,
        worldRight: (vp.width / 2 - t.x) / t.k,
        worldTop: (-vp.height / 2 - t.y) / t.k,
        worldBottom: (vp.height / 2 - t.y) / t.k,
      };
    };
  });
}

test.describe('Dashboard.panToBounds', () => {
  test('off-screen bbox: zoom unchanged after pan', async ({ page }) => {
    await loadDashboard(page, baselineData());
    await installHelpers(page);
    const result = await page.evaluate(async () => {
      const v = window.__visibleWorld();
      // Off-screen: well to the right of the current visible region.
      const bbox = { x: v.worldRight + 200, y: 0, width: 10, height: 10 };
      await window.dashboard.panToBounds(bbox, { animate: false });
      return { k0: v.k, k1: window.dashboard.main.transform.k };
    });
    expect(Math.abs(result.k1 - result.k0)).toBeLessThan(1e-6);
  });

  test('in-view bbox is a no-op (transform unchanged)', async ({ page }) => {
    await loadDashboard(page, baselineData());
    await installHelpers(page);
    const result = await page.evaluate(async () => {
      const v = window.__visibleWorld();
      // Pick a tiny bbox at the center of the current visible region.
      const cx = (v.worldLeft + v.worldRight) / 2;
      const cy = (v.worldTop + v.worldBottom) / 2;
      const w = (v.worldRight - v.worldLeft) / 10;
      const h = (v.worldBottom - v.worldTop) / 10;
      const bbox = { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
      const before = { ...window.dashboard.main.transform };
      await window.dashboard.panToBounds(bbox, { animate: false });
      const after = { ...window.dashboard.main.transform };
      return { before, after };
    });
    expect(Math.abs(result.after.x - result.before.x)).toBeLessThan(0.5);
    expect(Math.abs(result.after.y - result.before.y)).toBeLessThan(0.5);
    expect(Math.abs(result.after.k - result.before.k)).toBeLessThan(1e-6);
  });

  test('oversized bbox: zoom unchanged', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(async () => {
      const k = window.dashboard.main.transform.k;
      const vp = window.dashboard.zoomManager.getViewport();
      const worldW = (vp.width / k) * 2;
      const worldH = (vp.height / k) * 2;
      const bbox = { x: 50, y: 80, width: worldW, height: worldH };
      await window.dashboard.panToBounds(bbox, { animate: false });
      return { k, k1: window.dashboard.main.transform.k };
    });
    expect(Math.abs(result.k1 - result.k)).toBeLessThan(1e-6);
  });

  test('animate:false resolves synchronously (within a microtask)', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const elapsed = await page.evaluate(async () => {
      const t = performance.now();
      await window.dashboard.panToBounds({ x: 0, y: 0, width: 10, height: 10 }, { animate: false });
      return performance.now() - t;
    });
    expect(elapsed).toBeLessThan(50);
  });

  test('panToBounds returns a Promise', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const isPromise = await page.evaluate(() => {
      const p = window.dashboard.panToBounds(
        { x: 0, y: 0, width: 10, height: 10 },
        { animate: false },
      );
      return p && typeof p.then === 'function';
    });
    expect(isPromise).toBe(true);
  });
});
