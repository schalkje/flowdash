// @ts-check
// Tests for the validation-indicator-modes capability (issues #15 + #17).
//
// Drives the /14_status/03_validation-minimal/validation-minimal.html demo
// which renders one interactive dashboard (#mainGraph) + a 3-mode × 8-state
// matrix (#graph-bar, #graph-circle, #graph-corner).
//
// Coverage:
//   - Defaults: bar baseline + no loud overlay
//   - state → color rendering per baseline mode
//   - 'na' produces no DOM for that side
//   - 'busy' carries .validation-indicator--busy + <animate> child
//   - prefers-reduced-motion suppresses the <animate> child
//   - error/warning message becomes SVG <title>
//   - setValidationMode swaps baseline DOM live
//   - setValidationLoudError swaps loud DOM live
//   - Per-node validationMode override wins over dashboard default
//   - Per-node validationLoudError override wins over dashboard default
//   - Loud overlay fires per side independently
//   - Loud overlay strictly tied to state === 'error' (not 'warning')
//   - Cross-axis values rejected with console.warn
//   - Legacy setValidationIndicatorStyle / setValidationIndicatorMode removed

import { test, expect } from '@playwright/test';

const DEMO_URL = '/14_status/03_validation-minimal/validation-minimal.html';

async function loadDemo(page, { reducedMotion = false } = {}) {
  if (reducedMotion) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  }
  await page.goto(DEMO_URL);
  await page.waitForSelector('[data-flowdash-ready="true"]', { timeout: 8000 });
  // Wait for matrix dashboards to settle (4 total = main + 3 matrix rows).
  await page.waitForFunction(
    () => document.querySelectorAll('[data-flowdash-ready="true"]').length >= 4,
    { timeout: 8000 },
  );
}

