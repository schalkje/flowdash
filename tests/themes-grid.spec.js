import { test, expect } from '@playwright/test';

const PAGES = [
  '/01_basicNodes/03_states/themes-grid.html',
  '/01_basicNodes/03_states/themes-grid-adapters-collapsed.html',
  '/01_basicNodes/03_states/themes-grid-columns-2rects.html',
  '/01_basicNodes/03_states/themes-grid-foundation-explicit.html',
  '/01_basicNodes/03_states/themes-grid-lane-2rects.html',
  '/01_basicNodes/03_states/themes-grid-mart-explicit.html',
];

test.describe('themes-grid pages', () => {
  for (const path of PAGES) {
    test(`${path} renders 8 themed iframes`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
      });
      await page.goto(path);
      await page.waitForSelector('.card iframe', { timeout: 15000 });
      // 8 themes are expected.
      const iframeCount = await page.locator('.card iframe').count();
      expect(iframeCount).toBe(8);
      // Give iframes time to bootstrap.
      await page.waitForTimeout(2500);
      expect(errors, `no console errors on ${path}: ${errors.join('\n')}`).toEqual([]);
    });

    test(`${path} clicking a card's fullscreen button overlays it over the grid`, async ({ page }) => {
      await page.goto(path);
      await page.waitForSelector('.card iframe', { timeout: 15000 });
      // Wait long enough for the iframe-internal d3 + dashboard + button rebind.
      await page.waitForTimeout(6000);

      const firstCard = page.locator('.card').first();
      const firstFrame = firstCard.locator('iframe').contentFrame();

      // The fullscreen-toggle button must be visible inside the iframe.
      const fsButton = firstFrame.locator('.fullscreen-toggle');
      await expect(fsButton).toBeVisible({ timeout: 5000 });

      // Click it; the parent card should pick up the .card--fullscreen class.
      await fsButton.click();
      await expect(firstCard).toHaveClass(/card--fullscreen/, { timeout: 5000 });

      // Click again to toggle off; the class should drop.
      await fsButton.click();
      await expect(firstCard).not.toHaveClass(/card--fullscreen/, { timeout: 5000 });
    });

    test(`${path} default state has no collapsed inner containers`, async ({ page }) => {
      await page.goto(path);
      await page.waitForSelector('.card iframe', { timeout: 15000 });
      // The runtime waits for all iframes to be ready (up to 12s) before
      // expanding. Give it enough time, then a beat for the follow-up pass.
      await page.waitForTimeout(13000);

      const summary = await page.evaluate(() => {
        let collapsedSomewhere = false;
        let anyContainers = false;
        for (const iframe of document.querySelectorAll('.card iframe')) {
          const fd = iframe.contentWindow?.flowdash;
          const root = fd?.main?.root;
          if (!root || typeof root.getAllNodes !== 'function') continue;
          const containers = root
            .getAllNodes(false)
            .filter((n) => n && n.isContainer && n !== root);
          if (containers.length > 0) anyContainers = true;
          if (containers.some((n) => n.collapsed)) {
            collapsedSomewhere = true;
            break;
          }
        }
        return { collapsedSomewhere, anyContainers };
      });
      // For datasets that contain nested containers, the auto-expand must
      // have left them all expanded. Datasets without nested containers
      // (e.g. graphData.js with only a single root lane) are vacuously OK.
      expect(summary.collapsedSomewhere).toBe(false);
    });
  }
});
