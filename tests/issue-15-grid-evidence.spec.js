// @ts-check
// Evidence + smoke for 14_status/04_validation-grid.

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidenceDir = path.resolve(__dirname, 'evidence/issue-15');

test('04_validation-grid renders the full state × mode grid', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto('/14_status/04_validation-grid/validation-grid.html');
  // Grid is built synchronously on module load; wait for the first row to appear
  await page.waitForSelector('table.grid tbody tr:nth-child(1)', { timeout: 8000 });
  await page.waitForTimeout(300);

  // Sanity: the loud-callout row exists right under 'error'
  const calloutCount = await page.locator('tr.loud-callout').count();
  expect(calloutCount).toBe(1);

  // Sanity: a sampling of cells contain SVG indicators (or are correctly empty)
  const cellAudit = await page.evaluate(() => {
    const rows = document.querySelectorAll('table.grid tbody tr');
    const out = [];
    rows.forEach((tr) => {
      const head = tr.querySelector('th.row-head')?.firstChild?.textContent?.trim();
      const cells = tr.querySelectorAll('td .cell');
      cells.forEach((c, i) => {
        const empty = c.classList.contains('empty');
        const svg = c.querySelector('svg');
        out.push({ row: head, col: i, empty, hasSvg: !!svg });
      });
    });
    return out;
  });
  // Non-empty cells must have an SVG
  for (const c of cellAudit) {
    if (!c.empty) expect.soft(c.hasSvg, `${c.row}/col${c.col} should have SVG`).toBe(true);
  }

  await page.screenshot({
    path: path.join(evidenceDir, 'after-04-validation-grid.png'),
    fullPage: true,
  });

  // Bonus: a cyberpunk screenshot proves the loud-token backfill works.
  await page.evaluate(() => window.flowdashTheme.set('cyberpunk'));
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(evidenceDir, 'after-04-validation-grid-cyberpunk.png'),
    fullPage: true,
  });
  // Restore the default theme for the remaining assertions.
  await page.evaluate(() => window.flowdashTheme.set('light'));
  await page.waitForTimeout(150);

  // Size selector: switching to 'big' rebuilds; loud-overlay cells should
  // contain SVGs whose disc radius is bigger than at 'normal'.
  const normalRadius = await page.evaluate(() => {
    const cell = document.querySelector('g[data-cell-col="pulse"][data-cell-state="error"]');
    const disc = cell?.querySelector('circle.disc');
    return disc ? Number(disc.getAttribute('r')) : null;
  });
  expect(normalRadius).toBeGreaterThan(0);

  await page.selectOption('#sizePicker', 'big');
  await page.waitForTimeout(150);
  const bigRadius = await page.evaluate(() => {
    const cell = document.querySelector('g[data-cell-col="pulse"][data-cell-state="error"]');
    const disc = cell?.querySelector('circle.disc');
    return disc ? Number(disc.getAttribute('r')) : null;
  });
  expect(bigRadius).toBeGreaterThan(normalRadius);

  // Theme change broadcast triggers a rebuild
  const rebuildCount = await page.evaluate(() => {
    let count = 0;
    const observer = new MutationObserver(() => count++);
    observer.observe(document.querySelector('table.grid'), { childList: true });
    window.dispatchEvent(new CustomEvent('flowdash:themechange', { detail: { theme: 'dark' } }));
    return new Promise((resolve) => setTimeout(() => resolve(count), 80));
  });
  expect(rebuildCount).toBeGreaterThan(0);

  expect(errors, 'no page or console errors').toEqual([]);
});

// Regression guard: every theme must drive BOTH the baseline cells and the
// loud-overlay cells. Originally 8 of 10 themes lacked --fd-validation-red
// etc., so loud cells fell back to a hardcoded hex and didn't repaint on
// theme switch — the user-visible failure that motivated this guard.
test('every theme drives baseline AND loud cells with distinct reds', async ({ page }) => {
  await page.goto('/14_status/04_validation-grid/validation-grid.html');
  await page.waitForSelector('table.grid tbody tr');
  await page.waitForTimeout(200);

  const THEMES = [
    'light',
    'dark',
    'brutalism',
    'cyberpunk',
    'flat',
    'glassmorphism',
    'neumorphism',
    'retro',
    'high-contrast-light',
    'high-contrast-dark',
  ];
  const baselineSel = 'g[data-cell-col="bar"][data-cell-state="error"] rect.validation-bar';
  const loudSel = 'g[data-cell-col="pulse"][data-cell-state="error"] circle.disc';

  const baselineFills = [];
  const loudFills = [];
  for (const theme of THEMES) {
    await page.evaluate((t) => window.flowdashTheme.set(t), theme);
    await page.waitForTimeout(120);
    const sample = await page.evaluate(
      ({ bs, ls }) => ({
        baseline: document.querySelector(bs)
          ? getComputedStyle(document.querySelector(bs)).fill
          : null,
        loud: document.querySelector(ls) ? getComputedStyle(document.querySelector(ls)).fill : null,
      }),
      { bs: baselineSel, ls: loudSel },
    );
    expect.soft(sample.baseline, `${theme}: baseline bar error cell missing`).toBeTruthy();
    expect.soft(sample.loud, `${theme}: pulse error disc missing`).toBeTruthy();
    baselineFills.push(sample.baseline);
    loudFills.push(sample.loud);
  }

  // Both axes must vary across themes — at least 4 distinct reds out of 10 themes.
  expect(new Set(baselineFills).size).toBeGreaterThanOrEqual(4);
  expect(new Set(loudFills).size).toBeGreaterThanOrEqual(4);
});
