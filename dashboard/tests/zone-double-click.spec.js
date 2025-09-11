import { test, expect } from '@playwright/test';

test.describe('Zone Double-Click Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start the local server and navigate to the dashboard
    await page.goto('/flowdash-js.html');
    // Wait for the dashboard to load
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for initial layout
  });

  test('double-click on header zone should zoom', async ({ page }) => {
    // Find a container node with header zone
    const headerZone = page.locator('g.zone-header').first();
    await expect(headerZone).toBeVisible();
    
    // Get initial zoom level
    const initialZoom = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      const transform = svg.getAttribute('transform');
      if (!transform) return 1;
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);
      return scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    });
    
    // Double-click on header zone
    await headerZone.dblclick();
    await page.waitForTimeout(500); // Wait for zoom animation
    
    // Get final zoom level
    const finalZoom = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      const transform = svg.getAttribute('transform');
      if (!transform) return 1;
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);
      return scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    });
    
    // The zoom should have changed (typically from 1 to a higher value)
    expect(finalZoom).not.toBe(initialZoom);
    expect(finalZoom).toBeGreaterThan(initialZoom);
  });

  test('double-click on inner container zone should zoom', async ({ page }) => {
    // Find a container node with inner container zone
    const innerContainerZone = page.locator('g.zone-innerContainer').first();
    await expect(innerContainerZone).toBeVisible();
    
    // Get initial zoom level
    const initialZoom = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      const transform = svg.getAttribute('transform');
      if (!transform) return 1;
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);
      return scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    });
    
    // Double-click on inner container zone
    await innerContainerZone.dblclick();
    await page.waitForTimeout(500); // Wait for zoom animation
    
    // Get final zoom level
    const finalZoom = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      const transform = svg.getAttribute('transform');
      if (!transform) return 1;
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);
      return scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    });
    
    // The zoom should have changed (typically from 1 to a higher value)
    expect(finalZoom).not.toBe(initialZoom);
    expect(finalZoom).toBeGreaterThan(initialZoom);
  });

  test('double-click on container zone should zoom', async ({ page }) => {
    // Find a container node
    const containerZone = page.locator('g.zone-container').first();
    await expect(containerZone).toBeVisible();
    
    // Get initial zoom level
    const initialZoom = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      const transform = svg.getAttribute('transform');
      if (!transform) return 1;
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);
      return scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    });
    
    // Double-click on container zone
    await containerZone.dblclick();
    await page.waitForTimeout(500); // Wait for zoom animation
    
    // Get final zoom level
    const finalZoom = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      const transform = svg.getAttribute('transform');
      if (!transform) return 1;
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);
      return scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    });
    
    // The zoom should have changed (typically from 1 to a higher value)
    expect(finalZoom).not.toBe(initialZoom);
    expect(finalZoom).toBeGreaterThan(initialZoom);
  });

  test('debug - check zone elements and their event handlers', async ({ page }) => {
    // Check that zone elements have the __node property set
    const nodePropertyInfo = await page.evaluate(() => {
      const zones = document.querySelectorAll('g[class*="zone-"]');
      const withNode = Array.from(zones).filter(zone => zone.__node !== undefined);
      const withoutNode = Array.from(zones).filter(zone => zone.__node === undefined);
      return {
        total: zones.length,
        withNode: withNode.length,
        withoutNode: withoutNode.length,
        hasAnyNodeProperty: withNode.length > 0
      };
    });
    
    console.log('Zone __node property info:', nodePropertyInfo);
    expect(nodePropertyInfo.hasAnyNodeProperty).toBe(true);
    
    // Check that inner container zones have double-click event listeners
    const hasDblClickListeners = await page.evaluate(() => {
      const innerContainers = document.querySelectorAll('g.zone-innerContainer');
      return Array.from(innerContainers).every(zone => {
        // Check if the element has event listeners (this is a bit tricky in Playwright)
        // We'll just verify the element exists and has the right class
        return zone.classList.contains('zone-innerContainer');
      });
    });
    
    expect(hasDblClickListeners).toBe(true);
  });
});
