import { test, expect } from '@playwright/test';

test.describe('Debug Zone Creation', () => {
  test('check if zones are being created and initialized', async ({ page }) => {
    await page.goto('/flowdash-js.html');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Add console log listener
    page.on('console', (msg) => {
      if (msg.text().includes('zone') || msg.text().includes('Zone')) {
        console.log('Console:', msg.text());
      }
    });

    // Wait a bit to see console messages
    await page.waitForTimeout(1000);

    // Check if any zones have event handlers
    const zoneInfo = await page.evaluate(() => {
      const zones = document.querySelectorAll('g[class*="zone-"]');
      const info = [];

      zones.forEach((zone, index) => {
        const nodeId = zone.__node?.id || 'unknown';
        const className = zone.className.baseVal || zone.className;

        // Check if the zone has any event listeners (including D3 event handlers)
        const hasEventListeners = zone.onclick !== null || zone.ondblclick !== null;

        // Check for D3 event handlers by looking at the element's __data__ property
        const hasD3EventHandlers =
          zone.__data__ &&
          zone.__data__.on &&
          (zone.__data__.on.dblclick || zone.__data__.on.click);

        info.push({
          index,
          nodeId,
          className,
          hasEventListeners,
          hasD3EventHandlers,
          hasNodeProperty: zone.__node !== undefined,
        });
      });

      return info.slice(0, 10); // First 10 zones
    });

    console.log('Zone info:', zoneInfo);

    // This test will pass regardless, we just want to see the output
    expect(zoneInfo.length).toBeGreaterThan(0);
  });
});
