// @ts-check
// Tests for the validation-indicator-modes capability (issue #15).
//
// Drives the new /14_status/03_validation-minimal/validation-minimal.html
// demo which renders one interactive dashboard + a 3-mode × 8-state matrix.
// Coverage:
//   (a) state→color rendering per minimal mode (every visible state has DOM)
//   (b) 'na' produces no DOM for that side
//   (c) 'busy' has the .validation-indicator--busy class; <animate> child
//       suppressed under prefers-reduced-motion
//   (d) message becomes an SVG <title>
//   (e) setValidationIndicatorMode swaps DOM on the fly
//   (f) per-node validationIndicatorMode override

import { test, expect } from '@playwright/test';

const DEMO_URL = '/14_status/03_validation-minimal/validation-minimal.html';

async function loadDemo(page, { reducedMotion = false } = {}) {
  if (reducedMotion) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  }
  await page.goto(DEMO_URL);
  await page.waitForSelector('[data-flowdash-ready="true"]', { timeout: 8000 });
  // Wait for matrix dashboards to settle.
  await page.waitForFunction(
    () => document.querySelectorAll('[data-flowdash-ready="true"]').length >= 4,
    { timeout: 8000 },
  );
}

test.describe('validation-indicator-modes', () => {
  test('every non-na state renders a side indicator with non-empty fill', async ({ page }) => {
    await loadDemo(page);
    for (const mode of ['minimal-bar', 'minimal-circle', 'minimal-corner']) {
      const result = await page.evaluate((m) => {
        const svg = document.querySelector(`#graph-${m}`);
        if (!svg) return null;
        const states = ['unknown', 'ready', 'busy', 'error', 'warning', 'disabled', 'ok'];
        return states.map((s) => {
          const sideG = svg.querySelector(
            `g.validation-indicator[data-validation-state="${s}"][data-side="post"]`,
          );
          if (!sideG) return { state: s, present: false };
          // First filled child shape under the side group
          const shape = sideG.querySelector('rect, circle, path');
          const fill = shape ? shape.getAttribute('fill') : null;
          return { state: s, present: true, fill };
        });
      }, mode);
      expect(result).not.toBeNull();
      // Every visible state should produce DOM with a non-empty fill (a var() ref).
      for (const cell of /** @type {Array<{state: string, present: boolean, fill?: string}>} */ (
        result
      )) {
        expect.soft(cell.present, `${mode}/${cell.state} should render DOM`).toBe(true);
        expect.soft(cell.fill, `${mode}/${cell.state} should have a fill`).toMatch(/^var\(/);
      }
    }
  });

  test("'na' state produces no DOM for that side", async ({ page }) => {
    await loadDemo(page);
    for (const mode of ['minimal-bar', 'minimal-circle', 'minimal-corner']) {
      const naSide = await page.evaluate((m) => {
        const svg = document.querySelector(`#graph-${m}`);
        if (!svg) return null;
        // The 'na' node is `${mode}-node-na`. Its post side should have no
        // validation-indicator group at all.
        const nodeG = svg.querySelector(`g[id="${m}-node-na"]`);
        if (!nodeG) return { found: false };
        const post = nodeG.querySelector('g.validation-indicator[data-side="post"]');
        return { found: true, hasPost: !!post };
      }, mode);
      expect(naSide).not.toBeNull();
      expect.soft(naSide.found, `${mode}: 'na' node should exist`).toBe(true);
      expect.soft(naSide.hasPost, `${mode}: 'na' should produce no side DOM`).toBe(false);
    }
  });

  test("'busy' state carries .validation-indicator--busy class and animates", async ({ page }) => {
    await loadDemo(page);
    const busy = await page.evaluate(() => {
      const svg = document.querySelector('#graph-minimal-bar');
      const sideG = svg.querySelector('g.validation-indicator[data-validation-state="busy"]');
      if (!sideG) return null;
      const hasClass = sideG.classList.contains('validation-indicator--busy');
      const animateChild = sideG.querySelector('animate');
      return { hasClass, hasAnimate: !!animateChild };
    });
    expect(busy).not.toBeNull();
    expect(busy.hasClass).toBe(true);
    expect(busy.hasAnimate).toBe(true);
  });

  test("'busy' animation is suppressed under prefers-reduced-motion", async ({ page }) => {
    await loadDemo(page, { reducedMotion: true });
    const result = await page.evaluate(() => {
      const svg = document.querySelector('#graph-minimal-bar');
      const sideG = svg.querySelector('g.validation-indicator[data-validation-state="busy"]');
      if (!sideG) return null;
      const hasClass = sideG.classList.contains('validation-indicator--busy');
      const animateChild = sideG.querySelector('animate');
      return { hasClass, hasAnimate: !!animateChild };
    });
    expect(result).not.toBeNull();
    // Class still applies (so CSS can style the static state); SVG <animate> child is absent.
    expect(result.hasClass).toBe(true);
    expect(result.hasAnimate).toBe(false);
  });

  test('error/warning with message becomes SVG <title>', async ({ page }) => {
    await loadDemo(page);
    const titles = await page.evaluate(() => {
      const svg = document.querySelector('#graph-minimal-bar');
      const errorSide = svg.querySelector('g.validation-indicator[data-validation-state="error"]');
      const warningSide = svg.querySelector(
        'g.validation-indicator[data-validation-state="warning"]',
      );
      const okSide = svg.querySelector('g.validation-indicator[data-validation-state="ok"]');
      const errorTitle = errorSide?.querySelector(':scope > title')?.textContent ?? null;
      const warningTitle = warningSide?.querySelector(':scope > title')?.textContent ?? null;
      const okTitle = okSide?.querySelector(':scope > title') ?? null;
      return { errorTitle, warningTitle, okHasTitle: !!okTitle };
    });
    expect(titles.errorTitle).toBe('sample error message');
    expect(titles.warningTitle).toBe('sample warning message');
    // States other than error/warning never expose a <title> even with a message
    expect(titles.okHasTitle).toBe(false);
  });

  test('setValidationIndicatorMode swaps DOM on the fly', async ({ page }) => {
    await loadDemo(page);
    const before = await page.evaluate(() => {
      const svg = document.querySelector('#mainGraph');
      return svg.querySelectorAll('rect.validation-bar').length;
    });
    expect(before).toBeGreaterThan(0);

    await page.evaluate(() => window.dashboard.setValidationIndicatorMode('minimal-circle'));
    await page.waitForTimeout(120);

    const after = await page.evaluate(() => {
      const svg = document.querySelector('#mainGraph');
      const bars = svg.querySelectorAll('rect.validation-bar').length;
      const circles = svg.querySelectorAll('circle.validation-circle').length;
      const mode = svg.querySelector('g.validation-indicators')?.getAttribute('data-mode');
      return { bars, circles, mode };
    });
    expect(after.bars).toBe(0);
    expect(after.circles).toBeGreaterThan(0);
    expect(after.mode).toBe('minimal-circle');
  });

  test('per-node validationIndicatorMode overrides dashboard default', async ({ page }) => {
    await loadDemo(page);
    // Dashboard default is 'minimal-bar'. Override one node to 'minimal-corner'.
    const result = await page.evaluate(() => {
      const target = window.dashboard.main.root.getNode('node-error');
      target.data.validationIndicatorMode = 'minimal-corner';
      target._renderValidationIndicators();
      // Other node ('node-busy') keeps the dashboard default
      const targetSide = target.element
        ?.node()
        ?.querySelector('g.validation-indicator[data-side="post"]');
      const targetMode = targetSide?.getAttribute('data-mode');
      const targetShape = targetSide?.querySelector('path.validation-corner') ? 'corner' : null;

      const other = window.dashboard.main.root.getNode('node-warning');
      const otherSide = other.element
        ?.node()
        ?.querySelector('g.validation-indicator[data-side="post"]');
      const otherMode = otherSide?.getAttribute('data-mode');
      const otherShape = otherSide?.querySelector('rect.validation-bar') ? 'bar' : null;
      return { targetMode, targetShape, otherMode, otherShape };
    });
    expect(result.targetMode).toBe('minimal-corner');
    expect(result.targetShape).toBe('corner');
    expect(result.otherMode).toBe('minimal-bar');
    expect(result.otherShape).toBe('bar');
  });
});
