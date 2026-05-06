import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { gotoAndReady } from './helpers/ready.js';

/**
 * Per-phase prerender-vs-cold comparison.
 *
 * tests/performance.spec.js asserts a single warm/cold *total* ratio. This
 * spec produces a finer-grained view: every phase reported by
 * window.dashboard.performanceMetrics is captured for both cold and warm
 * loads of each pair, and ratios are computed per-phase.
 *
 * Output: playwright-report/perf-prerender-comparison.json. Use this to verify
 * that the prerender fast-path is doing what we believe — driving
 * `nodeInitialization` and `layoutStabilization` close to zero — and to spot
 * regressions where a phase that *should* be cheap under prerender starts
 * costing more.
 *
 * Assertions are soft: this spec is for visibility, not for gating. Use
 * performance.spec.js for the hard gate.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAIRS = [
  { id: 'dwh-1', cold: 'dwh-1.json', warm: 'dwh-1.prerender.json' },
  { id: 'dwh-5', cold: 'dwh-5.json', warm: 'dwh-5.prerender.json' },
  { id: 'dwh-6.fixed', cold: 'dwh-6.fixed.json', warm: 'dwh-6.fixed.prerender.json' },
  { id: 'All', cold: 'All.json', warm: 'All.prerender.json' },
];

async function loadAndCollect(page, fixtureName) {
  await gotoAndReady(page, '/dashboard/flowdash-js.html');
  await page.click('#settingsBtn').catch(() => {});
  await page.selectOption('#fileSelect', { label: fixtureName }, { force: true });
  await page.waitForFunction(
    () => document.querySelector('[data-flowdash-ready="true"]') !== null,
    { timeout: 30000 },
  );
  return page.evaluate(() =>
    typeof window.dashboard !== 'undefined' && window.dashboard.performanceMetrics
      ? JSON.parse(JSON.stringify(window.dashboard.performanceMetrics))
      : null,
  );
}

function computeRatios(coldPhases, warmPhases) {
  const ratios = {};
  for (const phase of new Set([...Object.keys(coldPhases), ...Object.keys(warmPhases)])) {
    const cold = coldPhases[phase] ?? 0;
    const warm = warmPhases[phase] ?? 0;
    ratios[phase] = cold > 0 ? warm / cold : null;
  }
  return ratios;
}

test.describe('Pre-render vs cold per-phase comparison', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Comparison pinned to chromium for stable timings',
  );
  test.describe.configure({ mode: 'serial' });

  const results = [];

  for (const pair of PAIRS) {
    test(`${pair.id}: warm vs cold per-phase ratios`, async ({ page }) => {
      const cold = await loadAndCollect(page, pair.cold);
      const warm = await loadAndCollect(page, pair.warm);
      expect(cold, `cold metrics for ${pair.cold}`).not.toBeNull();
      expect(warm, `warm metrics for ${pair.warm}`).not.toBeNull();

      const coldPhases = cold.phases ?? {};
      const warmPhases = warm.phases ?? {};
      const ratios = computeRatios(coldPhases, warmPhases);

      const result = {
        pair: pair.id,
        coldFixture: pair.cold,
        warmFixture: pair.warm,
        coldPhases,
        warmPhases,
        ratios,
        coldPaintMetrics: cold.paintMetrics,
        warmPaintMetrics: warm.paintMetrics,
        coldMemoryStats: cold.memoryStats,
        warmMemoryStats: warm.memoryStats,
        coldNodeStats: cold.nodeStats,
        warmNodeStats: warm.nodeStats,
      };
      results.push(result);

      // Console table for the developer running tests interactively.

      console.log(`\n=== ${pair.id} ===`);
      const table = Object.fromEntries(
        Object.entries(ratios).map(([phase, r]) => [
          phase,
          {
            coldMs: Math.round(coldPhases[phase] ?? 0),
            warmMs: Math.round(warmPhases[phase] ?? 0),
            ratio: r === null ? '—' : r.toFixed(2),
          },
        ]),
      );

      console.table(table);

      // Paint + memory side-table — a separate view because these aren't
      // phase timings. Heap deltas are 0 outside Chromium (performance.memory
      // is non-standard).
      const paintRow = (m) => ({
        firstPaintMs: Math.round(m?.paintMetrics?.firstPaintMs ?? 0),
        interactiveMs: Math.round(m?.paintMetrics?.interactiveMs ?? 0),
        heapDeltaMB: m?.memoryStats?.heapDelta
          ? +(m.memoryStats.heapDelta / (1024 * 1024)).toFixed(2)
          : 0,
      });

      console.table({ cold: paintRow(cold), warm: paintRow(warm) });

      // This spec records numbers, it doesn't gate. Only fail if warm is
      // dramatically slower than cold (≥1.5×) — that signals the fast-path is
      // broken or actively harmful, which is the only failure mode worth
      // alerting on. Per-phase ratios are surfaced via the console.table above
      // and saved to the JSON artifact for offline analysis. Use
      // performance.spec.js (fastPathRatio) for the production gate.
      expect
        .soft(
          warmPhases.total,
          `${pair.id}: warm total ${warmPhases.total?.toFixed(0)}ms is more than 1.5× cold total ${coldPhases.total?.toFixed(0)}ms — fast-path may be broken`,
        )
        .toBeLessThanOrEqual(coldPhases.total * 1.5);
    });
  }

  test.afterAll(async () => {
    if (results.length === 0) return;
    const reportDir = resolve(__dirname, '..', 'playwright-report');
    mkdirSync(reportDir, { recursive: true });
    const outPath = join(reportDir, 'perf-prerender-comparison.json');
    const summary = {
      generatedAt: new Date().toISOString(),
      results,
    };
    writeFileSync(outPath, JSON.stringify(summary, null, 2));

    console.log(`\nWrote ${outPath} (${results.length} comparison(s))`);
  });
});
