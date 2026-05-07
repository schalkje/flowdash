// @ts-check
import { test, expect } from '@playwright/test';

test.describe('demo-nav.js', () => {
  test('renders Prev/Next buttons in .demo-header on a standalone demo', async ({ page }) => {
    await page.goto('/02_rectangularNodes/01_basic/basic.html');
    const nav = page.locator('.demo-header .demo-nav');
    await expect(nav).toBeVisible();
    await expect(nav.locator('.demo-nav-prev')).toBeEnabled();
    await expect(nav.locator('.demo-nav-next')).toBeEnabled();
    await expect(nav.locator('.demo-nav-position')).toContainText('/');
  });

  test('renders on pages whose .demo-header is built at runtime via mountDemoChrome', async ({
    page,
  }) => {
    await page.goto('/06_adapterNodes/02_layouts_full/02_layouts_full.html');
    const nav = page.locator('.demo-header .demo-nav');
    await expect(nav).toBeVisible();
    await expect(nav.locator('.demo-nav-position')).toContainText('/');
  });

  test('disables Prev on the first demo page', async ({ page }) => {
    await page.goto('/01_basicNodes/01_basic/basic.html');
    const nav = page.locator('.demo-header .demo-nav');
    await expect(nav).toBeVisible();
    await expect(nav.locator('.demo-nav-prev')).toBeDisabled();
  });

  test('Next click navigates standalone to the next demo', async ({ page }) => {
    await page.goto('/02_rectangularNodes/01_basic/basic.html');
    await page.locator('.demo-nav-next').waitFor();
    const nextPath = await page.locator('.demo-nav-next').getAttribute('title');
    expect(nextPath).toBeTruthy();
    await Promise.all([
      page.waitForURL(new RegExp(nextPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')),
      page.locator('.demo-nav-next').click(),
    ]);
    expect(page.url()).toContain(nextPath);
  });

  test('inside the index iframe, Next click updates the sidebar active link', async ({ page }) => {
    await page.goto('/index.html#02_rectangularNodes%2F01_basic%2Fbasic.html');
    // Force the viewer to load the chosen page (index.html resolves from
    // the hash on its own DOMContentLoaded, but waiting on a deterministic
    // signal is safer than racing with that handler).
    await page.evaluate(() => {
      const v = document.getElementById('viewer');
      if (v && !v.src.endsWith('02_rectangularNodes/01_basic/basic.html')) {
        v.src = '02_rectangularNodes/01_basic/basic.html';
      }
    });
    const frame = page.frameLocator('#viewer');
    await frame.locator('.demo-nav').waitFor();
    const nextPath = await frame.locator('.demo-nav-next').getAttribute('title');
    expect(nextPath).toBeTruthy();
    await frame.locator('.demo-nav-next').click();
    // Wait for the active sidebar link to flip to nextPath.
    await expect
      .poll(
        async () => {
          return await page.evaluate(() => {
            const a = document.querySelector('.file-li a[data-load].active');
            return a ? a.getAttribute('data-path') : null;
          });
        },
        { timeout: 8000 },
      )
      .toBe(nextPath);
    // And the iframe's URL should now point at nextPath.
    await expect
      .poll(
        async () => {
          return await page.evaluate(() => {
            const v = document.getElementById('viewer');
            try {
              return v.contentWindow.location.pathname;
            } catch {
              return null;
            }
          });
        },
        { timeout: 8000 },
      )
      .toBe('/' + nextPath);
  });
});
