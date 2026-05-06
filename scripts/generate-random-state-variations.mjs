#!/usr/bin/env node
// Generate two perf-test variations of dashboard/data/All.json with random
// node states, designed to exercise every auto-collapse rule.
//
//   All-randomState.json              — toggleCollapseOnStatusChange: false
//   All-randomState-autoCollapse.json — toggleCollapseOnStatusChange: true
//
// State assignment is seeded so output is reproducible. Distribution and
// targeted subtree patches guarantee coverage of:
//   - Rule 1 (all children share one collapsible status: READY/UPDATED/SKIPPED/DISABLED)
//   - Rule 2 (children are only SKIPPED and/or UPDATED)
//   - Mixed-problem containers (ERROR/WARNING/DELAYED) that must stay expanded

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'dashboard', 'data');
const INPUT = path.join(DATA_DIR, 'All.json');
const OUT_NO_COLLAPSE = path.join(DATA_DIR, 'All-randomState.json');
const OUT_COLLAPSE = path.join(DATA_DIR, 'All-randomState-autoCollapse.json');

// Status values match NodeStatus in dashboard/js/nodeBase.js
const STATES = {
  UNDETERMINED: 'Undetermined',
  UNKNOWN: 'Unknown',
  DISABLED: 'Disabled',
  READY: 'Ready',
  UPDATING: 'Updating',
  UPDATED: 'Updated',
  SKIPPED: 'Skipped',
  DELAYED: 'Delayed',
  WARNING: 'Warning',
  ERROR: 'Error',
};

// Mulberry32 — small deterministic PRNG so the variations are reproducible.
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(0xfd05_2026);

// Weighted distribution biased toward "success" so naturally-clustered small
// containers can fall under Rule 1 (all-same) while still producing enough
// problem states for mixed containers.
const WEIGHTED = [
  [STATES.UPDATED, 24],
  [STATES.READY, 18],
  [STATES.SKIPPED, 14],
  [STATES.UPDATING, 10],
  [STATES.DELAYED, 8],
  [STATES.WARNING, 8],
  [STATES.ERROR, 7],
  [STATES.DISABLED, 5],
  [STATES.UNKNOWN, 3],
  [STATES.UNDETERMINED, 3],
];
const totalWeight = WEIGHTED.reduce((a, [, w]) => a + w, 0);

function weightedPick() {
  let r = rand() * totalWeight;
  for (const [s, w] of WEIGHTED) {
    if ((r -= w) < 0) return s;
  }
  return STATES.UNKNOWN;
}

