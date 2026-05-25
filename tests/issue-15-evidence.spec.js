// @ts-check
// Evidence capture for issue #15 — validation indicator modes.
//
// Before phase: screenshots of the existing 02_validation-errors demo so
// the after-migration screenshot can be diffed visually (must look
// identical to the user). After phase: screenshots of the new
// 03_validation-minimal demo's matrix view.
//
// Output paths:
//   tests/evidence/issue-15/before-02-validation-errors-{loud-style}.png
//   tests/evidence/issue-15/after-02-validation-errors-{loud-style}.png
//   tests/evidence/issue-15/after-03-validation-minimal-matrix.png

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidenceDir = path.resolve(__dirname, 'evidence/issue-15');

const PHASE = process.env.EVIDENCE_PHASE || 'before';

test.describe(`issue-15 evidence — ${PHASE}`, () => {
  test('02_validation-errors renders loud styles', async ({ page }) => {
    await page.goto('/14_status/02_validation-errors/validation-errors.html');
    await page.waitForSelector('[data-flowdash-ready="true"]', { timeout: 8000 });
    await page.waitForTimeout(400); // settle initial render

    // pulse default
    await page.screenshot({
      path: path.join(evidenceDir, `${PHASE}-02-validation-errors-pulse.png`),
      fullPage: true,
    });

    // siren
    await page.evaluate(() => window.dashboard?.setValidationLoudError?.('siren'));
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(evidenceDir, `${PHASE}-02-validation-errors-siren.png`),
      fullPage: true,
    });

    // tape
    await page.evaluate(() => window.dashboard?.setValidationLoudError?.('tape'));
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(evidenceDir, `${PHASE}-02-validation-errors-tape.png`),
      fullPage: true,
    });

    // police
    await page.evaluate(() => window.dashboard?.setValidationLoudError?.('police'));
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(evidenceDir, `${PHASE}-02-validation-errors-police.png`),
      fullPage: true,
    });

    expect(true).toBe(true);
  });

  test('03_validation-minimal matrix renders', async ({ page }) => {
    test.skip(PHASE === 'before', 'demo does not exist yet in the before phase');
    await page.goto('/14_status/03_validation-minimal/validation-minimal.html');
    await page.waitForSelector('[data-validation-mode]', { timeout: 8000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(evidenceDir, `${PHASE}-03-validation-minimal-matrix.png`),
      fullPage: true,
    });
    expect(true).toBe(true);
  });
});
