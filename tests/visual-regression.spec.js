import { test, expect } from '@playwright/test';

/**
 * Visual regression suite. Captures screenshots of canonical demos and the
 * full dashboard, and asserts pixel-equality against committed baselines.
 *
 * **First-run workflow** (no baselines yet):
 *
 *     npx playwright test tests/visual-regression.spec.js --update-snapshots
 *
 * That generates per-OS, per-browser PNGs under
 * `tests/visual-regression.spec.js-snapshots/`. **Review the diff**, commit
 * the baselines, and from that point on, regressions will fail the suite.
 *
 * Notes:
 *   - We disable animations and stabilize fonts so the same page renders
 *     deterministically across runs.
 *   - Each demo gets a small settle wait (250 ms) on top of the SVG-presence
 *     check — most demos do not yet emit data-flowdash-ready, so we cannot
 *     gate on that signal everywhere.
 *   - `maxDiffPixelRatio: 0.01` allows up to 1% pixel difference per shot,
 *     absorbing minor font-rasterisation noise without hiding regressions.
 *   - Add new entries to TARGETS as features land. Keep names stable —
 *     renaming a target invalidates its baseline.
 */

const TARGETS = [
  // One demo per node type
  { name: 'basic-node', path: '/01_basicNodes/01_basic/basic.html' },
  { name: 'rectangular-node', path: '/02_rectangularNodes/01_basic/basic.html' },
  { name: 'circle-node', path: '/03_circleNodes/01_basic/basic.html' },
  { name: 'lane-default', path: '/04_laneNodes/01_simple-tests/01_default-mode/default-mode.html' },
  { name: 'columns-default', path: '/05_columnsNodes/01_basic/basic.html' },

  // Theme grid renders themed dashboards inside iframes (srcdoc); wait on the iframe grid, not a top-level <svg>.
  {
    name: 'themes-grid',
    path: '/01_basicNodes/03_states/themes-grid.html',
    readySelector: 'iframe',
    settle: 2500,
  },

  // Edge directional flows
  { name: 'edge-horizontal-ltr', path: '/10_edges/01_basic/horizontal-ltr.html' },
  { name: 'edge-horizontal-rtl', path: '/10_edges/01_basic/horizontal-rtl.html' },
  { name: 'edge-vertical-ttb', path: '/10_edges/01_basic/vertical-ttb.html' },
  { name: 'edge-vertical-btt', path: '/10_edges/01_basic/vertical-btt.html' },
];

test.describe('Visual regression', () => {
  // Visual diffs are run on chromium only — webkit anti-aliasing differs and
  // would force per-browser baselines for no real signal.
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Visual regression pinned to chromium for stable baselines',
  );

  test.beforeEach(async ({ page }) => {
    // Disable CSS animations / transitions for deterministic captures.
    await page.addInitScript(() => {
      const css = `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }`;
      const style = document.createElement('style');
      style.textContent = css;
      document.documentElement.appendChild(style);
    });
  });

  for (const target of TARGETS) {
    test(`${target.name} matches baseline`, async ({ page }) => {
      const readySelector = target.readySelector ?? 'svg';
      const readyTimeout = target.svgTimeout ?? 10000;
      const settle = target.settle ?? 750;
      // Allow the test itself a little more headroom on slower-loading pages.
      test.setTimeout(Math.max(30000, readyTimeout + settle + 15000));
      await page.goto(target.path);
      await page.waitForSelector(readySelector, { timeout: readyTimeout });
      // Settle: D3 / force layout / theme manager finish their work.
      await page.waitForTimeout(settle);

      await expect(page).toHaveScreenshot(`${target.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
        animations: 'disabled',
      });
    });
  }
});
