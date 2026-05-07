#!/usr/bin/env node

/**
 * Stress fixture generator for FlowDash performance tests.
 *
 * Produces a deterministic, balanced DWH-shaped tree at a configurable scale.
 * Default config yields ~1,300 nodes — slightly above the current production
 * largest fixture (dwh-6.fixed ≈ 885 nodes) so that perf-test results contain
 * headroom for production growth.
 *
 * Output schema matches dashboard/data/dwh-*.json:
 *   { metadata, settings, nodes: [tree], edges: [...] }
 *
 * Usage:
 *   node tests/generate-stress-fixture.js                 # writes default to dashboard/data/dwh-stress.json
 *   node tests/generate-stress-fixture.js path.json       # custom output path
 *   node tests/generate-stress-fixture.js path.json 2000  # target ~2000 nodes (rebalances counts)
 *
 * Reproducibility: seeded LCG drives all randomness. Same seed = same fixture.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CONFIG = {
  columnsCount: 5,
  lanesPerColumn: 6,
  adaptersPerLane: 7,
  nodesPerAdapter: 5,
  edgeFraction: 0.05, // share of leaf nodes that get an outgoing edge
  seed: 0x9e3779b1,
};

// Cheap, deterministic PRNG. Mulberry32 — good distribution, no deps.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a stress fixture tree.
 * @param {Partial<typeof DEFAULT_CONFIG>} [opts]
 * @returns {{metadata: object, settings: object, nodes: any[], edges: any[]}}
 */
function generateStressFixture(opts = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...opts };
  const rand = rng(cfg.seed);
  const leafIds = [];
  let nextId = 1000;
  const nextNodeId = () => nextId++;

  const makeLeaf = (parentLabel, idx) => {
    const id = nextNodeId();
    leafIds.push(id);
    const role = ['staging', 'archive', 'transform', 'reference', 'mart'][idx % 5];
    return {
      id,
      label: `${parentLabel}.${role}-${idx}`,
      description: `Leaf node ${idx} (${role})`,
      type: 'Node',
      category: role,
      layout: '',
      datasetSourceLabel: 'STRESS',
      datasetLabel: `${parentLabel}_${role}_${idx}`,
      datasetSourceReference: `${parentLabel}_${role}_${idx}`,
      children: [],
    };
  };

  const makeAdapter = (parentLabel, idx) => {
    const label = `${parentLabel}.A${idx}`;
    return {
      id: nextNodeId(),
      label,
      description: `Adapter ${idx} of ${parentLabel}`,
      type: 'Adapter',
      category: 'Unknown',
      layout: JSON.stringify({ mode: 'staging-archive', displayMode: 'role' }),
      datasetSourceLabel: null,
      datasetLabel: null,
      datasetSourceReference: null,
      children: Array.from({ length: cfg.nodesPerAdapter }, (_, i) => makeLeaf(label, i)),
    };
  };

  const makeLane = (parentLabel, idx) => {
    const label = `${parentLabel}.L${idx}`;
    return {
      id: nextNodeId(),
      label,
      description: `Lane ${idx} of ${parentLabel}`,
      type: 'Lane',
      category: 'Unknown',
      layout: '',
      datasetSourceLabel: null,
      datasetLabel: null,
      datasetSourceReference: null,
      children: Array.from({ length: cfg.adaptersPerLane }, (_, i) => makeAdapter(label, i)),
    };
  };

  const makeColumn = (idx) => {
    const label = `C${idx}`;
    return {
      id: nextNodeId(),
      label,
      description: `Column ${idx}`,
      type: 'Columns',
      category: 'Unknown',
      layout: '',
      datasetSourceLabel: null,
      datasetLabel: null,
      datasetSourceReference: null,
      children: Array.from({ length: cfg.lanesPerColumn }, (_, i) => makeLane(label, i)),
    };
  };

  const root = {
    id: nextNodeId(),
    label: 'Stress fixture root',
    description: 'Synthetic DWH shape for performance benchmarking',
    type: 'Lane',
    category: 'Unknown',
    layout: '',
    datasetSourceLabel: null,
    datasetLabel: null,
    datasetSourceReference: null,
    children: Array.from({ length: cfg.columnsCount }, (_, i) => makeColumn(i)),
  };

  const totalNodes = countNodes([root]);

  // Edges: connect a deterministic subset of leaves. Pair consecutively in
  // shuffled order so edges cross adapter and lane boundaries (exercises the
  // 16-connection-point routing in utilPath.js).
  const shuffled = leafIds.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const edgeCount = Math.max(1, Math.floor(shuffled.length * cfg.edgeFraction));
  const edges = [];
  for (let i = 0; i < edgeCount; i++) {
    const a = shuffled[i];
    const b = shuffled[(i + Math.floor(shuffled.length / 3)) % shuffled.length];
    if (a === b) continue;
    edges.push({
      sourceName: `n${a}`,
      targetName: `n${b}`,
      label: '',
      description: '',
      type: 'stress',
      isActive: true,
      source: a,
      target: b,
    });
  }

  return {
    metadata: {
      name: 'Stress fixture',
      description: `Synthetic ${totalNodes}-node tree generated by tests/generate-stress-fixture.js`,
      isPublic: false,
      features: [],
      version: '1.0.0',
      generated: new Date().toISOString(),
      config: cfg,
      stats: { totalNodes, edgeCount: edges.length, leafCount: leafIds.length },
    },
    settings: {
      showCenterMark: false,
      showConnectionPoints: false,
      showGhostLines: false,
      curved: false,
      showBoundingBox: false,
      zoomToRoot: true,
      toggleCollapseOnStatusChange: false,
      cascadeOnStatusChange: false,
    },
    nodes: [root],
    edges,
  };
}

function countNodes(nodes) {
  let n = 0;
  for (const x of nodes) {
    n += 1;
    if (Array.isArray(x.children) && x.children.length > 0) {
      n += countNodes(x.children);
    }
  }
  return n;
}

// Rebalance config to hit a target node count (treats columnsCount as fixed).
function configForTarget(targetNodes) {
  const cfg = { ...DEFAULT_CONFIG };
  // Solve: 1 + C + C*L + C*L*A + C*L*A*N ≈ target
  // Keep C, L, A close to defaults; tune N.
  const branchSum = cfg.columnsCount * cfg.lanesPerColumn * cfg.adaptersPerLane;
  const intermediates =
    1 +
    cfg.columnsCount +
    cfg.columnsCount * cfg.lanesPerColumn +
    cfg.columnsCount * cfg.lanesPerColumn * cfg.adaptersPerLane;
  const remaining = targetNodes - intermediates;
  cfg.nodesPerAdapter = Math.max(1, Math.round(remaining / branchSum));
  return cfg;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const outPath =
    process.argv[2] || path.join(__dirname, '..', 'dashboard', 'data', 'dwh-stress.json');
  const target = process.argv[3] ? parseInt(process.argv[3], 10) : null;
  const cfg = target ? configForTarget(target) : {};
  const fixture = generateStressFixture(cfg);
  fs.writeFileSync(outPath, JSON.stringify(fixture));
  console.log(
    `Wrote ${fixture.metadata.stats.totalNodes} nodes / ${fixture.metadata.stats.edgeCount} edges to ${outPath}`,
  );
}

export { generateStressFixture, configForTarget, DEFAULT_CONFIG };
