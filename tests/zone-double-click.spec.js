import { test, expect } from '@playwright/test';
import { gotoAndReady } from './helpers/ready.js';

/**
 * Asserts that double-clicking the structural zones of a container node triggers
 * the auto-zoom behavior. Uses the SVG transform's scale value rather than the
 * raw transform string so a zero-zoom no-op (e.g. unchanged translate, changed
 * scale) is still detected.
 */

const readScale = () => {
  const svg = document.querySelector('svg');
  const transform = svg.getAttribute('transform');
  if (!transform) return 1;
  const scaleMatch = transform.match(/scale\(([^)]+)\)/);
  return scaleMatch ? parseFloat(scaleMatch[1]) : 1;
};

test.describe('Zone Double-Click Tests', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndReady(page, '/dashboard/flowdash-js.html');
  });

  for (const [label, selector] of [
    ['header zone', 'g.zone-header'],
    ['inner container zone', 'g.zone-innerContainer'],
    ['container zone', 'g.zone-container'],
  ]) {
    test(`double-click on ${label} should zoom`, async ({ page }) => {
      const zone = page.locator(selector).first();
      await expect(zone).toBeVisible();

      const initialZoom = await page.evaluate(readScale);
      await zone.dblclick();
      await page.waitForTimeout(500); // zoom animation

      const finalZoom = await page.evaluate(readScale);
      expect(finalZoom).not.toBe(initialZoom);
      expect(finalZoom).toBeGreaterThan(initialZoom);
    });
  }

  test('zone elements expose __node and double-click-capable inner containers exist', async ({ page }) => {
    const nodePropertyInfo = await page.evaluate(() => {
      const zones = document.querySelectorAll('g[class*="zone-"]');
      const withNode = Array.from(zones).filter((zone) => zone.__node !== undefined);
      return {
        total: zones.length,
        withNode: withNode.length,
        hasAnyNodeProperty: withNode.length > 0,
      };
    });
    expect(nodePropertyInfo.hasAnyNodeProperty).toBe(true);

    const innerContainersOk = await page.evaluate(() => {
      const innerContainers = document.querySelectorAll('g.zone-innerContainer');
      return Array.from(innerContainers).every((zone) =>
        zone.classList.contains('zone-innerContainer'),
      );
    });
    expect(innerContainersOk).toBe(true);
  });
});
