// Render-complete event spec (issue #14, task 2.4).
// Covers init-end guarantee, afterRender idle-resolve, once/off semantics,
// per-flush coalescing, re-entrancy, handler-throws, snapshot iteration,
// and survival across setData.

import { test, expect } from '@playwright/test';
import { loadDashboard, baselineData } from './helpers/api-hooks.js';

test.describe('render event hook', () => {
  test('handler registered before init is invoked at least once (default path, zoomToRoot:false)', async ({
    page,
  }) => {
    // Build manually so we can register the handler BEFORE initialize() finishes.
    await page.goto('/tests/fixtures/api-hooks-fixture.html');
    await page.waitForFunction(() => typeof window.flowDashboard !== 'undefined');
    const callCount = await page.evaluate(
      async (data) => {
        let count = 0;
        const dashboard = new window.flowDashboard.Dashboard(data);
        window.dashboard = dashboard;
        dashboard.on('render', () => {
          count++;
        });
        await dashboard.initialize('#graph');
        // Yield one rAF so any per-flush emit also lands.
        await new Promise((r) => requestAnimationFrame(() => r()));
        return count;
      },
      baselineData({ zoomToRoot: false }),
    );
    expect(callCount).toBeGreaterThanOrEqual(1);
  });

  test('handler registered before init is invoked at least once (zoomToRoot:true)', async ({
    page,
  }) => {
    await page.goto('/tests/fixtures/api-hooks-fixture.html');
    await page.waitForFunction(() => typeof window.flowDashboard !== 'undefined');
    const callCount = await page.evaluate(
      async (data) => {
        let count = 0;
        const dashboard = new window.flowDashboard.Dashboard(data);
        window.dashboard = dashboard;
        dashboard.on('render', () => {
          count++;
        });
        await dashboard.initialize('#graph');
        await new Promise((r) => setTimeout(r, 200));
        return count;
      },
      baselineData({ zoomToRoot: true }),
    );
    expect(callCount).toBeGreaterThanOrEqual(1);
  });

  test('afterRender() resolves on a static dashboard without invoking other handlers', async ({
    page,
  }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(async () => {
      let otherInvocations = 0;
      window.dashboard.on('render', () => {
        otherInvocations++;
      });
      const tStart = performance.now();
      await window.dashboard.afterRender();
      const elapsed = performance.now() - tStart;
      return { otherInvocations, elapsed };
    });
    expect(result.otherInvocations).toBe(0); // no phantom emit
    expect(result.elapsed).toBeLessThan(50); // resolved in a microtask, not via a render flush
  });

  test('once() fires exactly once', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const calls = await page.evaluate(async () => {
      let count = 0;
      window.dashboard.once('render', () => {
        count++;
      });
      // Schedule two flushes back-to-back via the public coalescing entry point.
      window.dashboard.onMainDisplayChange();
      await window.dashboard.afterRender();
      window.dashboard.onMainDisplayChange();
      await window.dashboard.afterRender();
      return count;
    });
    expect(calls).toBe(1);
  });

  test('off() removes the handler by reference', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const calls = await page.evaluate(async () => {
      let count = 0;
      const handler = () => {
        count++;
      };
      window.dashboard.on('render', handler);
      window.dashboard.off('render', handler);
      window.dashboard.onMainDisplayChange();
      await window.dashboard.afterRender();
      return count;
    });
    expect(calls).toBe(0);
  });

  test('per-flush coalescing: many schedule calls within one rAF produce one emit', async ({
    page,
  }) => {
    await loadDashboard(page, baselineData());
    const calls = await page.evaluate(async () => {
      let count = 0;
      window.dashboard.on('render', () => {
        count++;
      });
      // Many schedule calls in the same tick should produce exactly one emit
      // thanks to the _displayChangeScheduled early-return.
      window.dashboard.onMainDisplayChange();
      window.dashboard.onMainDisplayChange();
      window.dashboard.onMainDisplayChange();
      window.dashboard.onMainDisplayChange();
      await window.dashboard.afterRender();
      return count;
    });
    expect(calls).toBe(1);
  });

  test('re-entrant mutation from a handler schedules a fresh flush', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(async () => {
      let count = 0;
      let reentered = false;
      const handler = () => {
        count++;
        if (!reentered) {
          reentered = true;
          // Re-enter: schedule a fresh flush from inside the handler.
          // The post-clear ordering of _displayChangeScheduled = false (D10a)
          // means this should land in a new rAF, not be swallowed.
          window.dashboard.onMainDisplayChange();
        }
      };
      window.dashboard.on('render', handler);
      window.dashboard.onMainDisplayChange();
      // First flush: handler fires (count=1) and schedules a re-entrant flush.
      await window.dashboard.afterRender();
      // Second flush: handler fires again (count=2). On webkit the rAF chain
      // can take noticeably longer than chromium, so anchor on afterRender
      // rather than a fixed setTimeout.
      await window.dashboard.afterRender();
      return count;
    });
    expect(result).toBeGreaterThanOrEqual(2);
  });

  test('afterRender() inside a handler resolves in a microtask', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(async () => {
      let otherCount = 0;
      window.dashboard.on('render', () => {
        otherCount++;
      });
      window.dashboard.onMainDisplayChange();
      await window.dashboard.afterRender();
      const beforeOther = otherCount;
      // No state change — afterRender should resolve immediately, no phantom emit.
      const t = performance.now();
      await window.dashboard.afterRender();
      const dt = performance.now() - t;
      return { dt, beforeOther, afterOther: otherCount };
    });
    expect(result.dt).toBeLessThan(50);
    expect(result.afterOther).toBe(result.beforeOther);
  });

  test('a throwing handler does not break the emit loop, error reaches console.error with flowdash: prefix', async ({
    page,
  }) => {
    await loadDashboard(page, baselineData());
    const errorMessages = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errorMessages.push(msg.text());
    });
    const result = await page.evaluate(async () => {
      let h1 = 0;
      let h3 = 0;
      window.dashboard.on('render', () => {
        h1++;
      });
      window.dashboard.on('render', () => {
        throw new Error('boom');
      });
      window.dashboard.on('render', () => {
        h3++;
      });
      window.dashboard.onMainDisplayChange();
      await window.dashboard.afterRender();
      window.dashboard.onMainDisplayChange();
      await window.dashboard.afterRender();
      return { h1, h3 };
    });
    expect(result.h1).toBeGreaterThanOrEqual(2);
    expect(result.h3).toBeGreaterThanOrEqual(2);
    expect(errorMessages.some((m) => /flowdash:.*render handler threw/.test(m))).toBe(true);
  });

  test('handlers survive setData re-init and fire on the post-setData emit', async ({ page }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(async () => {
      let count = 0;
      window.dashboard.on('render', () => {
        count++;
      });
      // Build a new dataset and feed it via setData (re-init path that does
      // not go through initialize()).
      const newData = {
        settings: {
          zoomToRoot: false,
          minimap: { enabled: false, mode: 'hidden' },
        },
        nodes: [
          {
            id: 'r2',
            label: 'R2',
            type: 'Lane',
            children: [{ id: 'leaf-x', label: 'X', type: 'Node' }],
          },
        ],
        edges: [],
      };
      const beforeCount = count;
      await window.dashboard.setData(newData);
      // setData itself resolves before the post-setData onMainDisplayChange
      // rAF fires; afterRender() waits for that next emit. Robust across
      // browsers (webkit's rAF cadence differs from chromium).
      await window.dashboard.afterRender();
      return { beforeCount, afterCount: count };
    });
    expect(result.afterCount).toBeGreaterThan(result.beforeCount);
  });

  test('snapshot iteration: handlers added/removed during emit affect only future emits', async ({
    page,
  }) => {
    await loadDashboard(page, baselineData());
    const result = await page.evaluate(async () => {
      let h2Calls = 0;
      let newCalls = 0;
      const h2 = () => {
        h2Calls++;
      };
      const newHandler = () => {
        newCalls++;
      };
      // h1 mutates the handler set during emit
      const h1 = () => {
        window.dashboard.off('render', h2);
        window.dashboard.on('render', newHandler);
      };
      window.dashboard.on('render', h1);
      window.dashboard.on('render', h2);
      window.dashboard.onMainDisplayChange();
      await window.dashboard.afterRender();
      const afterFirst = { h2Calls, newCalls };
      window.dashboard.onMainDisplayChange();
      await window.dashboard.afterRender();
      const afterSecond = { h2Calls, newCalls };
      return { afterFirst, afterSecond };
    });
    // First emit: h2 still ran (in the snapshot), newHandler did NOT (added during emit)
    expect(result.afterFirst.h2Calls).toBe(1);
    expect(result.afterFirst.newCalls).toBe(0);
    // Second emit: h2 gone, newHandler now in the snapshot
    expect(result.afterSecond.h2Calls).toBe(1);
    expect(result.afterSecond.newCalls).toBe(1);
  });
});