function pickFrom(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function* walkContainers(node, depth = 0) {
  if (Array.isArray(node.children) && node.children.length) {
    yield { node, depth };
    for (const c of node.children) yield* walkContainers(c, depth + 1);
  }
}

function* walkLeaves(node) {
  if (Array.isArray(node.children) && node.children.length) {
    for (const c of node.children) yield* walkLeaves(c);
  } else {
    yield node;
  }
}

function assignRandomStates(root) {
  const containers = [];
  for (const { node, depth } of walkContainers(root)) {
    containers.push({ node, depth });
  }

  // Default: every leaf gets a weighted-random state.
  for (const leaf of walkLeaves(root)) {
    leaf.state = weightedPick();
  }

  // Pick small leaf-only containers (parents whose children are all leaves)
  // and force patterns that exercise each auto-collapse rule.
  const leafOnlyContainers = containers.filter(
    ({ node }) =>
      node.children.length > 0 && node.children.every((c) => !c.children || !c.children.length),
  );

  // Shuffle deterministically.
  for (let i = leafOnlyContainers.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [leafOnlyContainers[i], leafOnlyContainers[j]] = [leafOnlyContainers[j], leafOnlyContainers[i]];
  }

  const patterns = [
    // Rule 1: all-same collapsible status
    (kids) => kids.forEach((k) => (k.state = STATES.READY)),
    (kids) => kids.forEach((k) => (k.state = STATES.UPDATED)),
    (kids) => kids.forEach((k) => (k.state = STATES.SKIPPED)),
    (kids) => kids.forEach((k) => (k.state = STATES.DISABLED)),
    // Rule 1: all-same non-collapsible status (must NOT collapse)
    (kids) => kids.forEach((k) => (k.state = STATES.ERROR)),
    (kids) => kids.forEach((k) => (k.state = STATES.WARNING)),
    // Rule 2: SKIPPED + UPDATED only mix
    (kids) => kids.forEach((k) => (k.state = rand() < 0.5 ? STATES.SKIPPED : STATES.UPDATED)),
    // Mixed problem: should stay expanded
    (kids) =>
      kids.forEach(
        (k) =>
          (k.state = pickFrom([STATES.ERROR, STATES.WARNING, STATES.DELAYED, STATES.UPDATING])),
      ),
    // DISABLED + collapsible mix (DISABLED is filtered, so should still collapse via Rule 1)
    (kids) => kids.forEach((k) => (k.state = rand() < 0.4 ? STATES.DISABLED : STATES.UPDATED)),
  ];

  // Apply each pattern to a handful of containers so every rule has
  // multiple samples in the resulting fixture.
  const perPattern = 6;
  let cursor = 0;
  for (const apply of patterns) {
    for (let i = 0; i < perPattern && cursor < leafOnlyContainers.length; i++, cursor++) {
      apply(leafOnlyContainers[cursor].node.children);
    }
  }
}

function summarize(root) {
  const counts = {};
  let leaves = 0;
  for (const leaf of walkLeaves(root)) {
    leaves++;
    counts[leaf.state] = (counts[leaf.state] || 0) + 1;
  }

  // Audit container coverage: how many containers will hit each rule?
  let rule1Collapse = 0; // all same collapsible
  let rule1Stay = 0; // all same non-collapsible
  let rule2 = 0; // only SKIPPED/UPDATED mix
  let mixedStay = 0; // mixed, would stay expanded
  const COLLAPSIBLE = new Set([STATES.READY, STATES.UPDATED, STATES.SKIPPED, STATES.DISABLED]);

  for (const { node } of walkContainers(root)) {
    const childStates = node.children
      .filter((c) => !c.children || !c.children.length) // immediate-leaf check; same shape statusManager uses
      .map((c) => c.state);
    if (!childStates.length) continue;
    const nonDisabled = childStates.filter((s) => s !== STATES.DISABLED);
    if (!nonDisabled.length) continue;
    const unique = [...new Set(nonDisabled)];
    if (unique.length === 1) {
      if (COLLAPSIBLE.has(unique[0])) rule1Collapse++;
      else rule1Stay++;
    } else if (unique.every((s) => s === STATES.SKIPPED || s === STATES.UPDATED)) {
      rule2++;
    } else {
      mixedStay++;
    }
  }

  return { leaves, counts, rule1Collapse, rule1Stay, rule2, mixedStay };
}

async function main() {
  const raw = await fs.readFile(INPUT, 'utf8');

  // No-collapse variation
  const v1 = JSON.parse(raw);
  v1.metadata = {
    ...v1.metadata,
    name: 'All-randomState',
    description: 'Random per-node states for perf testing; auto-collapse disabled.',
    updated: new Date().toISOString(),
  };
  v1.settings = {
    ...v1.settings,
    toggleCollapseOnStatusChange: false,
    cascadeOnStatusChange: false,
  };
  for (const root of v1.nodes) assignRandomStates(root);
  await fs.writeFile(OUT_NO_COLLAPSE, JSON.stringify(v1));
  console.log('Wrote', OUT_NO_COLLAPSE);
  for (const root of v1.nodes) console.log('  summary:', summarize(root));

  // Auto-collapse variation — same shape, same seed, just settings differ
  const v2 = JSON.parse(raw);
  v2.metadata = {
    ...v2.metadata,
    name: 'All-randomState-autoCollapse',
    description: 'Random per-node states for perf testing; auto-collapse + cascade enabled.',
    updated: new Date().toISOString(),
  };
  v2.settings = {
    ...v2.settings,
    toggleCollapseOnStatusChange: true,
    cascadeOnStatusChange: true,
  };
  // Re-seed and re-run so v2 has the same node states as v1 (deterministic).
  // We do this by reimporting the seeded generator side-effects: easier path
  // is to copy v1's node tree wholesale.
  v2.nodes = JSON.parse(JSON.stringify(v1.nodes));
  await fs.writeFile(OUT_COLLAPSE, JSON.stringify(v2));
  console.log('Wrote', OUT_COLLAPSE);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
