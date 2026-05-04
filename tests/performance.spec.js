import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { gotoAndReady } from './helpers/ready.js';

/**
 * Performance benchmarks. Reads the metrics object the dashboard already
 * collects on every load (see dashboard/js/dashboard.js — performanceMetrics)
 * and asserts each phase against a ratcheted budget in perf-baselines.json.
 *
 * Conventions:
 *   - Run only on chromium for stable cross-run comparisons. WebKit timings
 *     vary too much to gate CI on without dedicated machines.
 *   - The tolerance multiplier in perf-baselines.json (default 1.5) gives us
 *     room for noise; a regression has to be substantial to fail.
 *   - When a phase budget is null, that phase is skipped (used for fixtures
 *     where a particular phase is naturally noisy or zero).
 *   - To re-record after a justified change, edit perf-baselines.json by hand
 *     and commit alongside the underlying code change.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const baselines = JSON.parse(
  readFileSync(join(__dirname, 'perf-baselines.json'), 'utf8'),
);
const TOLERANCE = baselines._tolerance ?? 1.5;

async function loadFixtureAndCollectMetrics(page, fixtureName) {
  await gotoAndReady(page, '/dashboard/flowdash-js.html');
  // The fileSelect lives inside a collapsed settings panel; open it before
  // interacting. (Or use force: true to bypass the visibility check.)
  await page.click('#settingsBtn').catch(() => {});
  await page.selectOption('#fileSelect', { label: fixtureName }, { force: true });
  // After a file change, the dashboard re-runs initialize on the existing div;
  // the readiness attribute may have been cleared by the rerun, so re-wait.
  await page.waitForFunction(
    () => document.querySelector('[data-flowdash-ready="true"]') !== null,
    { timeout: 30000 },
  );

  const metrics = await page.evaluate(() =>
    typeof window.dashboard !== 'undefined' && window.dashboard.performanceMetrics
      ? JSON.parse(JSON.stringify(window.dashboard.performanceMetrics))
      : null,
  );
  return metrics;
}

function assertPhaseBudgets(metrics, fixture, fixtureName) {
  expect(metrics, `dashboard exposed performanceMetrics on window for ${fixtureName}`).not.toBeNull();
  const phases = fixture.phases ?? {};
  for (const [phase, budget] of Object.entries(phases)) {
    if (budget === null || budget === undefined) continue;
    const actual = metrics.phases?.[phase];
    expect(actual, `phase ${phase} reported for ${fixtureName}`).toBeDefined();
    const allowed = budget * TOLERANCE;
    expect.soft(
      actual,
      `${fixtureName}.${phase}: ${actual.toFixed(0)}ms exceeds ${allowed.toFixed(0)}ms (budget ${budget}ms × tolerance ${TOLERANCE})`,
    ).toBeLessThanOrEqual(allowed);
  }
}

test.describe('Performance benchmarks', () => {
  // Run perf on chromium only — webkit timing variance is too high.
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Perf benchmarks pinned to chromium for stability',
  );
  // Force serial execution: parallel workers compete for CPU and inflate timings.
  test.describe.configure({ mode: 'serial' });

  for (const [fixtureName, fixture] of Object.entries(baselines.fixtures)) {
    test(`load ${fixtureName} stays within phase budgets`, async ({ page }) => {
      const metrics = await loadFixtureAndCollectMetrics(page, fixtureName);
      assertPhaseBudgets(metrics, fixture, fixtureName);
    });
  }

  test('pre-render fast-path is at least N% faster than the cold load', async ({ page }) => {
    const ratios = baselines.fastPathRatio ?? {};
    if (Object.keys(ratios).filter((k) => !k.startsWith('_')).length === 0) {
      test.skip(true, 'No fastPathRatio entries configured');
    }

    for (const [pair, cfg] of Object.entries(ratios)) {
      if (pair.startsWith('_')) continue;
      const cold = `${pair}.json`;
      const warm = `${pair}.prerender.json`;
      const coldMetrics = await loadFixtureAndCollectMetrics(page, cold);
      const warmMetrics = await loadFixtureAndCollectMetrics(page, warm);
      expect(coldMetrics, `cold metrics for ${cold}`).not.toBeNull();
      expect(warmMetrics, `warm metrics for ${warm}`).not.toBeNull();
      const ratio = warmMetrics.phases.total / coldMetrics.phases.total;
      expect.soft(
        ratio,
        `${pair}: warm/cold ratio ${ratio.toFixed(2)} should be <= ${cfg.max}`,
      ).toBeLessThanOrEqual(cfg.max);
    }
  });
});
