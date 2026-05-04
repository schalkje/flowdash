import { test, expect } from '@playwright/test';

test('Debug dashboard initialization', async ({ page }) => {
  console.log('Starting debug test...');
  
  // Navigate to the main dashboard
  await page.goto('/dashboard/flowdash-js.html');
  console.log('Page loaded');
  
  // Wait for basic elements
  await page.waitForSelector('svg', { timeout: 10000 });
  await page.waitForSelector('#fileSelect', { timeout: 10000 });
  console.log('Basic elements found');
  
  // Check if dashboard is initialized
  const dashboardStatus = await page.evaluate(() => {
    return {
      dashboardExists: window.dashboard !== undefined,
      dashboardType: typeof window.dashboard,
      hasGetStructure: window.dashboard && typeof window.dashboard.getStructure === 'function'
    };
  });
  console.log('Initial dashboard status:', dashboardStatus);
  
  // Wait for dashboard to be initialized
  await page.waitForFunction(() => {
    return window.dashboard !== undefined;
  }, { timeout: 15000 });
  console.log('Dashboard object exists');
  
  // Wait a bit more
  await page.waitForTimeout(2000);
  
  // Check dashboard status again
  const finalDashboardStatus = await page.evaluate(() => {
    if (window.dashboard) {
      return {
        dashboardExists: true,
        hasGetStructure: typeof window.dashboard.getStructure === 'function',
        structure: window.dashboard.getStructure ? window.dashboard.getStructure() : null
      };
    }
    return { dashboardExists: false };
  });
  console.log('Final dashboard status:', finalDashboardStatus);
  
  // Try to select a file
  await page.selectOption('#fileSelect', { label: 'dwh-1.json' });
  console.log('File selected');
  
  // Wait for nodes to appear
  try {
    await page.waitForSelector('g.node-container', { timeout: 10000 });
    console.log('Node containers found');
    
    const nodeCount = await page.locator('g.node-container').count();
    console.log('Number of node containers:', nodeCount);
    
    expect(nodeCount).toBeGreaterThan(0);
  } catch (error) {
    console.log('Failed to find node containers:', error.message);
    
    // Debug: Check what's in the SVG
    const svgContent = await page.locator('svg').innerHTML();
    console.log('SVG content length:', svgContent.length);
    console.log('SVG content preview:', svgContent.substring(0, 500));
    
    // Check for any errors
    const errors = await page.evaluate(() => {
      return window.console && window.console.errors ? window.console.errors : [];
    });
    console.log('Console errors:', errors);
    
    throw error;
  }
}); 