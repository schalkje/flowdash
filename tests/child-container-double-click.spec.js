import { test, expect } from '@playwright/test';

test.describe('Child Container Double-Click Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start the local server and navigate to a page with nested containers
    await page.goto('/04_laneNodes/01_basic/02_nested-tests/index.html');
    // Wait for the dashboard to load
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for initial layout
  });

  test('double-click on parent container should zoom', async ({ page }) => {
    // Find the parent container
    const parentContainer = page.locator('g.lane').first();
    await expect(parentContainer).toBeVisible();
    
    // Get initial viewBox
    const initialViewBox = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      return svg.getAttribute('viewBox');
    });
    
    console.log('Initial viewBox:', initialViewBox);
    
    // Double-click on parent container
    await parentContainer.dblclick();
    await page.waitForTimeout(800); // Wait for zoom animation
    
    // Check if viewBox changed (indicating zoom occurred)
    const newViewBox = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      return svg.getAttribute('viewBox');
    });
    
    console.log('After parent dblclick viewBox:', newViewBox);
    expect(newViewBox).not.toBe(initialViewBox);
  });

  test('double-click on child container should zoom', async ({ page }) => {
    // Find a child container (lane inside a lane)
    const childContainer = page.locator('g.lane g.lane').first();
    await expect(childContainer).toBeVisible();
    
    // Get initial viewBox
    const initialViewBox = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      return svg.getAttribute('viewBox');
    });
    
    console.log('Initial viewBox:', initialViewBox);
    
    // Double-click on child container
    await childContainer.dblclick();
    await page.waitForTimeout(800); // Wait for zoom animation
    
    // Check if viewBox changed (indicating zoom occurred)
    const newViewBox = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      return svg.getAttribute('viewBox');
    });
    
    console.log('After child dblclick viewBox:', newViewBox);
    expect(newViewBox).not.toBe(initialViewBox);
  });

  test('debug - inspect event handlers on nested containers', async ({ page }) => {
    // Get information about event handlers on parent and child containers
    const eventInfo = await page.evaluate(() => {
      const parent = document.querySelector('g.lane');
      const child = document.querySelector('g.lane g.lane');
      
      return {
        parentId: parent?.__node?.id,
        childId: child?.__node?.id,
        parentHasNode: parent?.__node !== undefined,
        childHasNode: child?.__node !== undefined,
        parentIsContainer: parent?.__node?.isContainer,
        childIsContainer: child?.__node?.isContainer
      };
    });
    
    console.log('Event info:', eventInfo);
    expect(eventInfo.parentHasNode).toBe(true);
    expect(eventInfo.childHasNode).toBe(true);
  });
});
