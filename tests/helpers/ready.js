/**
 * Shared readiness helpers. Specs should prefer these over `waitForTimeout`
 * for layout / init readiness. The dashboard sets `data-flowdash-ready="true"`
 * on the root container at the end of `Dashboard.initialize()` (see
 * `dashboard/js/dashboard.js`).
 *
 * Animation waits (e.g. zoom transitions) still use a fixed `waitForTimeout`
 * because there is no programmatic "animation complete" signal yet — those
 * are not the flake risk that this helper addresses.
 */

const READY_SELECTOR = '[data-flowdash-ready="true"]';

/**
 * Wait until the dashboard has finished its initial layout pass.
 * Falls back to a longer SVG-rendered check on demo pages whose root
 * container hasn't been wired up to set the readiness attribute.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ timeout?: number }} [opts]
 */
export async function waitForFlowdashReady(page, { timeout = 15000 } = {}) {
  try {
    await page.waitForSelector(READY_SELECTOR, { timeout });
    return;
  } catch (_) {
    // Demo pages may not use Dashboard.initialize() — fall back to SVG presence
    // plus a small settle wait. Specs running on those pages should switch to
    // a per-page readiness signal in a follow-up.
    await page.waitForSelector('svg', { timeout });
    await page.waitForTimeout(250);
  }
}

/**
 * Convenience: navigate to a path and wait for the dashboard to be ready.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {{ timeout?: number }} [opts]
 */
export async function gotoAndReady(page, path, opts = {}) {
  await page.goto(path);
  await waitForFlowdashReady(page, opts);
}
