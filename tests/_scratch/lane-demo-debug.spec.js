import { test, expect } from '@playwright/test';

test('Debug Lane Demo Page', async ({ page }) => {
  // Navigate to the demo page
  await page.goto('/04_laneNodes/01_simple-tests/01_default-mode/default-mode.html');
  
  // Wait for the page to load
  await page.waitForSelector('svg', { timeout: 10000 });
  
  // Check if flowdash is available
  const flowdashAvailable = await page.evaluate(() => {
    console.log('Window object:', Object.keys(window));
    console.log('flowdash available:', window.flowdash !== undefined);
    console.log('demoData available:', window.demoData !== undefined);
    return window.flowdash !== undefined;
  });
  
  console.log('Flowdash available:', flowdashAvailable);
  
  // Wait longer for rendering
  await page.waitForTimeout(5000);
  
  // Check what elements are actually in the SVG
  const svgContent = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    if (!svg) return 'No SVG found';
    
    console.log('SVG found, children:', svg.children.length);
    
    // Look for any elements with 'Node' in their class or data attributes
    const allElements = svg.querySelectorAll('*');
    const nodeElements = [];
    const allElementInfo = [];
    const childElements = [];
    
    allElements.forEach(el => {
      // Collect info about all elements for debugging
      allElementInfo.push({
        tag: el.tagName,
        class: el.className.baseVal || 'no-class',
        dataType: el.getAttribute('data-type'),
        dataParent: el.getAttribute('data-parent'),
        id: el.id,
        textContent: el.textContent?.substring(0, 50) || 'no-text'
      });
      
      // Look for child nodes specifically
      if (el.getAttribute('data-parent') || el.className.baseVal?.includes('rect')) {
        childElements.push({
          tag: el.tagName,
          class: el.className.baseVal || 'no-class',
          dataType: el.getAttribute('data-type'),
          dataParent: el.getAttribute('data-parent'),
          id: el.id,
          textContent: el.textContent?.substring(0, 50) || 'no-text'
        });
      }
      
      if (el.className && el.className.baseVal && el.className.baseVal.includes('Node')) {
        nodeElements.push({
          tag: el.tagName,
          class: el.className.baseVal,
          dataType: el.getAttribute('data-type'),
          id: el.id
        });
      }
      if (el.getAttribute('data-type')) {
        nodeElements.push({
          tag: el.tagName,
          class: el.className.baseVal || 'no-class',
          dataType: el.getAttribute('data-type'),
          id: el.id
        });
      }
    });
    
    return {
      svgChildren: svg.children.length,
      nodeElements: nodeElements,
      childElements: childElements,
      allElements: allElementInfo.slice(0, 20), // First 20 elements
      innerHTML: svg.innerHTML.substring(0, 1000) // First 1000 chars
    };
  });
  
  console.log('SVG Content:', svgContent);
  
  // Take a screenshot to see what's rendered
  await page.screenshot({ path: 'debug-lane-demo.png', fullPage: true });
  
  // Check if there are any console errors
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    console.log(`Browser console [${msg.type()}]:`, msg.text());
  });
  
  page.on('pageerror', error => {
    console.log('Page error:', error.message);
  });
  
  // Wait a bit more to capture any console output
  await page.waitForTimeout(2000);
  
  console.log('Console logs captured:', consoleLogs);
});
