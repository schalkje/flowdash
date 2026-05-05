// Fold / Expand behaviour — sister suite to the per-node-type
// comprehensive specs. Drives the dedicated demos under
// /18_foldExpand/* and verifies:
//
//   - manual collapse via node.collapsed = true shrinks the container
//   - expand restores the original (or larger) size
//   - children are detached from the DOM when collapsed and re-rendered
//     on expand
//   - edges between siblings re-route their `d` path when an endpoint
//     collapses, and remain valid (non-empty) afterwards
//   - cascade: collapsing a deep root hides every descendant container
//   - status-driven auto-collapse honours the rules in
//     dashboard/documentation/auto-collapse-specification.md
//   - the autoplay "movie" pages initialise without runtime errors
//
// All tests rely on `window.flowdash` being exposed by the demo pages,
// which is the same convention the lane / columns specs use.

import { test, expect } from '@playwright/test';

// ----- helpers --------------------------------------------------------------

async function gotoDemo(page, path) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  await page.goto(path);
  await page.waitForFunction(() => window.flowdash !== undefined, { timeout: 15000 });
  // Give layout & simulation a beat to settle.
  await page.waitForTimeout(400);
  return errors;
}

// The minimap clones every dashboard node into its own SVG inside a
// .zoom-cockpit overlay, so naive id selectors can match twice. Anchor
// everything to the main canvas SVG (#graph) to keep tests unambiguous.
const SCOPE = '#graph';

function nodeSel(id) {
  return `${SCOPE} g[id="${id}"]`;
}

function childRectsSel(parentId) {
  return `${SCOPE} g[id="${parentId}"] g.rect`;
}

async function nodeBox(page, id) {
  // Each node renders as a top-level <g class="<type> [collapsed]" id="...">.
  // getBBox() reflects the rendered geometry of the whole subtree.
  return page.evaluate(({ scope, nodeId }) => {
    const g = document.querySelector(`${scope} g[id="${nodeId}"]`);
    if (!g) return null;
    const bbox = g.getBBox();
    return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
  }, { scope: SCOPE, nodeId: id });
}

async function setCollapsed(page, id, value) {
  await page.evaluate(
    ({ id, value }) => {
      const node = window.flowdash.main.root.getNode(id);
      node.collapsed = value;
    },
    { id, value }
  );
  await page.waitForTimeout(250);
}

async function getCollapsed(page, id) {
  return page.evaluate((nodeId) => {
    const node = window.flowdash.main.root.getNode(nodeId);
    return node ? !!node.collapsed : null;
  }, id);
}

async function edgeD(page, edgeId) {
  // Scope to the dashboard's g.edges container — the minimap can carry
  // a mirrored copy.
  return page.evaluate(({ scope, id }) => {
    const path = document.querySelector(`${scope} g.edge[id="${id}"] path.path`);
    return path ? path.getAttribute('d') : null;
  }, { scope: SCOPE, id: edgeId });
}

async function setLeafState(page, leafId, value) {
  // Setting a leaf's status doesn't by itself re-run the parent's
  // auto-collapse rule (the rule lives in the container status setter).
  // Re-assigning the parent's own status retriggers the rule.
  await page.evaluate(
    ({ leafId, value }) => {
      window.flowdash.updateNodeStatus(leafId, value);
      const leaf = window.flowdash.main.root.getNode(leafId);
      const parent = leaf?.parentNode;
      if (parent) parent.status = parent.status;
    },
    { leafId, value }
  );
  await page.waitForTimeout(250);
}

// ----- tests ----------------------------------------------------------------

