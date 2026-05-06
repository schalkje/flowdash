import { test, expect } from '@playwright/test';
import { gotoAndReady } from './helpers/ready.js';

/**
 * Dynamic mutations API — the public primitives that consumer dashboard
 * apps wrap with their streaming integration code. The library does not
 * implement streaming itself; these are the building blocks.
 *
 * Tests cover the public surface: addNode, removeNode, addEdge, removeEdge,
 * and batch() coalescing. Strict-by-default assertions (duplicate id,
 * missing parent) are also tested.
 *
 * Fixture: dwh-tiny.json — small enough that mutations land fast and
 * structural assertions are easy to reason about.
 */

const FIXTURE = 'dwh-tiny.json';

async function loadTiny(page) {
  await gotoAndReady(page, '/dashboard/flowdash-js.html');
  await page.click('#settingsBtn').catch(() => {});
  // Clear the readiness attribute set by the initial fixture so we know the
  // next ready signal is the new fixture's, not stale state.
  await page.evaluate(() => {
    const r = document.querySelector('#graph');
    if (r) r.removeAttribute('data-flowdash-ready');
  });
  await page.selectOption('#fileSelect', { label: FIXTURE }, { force: true });
  await page.waitForFunction(
    () => document.querySelector('[data-flowdash-ready="true"]') !== null,
    { timeout: 30000 },
  );
}

async function pickContainerWithChildren(page) {
  return page.evaluate(() => {
    const find = (node) => {
      if (!node) return null;
      if (node.isContainer && Array.isArray(node.childNodes) && node.childNodes.length >= 1) {
        return node.id;
      }
      for (const c of node.childNodes || []) {
        const id = find(c);
        if (id !== null) return id;
      }
      return null;
    };
    return find(window.dashboard.main.root);
  });
}

