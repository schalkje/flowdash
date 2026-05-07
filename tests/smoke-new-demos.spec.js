// Smoke check that the cross-cutting feature demos (12_-17_) and the
// flagship showcase load without console errors and produce at least one SVG.
// Cheap regression guard against refactors that break a demo's init path.
import { test, expect } from '@playwright/test';

const PAGES = [
  '/12_selection/01_basic/basic.html',
  '/13_zoom/01_basic/basic.html',
  '/14_status/01_basic/basic.html',
  '/15_minimap/01_basic/basic.html',
  '/16_overlay/01_basic/basic.html',
  '/17_prerender/01_basic/basic.html',
  '/11_dashboard/01_showcase/showcase.html',
];

for (const path of PAGES) {
  test(`new demo ${path} loads and renders an SVG`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    await page.goto(path);
    await page.waitForSelector('svg', { timeout: 15000 });
    await page.waitForTimeout(1500);
    const svgCount = await page.locator('svg').count();
    expect(svgCount, `at least one SVG on ${path}`).toBeGreaterThan(0);
    expect(errors, `no console errors on ${path}: ${errors.join('\n')}`).toEqual([]);
  });
}