test.describe('fold / expand — simple', () => {
  test('collapse shrinks the lane and removes child rects from the DOM', async ({ page }) => {
    const errors = await gotoDemo(page, '/18_foldExpand/01_simple/simple.html');

    // Initial: lane is expanded, three rect children rendered.
    await expect(page.locator(`${SCOPE} g[id="lane1"]`)).toBeVisible();
    await expect(page.locator(`${SCOPE} g[id="lane1"] g.rect`)).toHaveCount(3);
    const expanded = await nodeBox(page, 'lane1');
    expect(expanded.width).toBeGreaterThan(60);
    expect(expanded.height).toBeGreaterThan(40);

    // Collapse via the property setter (mirrors the on-node zoom click).
    await setCollapsed(page, 'lane1', true);
    expect(await getCollapsed(page, 'lane1')).toBe(true);

    const collapsed = await nodeBox(page, 'lane1');
    // Collapsed lane must be strictly smaller than the expanded one.
    expect(collapsed.height).toBeLessThan(expanded.height - 5);
    expect(collapsed.height).toBeGreaterThan(0);
    // Children are detached when the lane is collapsed.
    await expect(page.locator(`${SCOPE} g[id="lane1"] g.rect`)).toHaveCount(0);

    // No errors leaked through the collapse path.
    expect(errors, `unexpected runtime errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('expand restores size and re-renders children', async ({ page }) => {
    await gotoDemo(page, '/18_foldExpand/01_simple/simple.html');

    const expanded = await nodeBox(page, 'lane1');

    await setCollapsed(page, 'lane1', true);
    const collapsed = await nodeBox(page, 'lane1');
    expect(collapsed.height).toBeLessThan(expanded.height - 5);

    await setCollapsed(page, 'lane1', false);
    expect(await getCollapsed(page, 'lane1')).toBe(false);

    const reExpanded = await nodeBox(page, 'lane1');
    // Within a small tolerance — re-layout can adjust by a pixel or two.
    expect(reExpanded.width).toBeGreaterThanOrEqual(expanded.width - 4);
    expect(reExpanded.height).toBeGreaterThanOrEqual(expanded.height - 4);
    await expect(page.locator(`${SCOPE} g[id="lane1"] g.rect`)).toHaveCount(3);
  });

  test('clicking the on-node zoom button toggles collapse', async ({ page }) => {
    await gotoDemo(page, '/18_foldExpand/01_simple/simple.html');

    const initial = await nodeBox(page, 'lane1');
    expect(await getCollapsed(page, 'lane1')).toBe(false);

    const zoomBtn = page.locator(`${SCOPE} g[id="lane1"] g.zoom-button`).first();
    await expect(zoomBtn).toBeVisible();
    await zoomBtn.click({ force: true });
    await page.waitForTimeout(300);

    expect(await getCollapsed(page, 'lane1')).toBe(true);
    const collapsed = await nodeBox(page, 'lane1');
    expect(collapsed.height).toBeLessThan(initial.height - 5);
  });
});

test.describe('fold / expand — with edges', () => {
  test('cross-lane edges re-route when an endpoint collapses; intra-lane edges are detached', async ({ page }) => {
    const errors = await gotoDemo(page, '/18_foldExpand/02_with-edges/with-edges.html');

    // Cross-lane edges hang off the deepest common ancestor (root) and
    // survive any single lane collapsing. Intra-lane edges live inside
    // the lane's own edges container and disappear together with it.
    const crossLaneIds = ['e1', 'e2', 'e4'];
    const intraTransform = 'e3';
    const before = {};
    for (const id of [...crossLaneIds, intraTransform]) {
      before[id] = await edgeD(page, id);
      expect(before[id], `edge ${id} should have a path before collapse`).not.toBeNull();
      expect(before[id].length, `edge ${id} non-empty before`).toBeGreaterThan(0);
    }

    await setCollapsed(page, 'transform', true);

    // Cross-lane edges still exist and at least one of them has a
    // different path than before (re-routed to the collapsed bbox).
    for (const id of crossLaneIds) {
      const d = await edgeD(page, id);
      expect(d, `edge ${id} should still exist after collapse`).not.toBeNull();
      expect(d.length, `edge ${id} d attribute non-empty after collapse`).toBeGreaterThan(0);
    }
    const reroutedAny =
      (await edgeD(page, 'e1')) !== before.e1 ||
      (await edgeD(page, 'e2')) !== before.e2 ||
      (await edgeD(page, 'e4')) !== before.e4;
    expect(reroutedAny, 'at least one cross-lane edge should have re-routed').toBe(true);

    // Intra-Transform edge (e3) is detached from the DOM along with the
    // Transform lane's edges container.
    expect(await edgeD(page, intraTransform), 'intra-Transform edge should be detached').toBeNull();

    // Expanding Transform brings everything back, and the intra edge
    // gets re-added with a non-empty path.
    await setCollapsed(page, 'transform', false);
    for (const id of [...crossLaneIds, intraTransform]) {
      const d = await edgeD(page, id);
      expect(d, `edge ${id} present post-expand`).not.toBeNull();
      expect(d.length).toBeGreaterThan(0);
    }

    expect(errors, `unexpected runtime errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('collapsing root hides every sibling lane', async ({ page }) => {
    await gotoDemo(page, '/18_foldExpand/02_with-edges/with-edges.html');

    await expect(page.locator(`${SCOPE} g[id="source"]`)).toBeVisible();
    await expect(page.locator(`${SCOPE} g[id="transform"]`)).toBeVisible();
    await expect(page.locator(`${SCOPE} g[id="sink"]`)).toBeVisible();

    await setCollapsed(page, 'root', true);

    // After collapsing root, the lane DOM elements must be detached.
    expect(await page.locator(`${SCOPE} g[id="source"]`).count()).toBe(0);
    expect(await page.locator(`${SCOPE} g[id="transform"]`).count()).toBe(0);
    expect(await page.locator(`${SCOPE} g[id="sink"]`).count()).toBe(0);

    await setCollapsed(page, 'root', false);
    await expect(page.locator(`${SCOPE} g[id="source"]`)).toBeVisible();
    await expect(page.locator(`${SCOPE} g[id="transform"]`)).toBeVisible();
    await expect(page.locator(`${SCOPE} g[id="sink"]`)).toBeVisible();
  });
});

test.describe('fold / expand — nested', () => {
  test('collapsing a deep parent shrinks it and hides its descendants', async ({ page }) => {
    await gotoDemo(page, '/18_foldExpand/03_nested/nested.html');

    const wingABefore = await nodeBox(page, 'wing-a');
    expect(wingABefore.height).toBeGreaterThan(40);
    await expect(page.locator(`${SCOPE} g[id="rect-a1"]`)).toBeVisible();
    await expect(page.locator(`${SCOPE} g[id="rect-a2"]`)).toBeVisible();

    await setCollapsed(page, 'wing-a', true);
    expect(await getCollapsed(page, 'wing-a')).toBe(true);

    const wingAAfter = await nodeBox(page, 'wing-a');
    expect(wingAAfter.height).toBeLessThan(wingABefore.height - 10);

    // Wing A's grandchildren are gone from the DOM.
    expect(await page.locator(`${SCOPE} g[id="rect-a1"]`).count()).toBe(0);
    expect(await page.locator(`${SCOPE} g[id="rect-a2"]`).count()).toBe(0);
    expect(await page.locator(`${SCOPE} g[id="wing-a-cols"]`).count()).toBe(0);

    // Wing B, the sibling, is unchanged.
    await expect(page.locator(`${SCOPE} g[id="rect-b1"]`)).toBeVisible();
    await expect(page.locator(`${SCOPE} g[id="rect-b2"]`)).toBeVisible();
  });

  test('collapsing the root hides the entire tree, expanding restores it', async ({ page }) => {
    await gotoDemo(page, '/18_foldExpand/03_nested/nested.html');

    const allLeafIds = ['rect-a1', 'rect-a2', 'rect-b1', 'rect-b2'];
    for (const id of allLeafIds) await expect(page.locator(`${SCOPE} g[id="${id}"]`)).toBeVisible();

    await setCollapsed(page, 'root', true);
    for (const id of allLeafIds) {
      expect(await page.locator(`${SCOPE} g[id="${id}"]`).count(), `${id} hidden after root collapse`).toBe(0);
    }
    expect(await page.locator(`${SCOPE} g[id="wing-a"]`).count()).toBe(0);
    expect(await page.locator(`${SCOPE} g[id="wing-b"]`).count()).toBe(0);

    await setCollapsed(page, 'root', false);
    for (const id of allLeafIds) await expect(page.locator(`${SCOPE} g[id="${id}"]`)).toBeVisible();
  });

  test('children on expand sit inside the expanded parent box', async ({ page }) => {
    await gotoDemo(page, '/18_foldExpand/03_nested/nested.html');

    // Collapse and re-expand wing-a; then the children must be inside
    // the parent's bounding rectangle (a smoke test for layout
    // correctness post-toggle).
    await setCollapsed(page, 'wing-a', true);
    await setCollapsed(page, 'wing-a', false);

    for (const childId of ['rect-a1', 'rect-a2']) {
      const bounds = await page.evaluate(({ scope, id }) => {
        const el = document.querySelector(`${scope} g[id="${id}"]`);
        const r = el?.getBoundingClientRect();
        return r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom } : null;
      }, { scope: SCOPE, id: childId });
      const parentBounds = await page.evaluate((scope) => {
        const el = document.querySelector(`${scope} g[id="wing-a"]`);
        const r = el?.getBoundingClientRect();
        return r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom } : null;
      }, SCOPE);
      expect(bounds, `${childId} bounds`).not.toBeNull();
      expect(parentBounds, 'wing-a bounds').not.toBeNull();
      // Allow a small tolerance for stroke / anti-alias half-pixels.
      const tol = 2;
      expect(bounds.left).toBeGreaterThanOrEqual(parentBounds.left - tol);
      expect(bounds.right).toBeLessThanOrEqual(parentBounds.right + tol);
      expect(bounds.top).toBeGreaterThanOrEqual(parentBounds.top - tol);
      expect(bounds.bottom).toBeLessThanOrEqual(parentBounds.bottom + tol);
    }
  });
});

test.describe('fold / expand — status driven', () => {
  test('all-same leaf statuses fold the parent; mixing them expands it', async ({ page }) => {
    await gotoDemo(page, '/18_foldExpand/04_status-driven/status-driven.html');

    // ok-lane starts with ok1=Ready, ok2=Ready (all same → collapsed).
    expect(await getCollapsed(page, 'ok-lane')).toBe(true);
    // bad-lane starts with bad1=Error, bad2=Ready (mix → expanded).
    expect(await getCollapsed(page, 'bad-lane')).toBe(false);

    // Flipping ok2 to Error breaks the all-same rule → expand.
    await setLeafState(page, 'ok2', 'Error');
    expect(await getCollapsed(page, 'ok-lane')).toBe(false);

    // Flipping bad1 to Ready restores the all-same rule → fold.
    await setLeafState(page, 'bad1', 'Ready');
    expect(await getCollapsed(page, 'bad-lane')).toBe(true);

    // And reverting bad1 to Error reopens the lane.
    await setLeafState(page, 'bad1', 'Error');
    expect(await getCollapsed(page, 'bad-lane')).toBe(false);
  });

  test('only Skipped/Updated mix folds the parent', async ({ page }) => {
    // Spec rule 2: a parent whose non-disabled leaves are exclusively
    // SKIPPED and/or UPDATED should fold even though the leaves are
    // not all the same status.
    await gotoDemo(page, '/18_foldExpand/04_status-driven/status-driven.html');

    await setLeafState(page, 'bad1', 'Updated');
    await setLeafState(page, 'bad2', 'Skipped');
    expect(await getCollapsed(page, 'bad-lane')).toBe(true);

    // Adding any non-S/U leaf state breaks the rule.
    await setLeafState(page, 'bad1', 'Error');
    expect(await getCollapsed(page, 'bad-lane')).toBe(false);
  });
});

test.describe('fold / expand — movie pages', () => {
  test('small movie page initialises and runs at least one frame without errors', async ({ page }) => {
    const errors = await gotoDemo(page, '/18_foldExpand/05_movie-small/movie-small.html');

    // Pause autoplay so the assertions don't race the next frame.
    await page.click('#btn-pause');
    await page.waitForTimeout(150);

    // The autoplay applied frame 0 immediately; verify the dashboard
    // is alive and the script is exposed.
    await expect(page.locator(`${SCOPE} g[id="stage"]`)).toBeVisible();
    const scriptLen = await page.evaluate(() => window.foldExpandMovie.script.length);
    expect(scriptLen).toBeGreaterThan(3);

    // Step once explicitly and confirm the dashboard accepts it.
    await page.click('#btn-step');
    await page.waitForTimeout(250);

    // Reset returns us to a known good state.
    await page.click('#btn-reset');
    await page.waitForTimeout(250);
    await expect(page.locator(`${SCOPE} g[id="stage"]`)).toBeVisible();

    expect(errors, `unexpected runtime errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('big movie page loads dwh-tiny, discovers containers, and steps without errors', async ({ page }) => {
    const errors = await gotoDemo(page, '/18_foldExpand/06_movie-big/movie-big.html');

    await page.click('#btn-pause');
    await page.waitForTimeout(200);

    // The script must contain at least the structural frames plus the
    // wave samples.
    const info = await page.evaluate(() => ({
      scriptLen: window.foldExpandMovie.script.length,
      containers: window.foldExpandMovie.containerIds.length,
      hasNodes: !!document.querySelector('#graph g[id]')
    }));
    expect(info.containers).toBeGreaterThan(5);
    expect(info.scriptLen).toBeGreaterThan(6);
    expect(info.hasNodes).toBe(true);

    // Step a few times to walk the script forward.
    for (let i = 0; i < 4; i++) {
      await page.click('#btn-step');
      await page.waitForTimeout(150);
    }

    expect(errors, `unexpected runtime errors:\n${errors.join('\n')}`).toEqual([]);
  });
});
