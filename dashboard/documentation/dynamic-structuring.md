# Dynamic structuring — public mutation API

FlowDash exposes a small set of primitives on the `Dashboard` instance so that consumer applications can mutate the rendered tree at runtime without rebuilding the whole dashboard. This is the foundation that streaming-data dashboards (DBT, Airflow, custom pipelines) use to reflect topology changes as they arrive.

The library does **not** ship a streaming subsystem itself — that lives in the consumer. These are the building blocks consumers compose.

> Status: first-pass shipped 2026-05. Covers add/remove of nodes and edges plus batched cascades. `moveNode`, `applySnapshot`, an internal node-index registry, and automatic edge re-binding on reparent are planned but not yet shipped.

## Quick example

```js
import { createAndInitDashboard } from 'flowdash';

const dashboard = await createAndInitDashboard(initialData, '#graph');

// Apply a streaming diff. The library does the layout cascade once, at the
// end of the batch, instead of once per mutation.
await dashboard.batch(async () => {
  await dashboard.addNode(parentId, { id: 1001, label: 'new-task', type: 'Adapter' });
  await dashboard.addEdge({ source: 1001, target: 42 });
  await dashboard.removeNode(staleNodeId);
});
```

## API reference

All mutators are async. They resolve after the next animation frame so the caller can rely on the next paint reflecting the change.

### `addNode(parentId, nodeData) → Promise<Node>`

Adds `nodeData` as a child of the container with id `parentId`.

- `parentId` must reference an existing **container** node. Non-container parents throw.
- `nodeData.id` must be unique across the entire tree. Duplicate ids throw.
- `nodeData.type` must be a registered node type (`'Lane'`, `'Columns'`, `'Adapter'`, `'Foundation'`, `'Mart'`, `'Group'`, `'Node'`, `'Circle'`, …). The lookup is case-insensitive.
- The created `Node` is returned for the caller to attach handlers (`onClick`, `onDblClick`) or read state.

### `removeNode(nodeId) → Promise<void>`

Removes the node with the given id and the entire subtree below it.

- Detaches every edge incident to any descendant — both incoming and outgoing — before unparenting.
- Removing the root throws.
- Removing a non-existent id throws.

### `addEdge(edgeData) → Promise<Edge>`

Adds an edge between two existing nodes.

- `edgeData.source` and `edgeData.target` must reference existing node ids. Missing endpoints throw.
- An edge is rejected if a duplicate edge with the same `(source, target)` already exists, or if `source === target`.
- An optional `edgeData.id` is used by `removeEdge`; if omitted, only `removeEdge({source, target})` will work for this edge.

### `removeEdge(idOrPair) → Promise<void>`

Removes an edge identified either by its `id` or by an exact `{source, target}` pair.

- Throws if no matching edge is found.
- Detaches the edge from its source/target and from its parent container's `childEdges`, and removes the DOM element.

### `batch(fn) → Promise<void>`

Coalesces a sequence of mutations so they trigger one cascade at the end instead of one per mutation.

- `fn` may be sync or async.
- Re-entrant: nested `batch` calls join the outer batch — only the outermost call flushes.
- During a batch, `_suspendDisplayChange` is set, so cascades scheduled by individual mutations are deferred.
- After `fn` resolves: `handleDisplayChange()` fires once on each root that received a mutation, then a single `onMainDisplayChange()` runs.

## Error model

All mutators throw on misuse. The intent is **strict-by-default** so consumers see invariant violations immediately rather than discovering layout corruption later.

| Condition                                    | Behaviour                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| Dashboard not yet initialized                | Throws `flowdash.<op>: dashboard not initialized`                                    |
| Parent / target / source id not found        | Throws `flowdash.<op>: node not found: <id>`                                         |
| `nodeData.id` is missing                     | Throws `flowdash.addNode: nodeData.id is required`                                   |
| `nodeData.id` collides with an existing node | Throws `flowdash.addNode: duplicate node id: <id>`                                   |
| `parent` is not a container                  | Throws `flowdash.addNode: parent <id> is not a container`                            |
| Removing the root                            | Throws `flowdash.removeNode: cannot remove the root node`                            |
| `addEdge` to non-existent source or target   | Throws `flowdash.addEdge: node not found: <id>`                                      |
| `addEdge` with duplicate or no common parent | Throws `flowdash.addEdge: edge could not be created (duplicate or no common parent)` |
| `removeEdge` with no match                   | Throws `flowdash.removeEdge: edge not found: <descriptor>`                           |

