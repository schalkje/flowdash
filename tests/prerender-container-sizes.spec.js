import { test, expect } from '@playwright/test';
import { gotoAndReady } from './helpers/ready.js';

/**
 * Pre-render container sizing — guards against the regression where
 * subclass `updateChildren()` overrides (Lane, Columns, Adapter, Foundation,
 * Mart, Group) bypassed the prerender guard in BaseContainerNode and
 * recomputed the container size from a fresh layout pass, ending up smaller
 * than the children that the prerender data had baked in.
 *
 * The probe walks every node in the rendered tree and checks that every
 * container's rendered rect (or its `data.{width,height}`) fully contains
 * its children's bounding box (positions × sizes from the prerender JSON).
 */

const PRERENDER_FIXTURES = [
  'dwh-1.prerender.json',
  'dwh-5.prerender.json',
  'dwh-6.fixed.prerender.json',
  'dwh-small.prerender.json',
  'dwh-tiny.prerender.json',
  'All.prerender.json',
];

async function loadPrerenderFixture(page, fixtureName) {
  await page.evaluate(() => {
    document.querySelector('#graph')?.removeAttribute('data-flowdash-ready');
  });
  await page.selectOption('#fileSelect', { label: fixtureName }, { force: true });
  await page.waitForFunction(
    () => document.querySelector('[data-flowdash-ready="true"]') !== null,
    { timeout: 60_000 },
  );
  // Allow the deferred status pass + prerender data clearing to finish.
  await page.waitForTimeout(1500);
}

async function collectContainerSizing(page) {
  return page.evaluate(() => {
    const root = window.dashboard?.main?.root;
    if (!root) return { error: 'no root' };
    const rows = [];
    function visit(node) {
      if (!node) return;
      const dataW = node.data?.width;
      const dataH = node.data?.height;
      let rectW = null;
      let rectH = null;
      if (node.element?.node) {
        const el = node.element.node();
        const shape = el?.querySelector(':scope > .zone-container > .container-shape');
        if (shape) {
          rectW = parseFloat(shape.getAttribute('width'));
          rectH = parseFloat(shape.getAttribute('height'));
        }
      }
      // Children bbox in container-local coords (children x,y are expressed
      // in the inner-container zone's coord system, which is centered around
      // the container; so the bbox width/height should be ≤ rect size).
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      const visibleChildren = (node.childNodes || []).filter((c) => c.visible !== false);
      for (const c of visibleChildren) {
        const w = c.data?.width || 0;
        const h = c.data?.height || 0;
        const cx = c.x || 0;
        const cy = c.y || 0;
        minX = Math.min(minX, cx - w / 2);
        maxX = Math.max(maxX, cx + w / 2);
        minY = Math.min(minY, cy - h / 2);
        maxY = Math.max(maxY, cy + h / 2);
      }
      let bbox = null;
      if (visibleChildren.length > 0 && Number.isFinite(minX)) {
        bbox = { width: maxX - minX, height: maxY - minY };
      }
      rows.push({
        id: node.id,
        type: node.data?.type,
        collapsed: !!node.collapsed,
        dataW,
        dataH,
        rectW,
        rectH,
        bbox,
      });
      for (const c of node.childNodes || []) visit(c);
    }
    visit(root);
    return { rows };
  });
}

test.describe('Pre-render container sizes', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/dashboard/flowdash-js.html');
    await page.waitForFunction(
      () => document.querySelector('[data-flowdash-ready="true"]') !== null,
      { timeout: 60_000 },
    );
  });

  for (const fixture of PRERENDER_FIXTURES) {
    test(`${fixture}: every container fully contains its children`, async ({ page }) => {
      await loadPrerenderFixture(page, fixture);
      const result = await collectContainerSizing(page);
      expect(result.rows).toBeDefined();

      // Tolerance accounts for ½-pixel rounding when D3 attribute values are
      // re-read from the DOM as floats; not a functional slack.
      const TOL = 1;
      const undersized = result.rows.filter((r) => {
        if (!r.bbox) return false;
        // Skip collapsed containers — their rect is sized to header height
        // only by design, even if (now-hidden) children would overflow.
        if (r.collapsed) return false;
        // Only flag when the rendered rect is smaller than children's bbox.
        if (r.rectW === null || r.rectH === null) return false;
        return r.rectW + TOL < r.bbox.width || r.rectH + TOL < r.bbox.height;
      });

      if (undersized.length > 0) {
        console.log('Containers smaller than children (sample, first 5):');
        for (const m of undersized.slice(0, 5)) {
          console.log(JSON.stringify(m));
        }
      }
      expect(undersized, 'no container should be smaller than its children').toHaveLength(0);
    });
  }

  // Per-container-type spot checks on the All fixture, which exercises every
  // subclass in the same render pass. If a future change reintroduces a bug
  // for one node type only, this surfaces which type.
  test('All.prerender.json: each container type contains its children', async ({ page }) => {
    await loadPrerenderFixture(page, 'All.prerender.json');
    const result = await collectContainerSizing(page);
    const TOL = 1;

    const byType = new Map();
    for (const r of result.rows) {
      if (!r.bbox || r.collapsed || r.rectW === null) continue;
      const key = (r.type || 'unknown').toLowerCase();
      if (!byType.has(key)) byType.set(key, { total: 0, undersized: 0 });
      const stat = byType.get(key);
      stat.total += 1;
      if (r.rectW + TOL < r.bbox.width || r.rectH + TOL < r.bbox.height) {
        stat.undersized += 1;
      }
    }

    // Every relevant subclass should appear in the All fixture.
    for (const t of ['lane', 'columns', 'adapter', 'foundation']) {
      expect(byType.has(t), `expected at least one container of type ${t}`).toBe(true);
    }

    for (const [t, stat] of byType) {
      expect(stat.undersized, `${t}: ${stat.undersized}/${stat.total} undersized`).toBe(0);
    }
  });
});