test.describe('Dynamic mutations API', () => {
  test.beforeEach(async ({ page }) => {
    await loadTiny(page);
  });

  test('addNode adds a child to an existing container', async ({ page }) => {
    const parentId = await pickContainerWithChildren(page);
    expect(parentId).not.toBeNull();

    const result = await page.evaluate(async (parentId) => {
      const newId = 999001;
      const before = window.dashboard.main.root.getNode(newId);
      const node = await window.dashboard.addNode(parentId, {
        id: newId,
        label: 'mutation-test-leaf',
        type: 'Node',
        category: 'staging',
        children: [],
      });
      const after = window.dashboard.main.root.getNode(newId);
      return {
        beforeFound: !!before,
        afterFound: !!after,
        nodeIdMatches: node?.id === newId,
        parentIncludesChild: !!window.dashboard.main.root
          .getNode(parentId)
          ?.childNodes?.some((c) => c.id === newId),
      };
    }, parentId);

    expect(result.beforeFound).toBe(false);
    expect(result.afterFound).toBe(true);
    expect(result.nodeIdMatches).toBe(true);
    expect(result.parentIncludesChild).toBe(true);
  });

  test('addNode throws on duplicate id', async ({ page }) => {
    const parentId = await pickContainerWithChildren(page);
    const error = await page.evaluate(async (parentId) => {
      // Pick an id that already exists.
      const existingId = window.dashboard.main.root.getNode(parentId).id;
      try {
        await window.dashboard.addNode(parentId, {
          id: existingId,
          label: 'x',
          type: 'Node',
          children: [],
        });
        return null;
      } catch (e) {
        return String(e.message || e);
      }
    }, parentId);
    expect(error, 'should throw on duplicate id').toMatch(/duplicate node id/);
  });

  test('addNode throws on missing parent', async ({ page }) => {
    const error = await page.evaluate(async () => {
      try {
        await window.dashboard.addNode(999999, {
          id: 1234567,
          label: 'x',
          type: 'Node',
          children: [],
        });
        return null;
      } catch (e) {
        return String(e.message || e);
      }
    });
    expect(error, 'should throw on missing parent').toMatch(/node not found/);
  });

  test('removeNode removes a leaf and its DOM', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Find a leaf to remove (a node with no children).
      const findLeaf = (n) => {
        if (!n) return null;
        if ((!n.childNodes || n.childNodes.length === 0) && n.parentNode) return n.id;
        for (const c of n.childNodes || []) {
          const id = findLeaf(c);
          if (id !== null) return id;
        }
        return null;
      };
      const leafId = findLeaf(window.dashboard.main.root);
      if (leafId === null) return { skipped: true };
      const beforeFound = !!window.dashboard.main.root.getNode(leafId);
      const beforeDom = !!document.querySelector(`g[id="${leafId}"]`);
      await window.dashboard.removeNode(leafId);
      const afterFound = !!window.dashboard.main.root.getNode(leafId);
      const afterDom = !!document.querySelector(`g[id="${leafId}"]`);
      return { skipped: false, beforeFound, beforeDom, afterFound, afterDom };
    });
    if (result.skipped) {
      test.skip(true, 'no leaf node available to remove');
    }
    expect(result.beforeFound).toBe(true);
    expect(result.beforeDom).toBe(true);
    expect(result.afterFound).toBe(false);
    expect(result.afterDom).toBe(false);
  });

  test('removeNode rejects removing the root', async ({ page }) => {
    const error = await page.evaluate(async () => {
      const rootId = window.dashboard.main.root.id;
      try {
        await window.dashboard.removeNode(rootId);
        return null;
      } catch (e) {
        return String(e.message || e);
      }
    });
    expect(error, 'should reject root removal').toMatch(/cannot remove the root/);
  });

  test('addEdge + removeEdge between existing nodes', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Pick two leaves with a common ancestor — the simplest case.
      const leaves = [];
      const visit = (n) => {
        if (!n.childNodes || n.childNodes.length === 0) {
          if (n.parentNode) leaves.push(n);
        } else {
          for (const c of n.childNodes) visit(c);
        }
      };
      visit(window.dashboard.main.root);
      if (leaves.length < 2) return { skipped: true };
      const a = leaves[0];
      const b = leaves[leaves.length - 1];

      const created = await window.dashboard.addEdge({
        id: 'mut-test-edge',
        source: a.id,
        target: b.id,
      });
      const sourceListAfterAdd = a.edges.outgoing.length;
      const targetListAfterAdd = b.edges.incoming.length;

      await window.dashboard.removeEdge('mut-test-edge');
      const sourceListAfterRemove = a.edges.outgoing.length;
      const targetListAfterRemove = b.edges.incoming.length;

      return {
        skipped: false,
        addedEdgeId: created?.id,
        sourceListAfterAdd,
        targetListAfterAdd,
        sourceListAfterRemove,
        targetListAfterRemove,
      };
    });
    if (result.skipped) {
      test.skip(true, 'fewer than 2 leaves available for edge test');
    }
    expect(result.addedEdgeId).toBe('mut-test-edge');
    expect(result.sourceListAfterAdd).toBeGreaterThanOrEqual(1);
    expect(result.targetListAfterAdd).toBeGreaterThanOrEqual(1);
    expect(result.sourceListAfterRemove).toBe(result.sourceListAfterAdd - 1);
    expect(result.targetListAfterRemove).toBe(result.targetListAfterAdd - 1);
  });

  test('batch() coalesces multiple mutations into a single cascade', async ({ page }) => {
    const parentId = await pickContainerWithChildren(page);
    expect(parentId).not.toBeNull();

    const result = await page.evaluate(async (parentId) => {
      let displayChangeCount = 0;
      const original = window.dashboard.onMainDisplayChange.bind(window.dashboard);
      window.dashboard.onMainDisplayChange = function (...args) {
        displayChangeCount++;
        return original.apply(this, args);
      };

      const idsAdded = [];
      try {
        await window.dashboard.batch(async () => {
          for (let i = 0; i < 5; i++) {
            const id = 990000 + i;
            await window.dashboard.addNode(parentId, {
              id,
              label: `batch-leaf-${i}`,
              type: 'Node',
              category: 'staging',
              children: [],
            });
            idsAdded.push(id);
          }
        });
      } finally {
        window.dashboard.onMainDisplayChange = original;
      }

      const allFound = idsAdded.every((id) => !!window.dashboard.main.root.getNode(id));
      return { allFound, displayChangeCount, addedCount: idsAdded.length };
    }, parentId);

    expect(result.allFound).toBe(true);
    expect(result.addedCount).toBe(5);
    // The exact count depends on internal scheduling; requirement is that it
    // fires far fewer times than the number of mutations (proving coalescing).
    expect(result.displayChangeCount).toBeLessThanOrEqual(2);
  });

  test('updateNodeStatuses applies many status writes in one cascade', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Pick the first 30 leaves we can find, plus a known-bogus id.
      const leaves = [];
      const visit = (n) => {
        if (!n.childNodes || n.childNodes.length === 0) {
          if (n.parentNode) leaves.push(n);
        } else {
          for (const c of n.childNodes) visit(c);
        }
      };
      visit(window.dashboard.main.root);
      const targets = leaves.slice(0, Math.min(30, leaves.length));
      const updates = targets.map((n, i) => ({ id: n.id, status: i % 2 ? 'ERROR' : 'READY' }));
      updates.push({ id: 'definitely-not-a-real-id', status: 'READY' });

      let displayChangeCount = 0;
      const original = window.dashboard.onMainDisplayChange.bind(window.dashboard);
      window.dashboard.onMainDisplayChange = function (...args) {
        displayChangeCount++;
        return original.apply(this, args);
      };

      let report;
      try {
        report = await window.dashboard.updateNodeStatuses(updates);
      } finally {
        window.dashboard.onMainDisplayChange = original;
      }

      // Verify every targeted leaf actually has the new status.
      const verified = targets.every((n, i) => n.status === (i % 2 ? 'ERROR' : 'READY'));
      return {
        applied: report.applied,
        missingCount: report.missing.length,
        verified,
        displayChangeCount,
        targetCount: targets.length,
      };
    });

    expect(result.applied).toBe(result.targetCount);
    expect(result.missingCount).toBe(1); // the bogus id
    expect(result.verified).toBe(true);
    // The whole bulk update should fire onMainDisplayChange a small constant
    // number of times — not once per status write.
    expect(result.displayChangeCount).toBeLessThanOrEqual(2);
  });
});