## Edge-case matrix

| Scenario                                                       | Behaviour                                                                                                                  |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Add a child to a collapsed container                           | Node is added but not visible until expand. Container stays collapsed.                                                     |
| Remove a node that has incoming edges                          | All incoming edges from any other node into the subtree are detached automatically.                                        |
| `addEdge` between nodes whose only common ancestor is the root | Edge is parented at the root and renders as a top-level edge.                                                              |
| `addEdge` where source equals target                           | Rejected (returns `null` from `createInternalEdge`, then `addEdge` throws).                                                |
| `addEdge` for a `(source, target)` that already exists         | Rejected (no duplicate edges).                                                                                             |
| Multiple `batch` calls nested                                  | Inner calls run inline; only the outermost flushes the cascade.                                                            |
| Mutation on an uninitialized dashboard                         | Throws `dashboard not initialized`.                                                                                        |
| `removeNode` of a deeply nested subtree                        | All descendants are detached; their incoming/outgoing edges are removed. The DOM subtree is removed in a single operation. |

## Streaming consumer pattern

A typical streaming consumer keeps a local model of "what's currently rendered" and translates incoming diffs into batched mutation calls:

```js
async function applyDiff(dashboard, diff) {
  await dashboard.batch(async () => {
    for (const removal of diff.removedEdges) {
      await dashboard.removeEdge(removal);
    }
    for (const removal of diff.removedNodes) {
      await dashboard.removeNode(removal.id);
    }
    for (const addition of diff.addedNodes) {
      await dashboard.addNode(addition.parentId, addition.nodeData);
    }
    for (const addition of diff.addedEdges) {
      await dashboard.addEdge(addition);
    }
    for (const change of diff.statusChanges) {
      dashboard.updateNodeStatus(change.id, change.status);
    }
  });
}
```

Two reasons to apply removals first within a single batch:

1. The remaining adds may reuse ids that were just freed.
2. If a removal triggers an error (e.g. you tried to remove an unknown id) you'd rather fail before adding new nodes, not after.

## Performance characteristics

- **Single mutation outside a batch**: synchronous setter cost (typically <5ms even on dwh-stress / 1296 nodes), then one `requestAnimationFrame` to settle. Caller can rely on the next paint reflecting the change.
- **Batched mutations**: status / display-change cascades are coalesced to one final pass for the whole batch. On `dwh-stress`, a 50-mutation batch fires `onMainDisplayChange` ≤2 times (verified by `tests/dynamic-mutations.spec.js`).
- The mutation API is built on the same `_suspendDisplayChange` mechanism that the prerender fast-path uses; it inherits the same correctness invariants.

## What's not yet supported

- **`moveNode(nodeId, newParentId)`** — composable today as `removeNode` + `addNode`, but loses node identity across the operation. A native `moveNode` that preserves the `Node` instance and re-binds incident edges is planned.
- **`applySnapshot(data)`** — diff-and-apply against the current tree instead of full `setData`. Useful for periodic reconciliation in long-lived dashboards.
- **Automatic edge re-binding on reparent** — when a node moves to a new parent, edges crossing the old parent's boundary need their `parents.source/target` arrays rebuilt. Today removing and re-adding the edge is the workaround.
- **Live `nodeIndex`** — `Dashboard.buildNodeMap()` exists as a one-shot helper. A long-lived ID-indexed registry that mutations maintain incrementally is planned to make lookups O(1) instead of O(tree).
- **Strict-mode opt-out** — every error is currently thrown. A non-strict mode that warns and skips would be useful for best-effort streaming pipelines that can tolerate partial application.

## Related

- [`PRERENDER_USAGE.md`](./PRERENDER_USAGE.md) — for first-paint optimization on initial load (orthogonal to dynamic structuring).
- [`state.md`](./state.md) — node status state machine, including how status cascades interact with collapse rules. Status changes via `dashboard.updateNodeStatus()` participate in batch coalescing too.
- [`zone-system.md`](./zone-system.md) — layout architecture. Knowing which zones a parent owns helps reason about where a new child appears geometrically.