test.describe('validation-indicator-modes', () => {
  test('defaults produce baseline-only behavior (bar everywhere, no loud overlay)', async ({
    page,
  }) => {
    await loadDemo(page);
    const result = await page.evaluate(() => {
      const svg = document.querySelector('#mainGraph');
      const layer = svg.querySelector('g.validation-indicators');
      return {
        validationMode: layer?.getAttribute('data-validation-mode'),
        validationLoudError: layer?.getAttribute('data-validation-loud-error'),
        bars: svg.querySelectorAll('rect.validation-bar').length,
        circles: svg.querySelectorAll('circle.validation-circle').length,
        corners: svg.querySelectorAll('path.validation-corner').length,
        loudHalos: svg.querySelectorAll('circle.halo').length,
      };
    });
    expect(result.validationMode).toBe('bar');
    expect(result.validationLoudError).toBe('none');
    expect(result.bars).toBeGreaterThan(0);
    expect(result.circles).toBe(0);
    expect(result.corners).toBe(0);
    expect(result.loudHalos).toBe(0);
  });

  test('every non-na state renders a side indicator with non-empty fill per baseline mode', async ({
    page,
  }) => {
    await loadDemo(page);
    for (const mode of ['bar', 'circle', 'corner']) {
      const result = await page.evaluate((m) => {
        const svg = document.querySelector(`#graph-${m}`);
        if (!svg) return null;
        const states = ['unknown', 'ready', 'busy', 'error', 'warning', 'disabled', 'ok'];
        return states.map((s) => {
          const sideG = svg.querySelector(
            `g.validation-indicator[data-validation-state="${s}"][data-side="post"]`,
          );
          if (!sideG) return { state: s, present: false };
          const shape = sideG.querySelector('rect, circle, path');
          const fill = shape ? shape.getAttribute('fill') : null;
          return { state: s, present: true, fill };
        });
      }, mode);
      expect(result).not.toBeNull();
      for (const cell of /** @type {Array<{state: string, present: boolean, fill?: string}>} */ (
        result
      )) {
        expect.soft(cell.present, `${mode}/${cell.state} should render DOM`).toBe(true);
        expect.soft(cell.fill, `${mode}/${cell.state} should have a fill`).toMatch(/^var\(/);
      }
    }
  });

  test("'na' state produces no DOM for that side regardless of mode", async ({ page }) => {
    await loadDemo(page);
    for (const mode of ['bar', 'circle', 'corner']) {
      const naSide = await page.evaluate((m) => {
        const svg = document.querySelector(`#graph-${m}`);
        if (!svg) return null;
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

  test("'busy' state carries .validation-indicator--busy class and <animate> child", async ({
    page,
  }) => {
    await loadDemo(page);
    const busy = await page.evaluate(() => {
      const svg = document.querySelector('#graph-bar');
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
      const svg = document.querySelector('#graph-bar');
      const sideG = svg.querySelector('g.validation-indicator[data-validation-state="busy"]');
      if (!sideG) return null;
      const hasClass = sideG.classList.contains('validation-indicator--busy');
      const animateChild = sideG.querySelector('animate');
      return { hasClass, hasAnimate: !!animateChild };
    });
    expect(result).not.toBeNull();
    expect(result.hasClass).toBe(true);
    expect(result.hasAnimate).toBe(false);
  });

  test('error/warning with message becomes SVG <title>', async ({ page }) => {
    await loadDemo(page);
    const titles = await page.evaluate(() => {
      const svg = document.querySelector('#graph-bar');
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
    expect(titles.okHasTitle).toBe(false);
  });

  test('setValidationMode swaps baseline DOM on the fly', async ({ page }) => {
    await loadDemo(page);
    const before = await page.evaluate(() => {
      const svg = document.querySelector('#mainGraph');
      return svg.querySelectorAll('rect.validation-bar').length;
    });
    expect(before).toBeGreaterThan(0);

    await page.evaluate(() => window.dashboard.setValidationMode('circle'));
    await page.waitForTimeout(120);

    const after = await page.evaluate(() => {
      const svg = document.querySelector('#mainGraph');
      const bars = svg.querySelectorAll('rect.validation-bar').length;
      const circles = svg.querySelectorAll('circle.validation-circle').length;
      const mode = svg
        .querySelector('g.validation-indicators')
        ?.getAttribute('data-validation-mode');
      return { bars, circles, mode };
    });
    expect(after.bars).toBe(0);
    expect(after.circles).toBeGreaterThan(0);
    expect(after.mode).toBe('circle');
  });

  test('setValidationLoudError fires loud overlay on error sides; other sides keep baseline', async ({
    page,
  }) => {
    await loadDemo(page);
    await page.evaluate(() => window.dashboard.setValidationMode('circle'));
    await page.evaluate(() => window.dashboard.setValidationLoudError('pulse'));
    await page.waitForTimeout(120);

    const result = await page.evaluate(() => {
      const svg = document.querySelector('#mainGraph');
      // Error node should render a halo (pulse), not a circle baseline
      const errorNode = svg.querySelector('g[id="node-error"]');
      const errorPost = errorNode?.querySelector('g.validation-indicator[data-side="post"]');
      const errorStyle = errorPost?.getAttribute('data-validation-style');
      const errorHasHalo = !!errorPost?.querySelector('circle.halo');
      const errorHasCircle = !!errorPost?.querySelector('circle.validation-circle');

      // OK node should still render a baseline circle (loud doesn't fire)
      const okNode = svg.querySelector('g[id="node-ok"]');
      const okPost = okNode?.querySelector('g.validation-indicator[data-side="post"]');
      const okStyle = okPost?.getAttribute('data-validation-style');
      const okHasCircle = !!okPost?.querySelector('circle.validation-circle');

      const layer = svg.querySelector('g.validation-indicators');
      return {
        errorStyle,
        errorHasHalo,
        errorHasCircle,
        okStyle,
        okHasCircle,
        loudErrorAttr: layer?.getAttribute('data-validation-loud-error'),
      };
    });
    expect(result.loudErrorAttr).toBe('pulse');
    expect(result.errorStyle).toBe('pulse');
    expect(result.errorHasHalo).toBe(true);
    expect(result.errorHasCircle).toBe(false);
    expect(result.okStyle).toBe('circle');
    expect(result.okHasCircle).toBe(true);
  });

  test("loud overlay does NOT fire on 'warning' (strictly error-only)", async ({ page }) => {
    await loadDemo(page);
    await page.evaluate(() => window.dashboard.setValidationMode('circle'));
    await page.evaluate(() => window.dashboard.setValidationLoudError('pulse'));
    await page.waitForTimeout(120);

    const result = await page.evaluate(() => {
      const svg = document.querySelector('#mainGraph');
      const warningNode = svg.querySelector('g[id="node-warning"]');
      const warningPost = warningNode?.querySelector('g.validation-indicator[data-side="post"]');
      return {
        style: warningPost?.getAttribute('data-validation-style'),
        state: warningPost?.getAttribute('data-validation-state'),
        hasHalo: !!warningPost?.querySelector('circle.halo'),
        hasCircle: !!warningPost?.querySelector('circle.validation-circle'),
      };
    });
    expect(result.state).toBe('warning');
    expect(result.style).toBe('circle');
    expect(result.hasHalo).toBe(false);
    expect(result.hasCircle).toBe(true);
  });

  test('loud overlay fires per side independently', async ({ page }) => {
    await loadDemo(page);
    await page.evaluate(() => window.dashboard.setValidationMode('circle'));
    await page.evaluate(() => window.dashboard.setValidationLoudError('pulse'));
    // Configure node-error: pre = 'ok', post = 'error'. Then flip pre to 'error'
    // and confirm BOTH sides emit a pulse.
    await page.evaluate(() => {
      const dash = window.dashboard;
      dash.setValidationStateById('node-error', 'pre', { state: 'ok' });
      // post stays 'error' from the demo fixture
    });
    await page.waitForTimeout(80);

    const before = await page.evaluate(() => {
      const node = document.querySelector('#mainGraph g[id="node-error"]');
      const pre = node?.querySelector('g.validation-indicator[data-side="pre"]');
      const post = node?.querySelector('g.validation-indicator[data-side="post"]');
      return {
        preStyle: pre?.getAttribute('data-validation-style'),
        postStyle: post?.getAttribute('data-validation-style'),
      };
    });
    expect(before.preStyle).toBe('circle');
    expect(before.postStyle).toBe('pulse');

    await page.evaluate(() => {
      window.dashboard.setValidationStateById('node-error', 'pre', {
        state: 'error',
        message: 'pre-err',
      });
    });
    await page.waitForTimeout(80);

    const after = await page.evaluate(() => {
      const node = document.querySelector('#mainGraph g[id="node-error"]');
      const pre = node?.querySelector('g.validation-indicator[data-side="pre"]');
      const post = node?.querySelector('g.validation-indicator[data-side="post"]');
      return {
        preStyle: pre?.getAttribute('data-validation-style'),
        postStyle: post?.getAttribute('data-validation-style'),
        preHasHalo: !!pre?.querySelector('circle.halo'),
        postHasHalo: !!post?.querySelector('circle.halo'),
      };
    });
    expect(after.preStyle).toBe('pulse');
    expect(after.postStyle).toBe('pulse');
    expect(after.preHasHalo).toBe(true);
    expect(after.postHasHalo).toBe(true);
  });

  test("validationLoudError='none' keeps baseline on error sides (no loud DOM)", async ({
    page,
  }) => {
    await loadDemo(page);
    await page.evaluate(() => window.dashboard.setValidationMode('circle'));
    await page.evaluate(() => window.dashboard.setValidationLoudError('none'));
    await page.waitForTimeout(120);

    const result = await page.evaluate(() => {
      const svg = document.querySelector('#mainGraph');
      const errorPost = svg
        .querySelector('g[id="node-error"]')
        ?.querySelector('g.validation-indicator[data-side="post"]');
      return {
        style: errorPost?.getAttribute('data-validation-style'),
        state: errorPost?.getAttribute('data-validation-state'),
        hasHalo: !!svg.querySelector('circle.halo'),
      };
    });
    expect(result.style).toBe('circle');
    expect(result.state).toBe('error');
    expect(result.hasHalo).toBe(false);
  });

  test("validationMode='none' + validationLoudError='pulse': only error sides render", async ({
    page,
  }) => {
    await loadDemo(page);
    await page.evaluate(() => window.dashboard.setValidationMode('none'));
    await page.evaluate(() => window.dashboard.setValidationLoudError('pulse'));
    await page.waitForTimeout(120);

    const result = await page.evaluate(() => {
      const svg = document.querySelector('#mainGraph');
      const okPost = svg
        .querySelector('g[id="node-ok"]')
        ?.querySelector('g.validation-indicator[data-side="post"]');
      const errorPost = svg
        .querySelector('g[id="node-error"]')
        ?.querySelector('g.validation-indicator[data-side="post"]');
      return {
        okPresent: !!okPost,
        errorStyle: errorPost?.getAttribute('data-validation-style'),
        errorHasHalo: !!errorPost?.querySelector('circle.halo'),
      };
    });
    expect(result.okPresent).toBe(false);
    expect(result.errorStyle).toBe('pulse');
    expect(result.errorHasHalo).toBe(true);
  });

  test('per-node validationMode overrides dashboard default', async ({ page }) => {
    await loadDemo(page);
    const result = await page.evaluate(() => {
      const target = window.dashboard.main.root.getNode('node-error');
      target.data.validationMode = 'corner';
      target._renderValidationIndicators();
      const targetSide = target.element
        ?.node()
        ?.querySelector('g.validation-indicator[data-side="post"]');
      const targetStyle = targetSide?.getAttribute('data-validation-style');
      const targetShape = targetSide?.querySelector('path.validation-corner') ? 'corner' : null;

      const other = window.dashboard.main.root.getNode('node-warning');
      const otherSide = other.element
        ?.node()
        ?.querySelector('g.validation-indicator[data-side="post"]');
      const otherStyle = otherSide?.getAttribute('data-validation-style');
      const otherShape = otherSide?.querySelector('rect.validation-bar') ? 'bar' : null;
      return { targetStyle, targetShape, otherStyle, otherShape };
    });
    expect(result.targetStyle).toBe('corner');
    expect(result.targetShape).toBe('corner');
    expect(result.otherStyle).toBe('bar');
    expect(result.otherShape).toBe('bar');
  });

  test('per-node validationLoudError overrides dashboard default', async ({ page }) => {
    await loadDemo(page);
    // Dashboard default: validationLoudError === 'none'. Override one node only.
    const result = await page.evaluate(() => {
      const target = window.dashboard.main.root.getNode('node-error');
      target.data.validationLoudError = 'pulse';
      target._renderValidationIndicators();
      const targetSide = target.element
        ?.node()
        ?.querySelector('g.validation-indicator[data-side="post"]');
      const targetStyle = targetSide?.getAttribute('data-validation-style');
      const targetHasHalo = !!targetSide?.querySelector('circle.halo');

      // Other node with state 'warning' (would NOT trigger loud anyway, but its
      // baseline remains untouched)
      const other = window.dashboard.main.root.getNode('node-warning');
      const otherSide = other.element
        ?.node()
        ?.querySelector('g.validation-indicator[data-side="post"]');
      const otherStyle = otherSide?.getAttribute('data-validation-style');
      const otherHasHalo = !!otherSide?.querySelector('circle.halo');
      return { targetStyle, targetHasHalo, otherStyle, otherHasHalo };
    });
    expect(result.targetStyle).toBe('pulse');
    expect(result.targetHasHalo).toBe(true);
    expect(result.otherStyle).toBe('bar');
    expect(result.otherHasHalo).toBe(false);
  });

  test('cross-axis values are rejected with console.warn', async ({ page }) => {
    await loadDemo(page);
    const result = await page.evaluate(() => {
      const warnings = [];
      const orig = console.warn;
      console.warn = (...args) => warnings.push(args.join(' '));
      try {
        // Passing a loud value to the baseline setter
        window.dashboard.setValidationMode('pulse');
        // Passing a baseline value to the loud setter
        window.dashboard.setValidationLoudError('bar');
        const settings = window.dashboard.main.root.settings;
        return {
          warnings,
          validationMode: settings.validationMode,
          validationLoudError: settings.validationLoudError,
        };
      } finally {
        console.warn = orig;
      }
    });
    expect(result.warnings.some((w) => w.includes('setValidationMode'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('setValidationLoudError'))).toBe(true);
    // Settings unchanged after invalid input
    expect(result.validationMode).toBe('bar');
    expect(result.validationLoudError).toBe('none');
  });

  test('legacy setters and attributes no longer exist', async ({ page }) => {
    await loadDemo(page);
    const result = await page.evaluate(() => ({
      hasSetValidationIndicatorMode:
        typeof window.dashboard.setValidationIndicatorMode === 'function',
      hasSetValidationIndicatorStyle:
        typeof window.dashboard.setValidationIndicatorStyle === 'function',
      hasLegacyStyleSlot:
        'style' in (window.dashboard.main.root.settings.validationIndicator || {}),
    }));
    expect(result.hasSetValidationIndicatorMode).toBe(false);
    expect(result.hasSetValidationIndicatorStyle).toBe(false);
    expect(result.hasLegacyStyleSlot).toBe(false);
  });
});
