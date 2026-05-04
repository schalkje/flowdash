import { test, expect } from '@playwright/test';
import { gotoAndReady } from './helpers/ready.js';

test.describe('Dashboard Header Zone Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Use the data-flowdash-ready signal instead of an opaque sleep — the
    // dashboard sets it at the end of Dashboard.initialize().
    await gotoAndReady(page, '/dashboard/flowdash-js.html');
  });

  test('debug - check what elements are rendered', async ({ page }) => {
    // Wait for nodes to be rendered
    await page.waitForTimeout(2000);
    
    // Check for different possible selectors
    const allG = page.locator('svg g');
    const allGCount = await allG.count();
    console.log(`Found ${allGCount} g elements`);
    
    // Check for zone-container class (new zone system)
    const zoneContainers = page.locator('g.zone-container');
    const zoneContainerCount = await zoneContainers.count();
    console.log(`Found ${zoneContainerCount} g.zone-container elements`);
    
    // Check for any elements with 'container' in the class
    const anyContainer = page.locator('g[class*="container"]');
    const anyContainerCount = await anyContainer.count();
    console.log(`Found ${anyContainerCount} g elements with 'container' in class`);
    
    // Check for zoom buttons
    const zoomButtons = page.locator('.zoom-button');
    const zoomCount = await zoomButtons.count();
    console.log(`Found ${zoomCount} zoom buttons`);
    
    // Check for header zones
    const headerZones = page.locator('g.zone-header');
    const headerCount = await headerZones.count();
    console.log(`Found ${headerCount} header zones`);
    
    // List all unique classes
    const allClasses = await page.evaluate(() => {
      const elements = document.querySelectorAll('g');
      const classes = new Set();
      elements.forEach(el => {
        if (el.className) {
          el.className.baseVal?.split(' ').forEach(cls => classes.add(cls));
        }
      });
      return Array.from(classes);
    });
    console.log('All g element classes:', allClasses);
    
    // Check if any data is loaded
    const fileSelect = page.locator('#fileSelect');
    const selectedValue = await fileSelect.inputValue();
    console.log('Selected file:', selectedValue);
    
    // Try to select a file if none is selected
    if (!selectedValue) {
      await page.selectOption('#fileSelect', { label: 'dwh-1.json' });
      await page.waitForTimeout(1000);
      
      // Check again after loading data
      const zoneContainersAfter = page.locator('g.zone-container');
      const zoneContainerCountAfter = await zoneContainersAfter.count();
      console.log(`After loading data: Found ${zoneContainerCountAfter} g.zone-container elements`);
    }
  });

  test('header zone should be positioned at top of container', async ({ page }) => {
    // Wait for nodes to be rendered
    await page.waitForTimeout(2000);
    
    // Get all container nodes (using zone system selectors)
    const containerNodes = page.locator('g.zone-container');
    const count = await containerNodes.count();
    
    console.log(`Found ${count} container nodes`);
    
    for (let i = 0; i < Math.min(count, 3); i++) { // Test first 3 nodes
      const node = containerNodes.nth(i);
      
      // Get the header zone within this node
      const headerZone = node.locator('g.zone-header');
      const isVisible = await headerZone.isVisible();
      
      if (isVisible) {
        console.log(`Testing header zone ${i + 1}`);
        
        // Get the node's bounding box
        const nodeBox = await node.boundingBox();
        const headerBox = await headerZone.boundingBox();
        
        console.log('Node position:', nodeBox);
        console.log('Header position:', headerBox);
        
        // Check if header is at the top of the node
        const headerTop = headerBox.y;
        const nodeTop = nodeBox.y;
        const tolerance = 5; // 5px tolerance
        
        expect(Math.abs(headerTop - nodeTop)).toBeLessThan(tolerance);
      }
    }
  });

  test('should not have duplicate zoom buttons', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Count zoom buttons - should be one per container node
    const zoomButtons = page.locator('.zoom-button');
    const containerNodes = page.locator('g.zone-container');
    
    const zoomCount = await zoomButtons.count();
    const containerCount = await containerNodes.count();
    
    console.log(`Found ${zoomCount} zoom buttons and ${containerCount} container nodes`);
    
    // Each container should have exactly one zoom button
    expect(zoomCount).toBe(containerCount);
  });

  test('header should move with container', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Get first container node
    const containerNode = page.locator('g.zone-container').first();
    const headerZone = containerNode.locator('g.zone-header');
    
    // Get initial positions
    const initialNodeBox = await containerNode.boundingBox();
    const initialHeaderBox = await headerZone.boundingBox();
    
    console.log('Initial node position:', initialNodeBox);
    console.log('Initial header position:', initialHeaderBox);
    
    // Simulate dragging the node (this might need adjustment based on your drag implementation)
    await containerNode.hover();
    await page.mouse.down();
    await page.mouse.move(initialNodeBox.x + 100, initialNodeBox.y + 100);
    await page.mouse.up();
    
    await page.waitForTimeout(1000);
    
    // Get new positions
    const newNodeBox = await containerNode.boundingBox();
    const newHeaderBox = await headerZone.boundingBox();
    
    console.log('New node position:', newNodeBox);
    console.log('New header position:', newHeaderBox);
    
    // Header should have moved with the node
    const nodeDeltaX = newNodeBox.x - initialNodeBox.x;
    const nodeDeltaY = newNodeBox.y - initialNodeBox.y;
    const headerDeltaX = newHeaderBox.x - initialHeaderBox.x;
    const headerDeltaY = newHeaderBox.y - initialHeaderBox.y;
    
    const tolerance = 5;
    expect(Math.abs(headerDeltaX - nodeDeltaX)).toBeLessThan(tolerance);
    expect(Math.abs(headerDeltaY - nodeDeltaY)).toBeLessThan(tolerance);
  });

  test('zoom button should work', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Get first zoom button
    const zoomButton = page.locator('.zoom-button').first();
    
    // Check initial state (should be expanded, so minus sign)
    const initialIcon = await zoomButton.locator('.zoom-icon').textContent();
    console.log('Initial zoom icon:', initialIcon);
    
    // Click the zoom button
    await zoomButton.click();
    await page.waitForTimeout(500);
    
    // Check if icon changed (should be plus sign for collapsed)
    const newIcon = await zoomButton.locator('.zoom-icon').textContent();
    console.log('New zoom icon:', newIcon);
    
    expect(newIcon).not.toBe(initialIcon);
  });

  test('debug header positioning', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Get all container nodes and their headers
    const containerNodes = page.locator('g.zone-container');
    const count = await containerNodes.count();
    
    console.log(`Found ${count} container nodes`);
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const node = containerNodes.nth(i);
      const headerZone = node.locator('g.zone-header');
      
      if (await headerZone.isVisible()) {
        const nodeBox = await node.boundingBox();
        const headerBox = await headerZone.boundingBox();
        
        console.log(`\nNode ${i + 1}:`);
        console.log(`  Node: x=${nodeBox.x}, y=${nodeBox.y}, w=${nodeBox.width}, h=${nodeBox.height}`);
        console.log(`  Header: x=${headerBox.x}, y=${headerBox.y}, w=${headerBox.width}, h=${headerBox.height}`);
        console.log(`  Header should be at: y=${nodeBox.y}`);
        console.log(`  Actual header position: y=${headerBox.y}`);
        console.log(`  Difference: ${Math.abs(headerBox.y - nodeBox.y)}px`);
        
        // Also check for any zoom buttons
        const zoomButtons = headerZone.locator('.zoom-button');
        const zoomCount = await zoomButtons.count();
        console.log(`  Zoom buttons in header: ${zoomCount}`);
      }
    }
  });
}); 