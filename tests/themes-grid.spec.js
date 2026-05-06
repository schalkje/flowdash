import { test, expect } from '@playwright/test';

const PAGES = [
  '/themes/03_themes-grid.html',
  '/themes/04_themes-grid-adapters-collapsed.html',
  '/themes/05_themes-grid-columns-2rects.html',
  '/themes/06_themes-grid-foundation-explicit.html',
  '/themes/07_themes-grid-lane-2rects.html',
  '/themes/08_themes-grid-mart-explicit.html',
];

test.describe('themes-grid pages', () => {
  for (const path of PAGES) {
    test(`${path} renders 10 themed iframes`, async ({ page }) => {
      // 10 iframes per page can stretch teardown past the default 30s budget
      // under parallel worker contention. Triple it.
      test.slow();
      const errors = [];
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
      });
      await page.goto(path);
      await page.waitForSelector('.card iframe', { timeout: 15000 });
      // 10 themes are expected (8 visual + 2 high-contrast WCAG AAA).
      const iframeCount = await page.locator('.card iframe').count();
      expect(iframeCount).toBe(10);
      // Give iframes time to bootstrap.
      await page.waitForTimeout(2500);
      expect(errors, `no console errors on ${path}: ${errors.join('\n')}`).toEqual([]);
    });

    test(`${path} clicking a card's fullscreen button overlays it over the grid`, async ({
      page,
    }) => {
      // 10 iframes per page × parallel workers can starve any single card's
      // bootstrap. Triple the default test budget so the button-rebind has
      // headroom even under contention.
      test.slow();
      await page.goto(path);
      await page.waitForSelector('.card iframe', { timeout: 15000 });

      const firstCard = page.locator('.card').first();
      const firstFrame = firstCard.locator('iframe').contentFrame();
      const fsButton = firstFrame.locator('.fullscreen-toggle');

      // Wait for the button to actually exist instead of guessing a fixed delay
      // — the iframe loads d3 + the dashboard + then re-binds this button.
      await expect(fsButton).toBeVisible({ timeout: 30000 });

      // Click it; the parent card should pick up the .card--fullscreen class.
      await fsButton.click();
      await expect(firstCard).toHaveClass(/card--fullscreen/, { timeout: 5000 });

      // Click again to toggle off; the class should drop.
      await fsButton.click();
      await expect(firstCard).not.toHaveClass(/card--fullscreen/, { timeout: 5000 });
    });

    test(`${path} default state has no collapsed inner containers`, async ({ page }) => {
      // 10 iframes (incl. high-contrast) take longer to settle than 8 — give
      // the test triple the default budget so the readiness wait + asserts fit.
      test.slow();
      await page.goto(path);
      await page.waitForSelector('.card iframe', { timeout: 15000 });
      // The runtime waits for all iframes to be ready (up to 18s) before
      // expanding. Give it enough time, then a beat for the follow-up pass.
      await page.waitForTimeout(19000);

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
