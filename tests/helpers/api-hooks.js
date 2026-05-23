/**
 * Shared helpers for the issue #14 find-and-navigate API hook specs.
 *
 * Tests share a small fixture page that exposes `window.buildDashboard(data)`
 * and stores the resulting Dashboard on `window.dashboard`. Each spec calls
 * `loadDashboard(page, data)` with whatever data shape it needs and then
 * exercises the new API surface (on/off/once/afterRender, getNodeBounds,
 * panToBounds, revealNode, getDatasetNodeIds, setNodeClass, data-dataset-id).
 */

export const FIXTURE_URL = '/tests/fixtures/api-hooks-fixture.html';

// Scope DOM queries to the main canvas SVG, not the minimap chrome SVG, so
// node id selectors don't accidentally match the minimap's mirrored copy.
export const GRAPH_SCOPE = '#graph';

/**
 * Baseline test data: one container root, two child lanes, two leaves per
 * lane. `ds-shared` is carried by `leaf-a1` and `leaf-b1`; `ds-unique` only
 * by `leaf-a2`; `leaf-b2` carries no `datasetId`.
 */
export function baselineData(overrides = {}) {
  return {
    settings: {
      zoomToRoot: false,
      toggleCollapseOnStatusChange: false,
      cascadeOnStatusChange: false,
      showBoundingBox: false,
      minimap: { enabled: false, mode: 'hidden' },
      ...overrides,
    },
    nodes: [
      {
        id: 'root',
        label: 'Root',
        type: 'Columns',
        children: [
          {
            id: 'lane-a',
            label: 'Lane A',
            type: 'Lane',
            children: [
              { id: 'leaf-a1', label: 'A1', type: 'Node', datasetId: 'ds-shared' },
              { id: 'leaf-a2', label: 'A2', type: 'Node', datasetId: 'ds-unique' },
            ],
          },
          {
            id: 'lane-b',
            label: 'Lane B',
            type: 'Lane',
            children: [
              { id: 'leaf-b1', label: 'B1', type: 'Node', datasetId: 'ds-shared' },
              { id: 'leaf-b2', label: 'B2', type: 'Node' },
            ],
          },
        ],
      },
    ],
    edges: [],
  };
}

/**
 * Navigate to the fixture and build a Dashboard with the given data. Waits
 * for the dashboard's data-flowdash-ready signal (set inside initialize()).
 */
export async function loadDashboard(page, data) {
  await page.goto(FIXTURE_URL);
  await page.waitForFunction(() => typeof window.buildDashboard === 'function');
  await page.evaluate(async (d) => {
    await window.buildDashboard(d);
  }, data);
  await page.waitForFunction(
    () => document.querySelector('[data-flowdash-ready="true"]') !== null,
    null,
    { timeout: 15000 },
  );
  // Yield one rAF so init-end emit's microtask queue settles.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
}
