## Context

FlowDash exposes its UI through the `Dashboard` instance (`dashboard/js/dashboard.js`) and a small re-export surface in `dashboard/js/index.js`. The library renders into an SVG tree whose top-level node groups are `<g>` elements; today `nodeBase.js:311` is the only place an SVG `id` attribute is written, and it copies from `this.id`. Layout is delegated to the zone system (`dashboard/js/zones/`), and bounds math in the existing code consistently uses `getBoundingBoxRelativeToParent(element, dashboard.main.container)` from `utils.js` — a `getBBox()` + `getCTM()` derivation that yields coordinates in the `main.container`'s local frame (i.e., world space before the zoom transform), unaffected by CSS transforms on the host. Pan-and-zoom is handled by `zoomManager.js`, which currently exposes `zoomToBoundingBox` as the only public viewport mover and always recomputes scale.

The library has **two identifier axes**:

- **`id`** — globally unique per node. Enforced strictly on `addNode` via `_assertIdAvailable` (dashboard.js:1411). Silently tolerated as duplicate on initial data load via `buildNodeMap` (dashboard.js:303) using `map.set`, which overwrites — a latent quirk, not a contract. `getNode(id)` walks the tree returning the **first match**.
- **`datasetId`** — non-unique semantic identifier carried by `data.datasetId`. Multiple nodes representing the same logical dataset share one `datasetId`. `getNodesByDatasetId(datasetId)` (nodeBase.js:565, nodeBaseContainer.js:481) walks the tree and returns the **array** of matching nodes. The dashboard already exposes `updateDatasetStatus(datasetId, status)` along this axis.

The original issue framed "duplicated dataset placements" as duplicate-`id`-with-disambiguation-via-`placementIndex`, but that conflates the two axes. The codebase audit during proposal refinement (recorded in the Refinement Notes section of the source issue) reshaped the API around the existing split: single-node operations key off `id`; fan-out operations key off `datasetId`. This document captures the design decisions for that reshaped surface.

The downstream integration today reaches into the library via:

- `document.querySelectorAll('[id="<X>"]')[i]` to disambiguate placements (works only because of the load-time duplicate-id quirk).
- `getBoundingClientRect()` on `<g>` and on `#graph`, reverse-projected, to estimate whether a result is in view (fragile under CSS transforms / fullscreen).
- `MutationObserver` on `#graph` to react to re-renders triggered by collapse/expand.
- `zoomToNodeById` as the only navigation primitive, forcibly changing zoom even when the user has manually framed a region.

The reporter is willing to contribute a PR. This design captures the API shape negotiated in refinement notes R1–R6 (as amended) on the issue, so an external contributor can implement against an agreed contract.

## Goals / Non-Goals

**Goals:**

- Eliminate every DOM-scraping fallback in the downstream find-and-navigate integration by exposing a small, additive public surface on the `Dashboard` instance and on rendered node DOM.
- Mirror the library's existing `id` (unique) vs `datasetId` (shared) split. Single-node primitives accept `id`; the dataset-axis primitive returns the list of ids belonging to a `datasetId` so callers compose per placement.
- Make the dashboard's internal coordinate frame (the one `getBoundingBoxRelativeToParent(node.element, main.container)` already produces) the single coordinate frame callers reason about — no CSS-transform math at the call site.
- Keep all additions purely additive so the change can ship as a minor (1.5.x) release with no migration path required.
- Preserve all existing behavior: `id="<nodeId>"` continues to be set, `zoomToNodeById` is unchanged, status cascade and auto-collapse settings still govern collapse/expand side-effects, no new globals.

**Non-Goals:**

- Build the find-and-navigate UX layer itself. Search box, result counter, Prev/Next bindings, scope filters, and `Zoom to result` toggle live in the downstream app, not in this library.
- Fix the load-time duplicate-`id` quirk in `buildNodeMap`. That is a separate, breaking-for-some-users change and out of scope for an additive minor release. The new APIs treat `id` per its documented intent (unique) regardless; callers with duplicate-id data will see `getNodeBounds` return the first match (matching `getNode`).
- Provide a `placementIndex` parameter or any other id-side disambiguation. Callers wanting to operate on every node sharing a `datasetId` use `getDatasetNodeIds` and iterate per id.
- Solve generic event-emitter ergonomics for the dashboard. Only the `render` event is in scope here. (Future events can reuse the same wrapper.)
- Replace `zoomToNodeById` or introduce a unified `navigate(target, { zoom?, animate?, padding? })`. `panToBounds` complements `zoomToNodeById`; callers compose them.
- Provide automatic restoration of collapse state after `revealNode`. The library does not snapshot prior state; callers that need restoration do their own snapshot before calling.

## Decisions

### D1. One capability covers all additions; tasks.md sequences must-haves before nice-to-haves

The whole set is bundled into a single capability `find-navigate-api-hooks` rather than split across multiple capabilities (e.g. `node-api` / `dataset-api` / `viewport-api` / `render-lifecycle` / `node-dom-contract`). They are a single cohesive feature aimed at one integration story, and the implementer is free to land them in two PRs by following the sequencing in `tasks.md` (must-haves first, optional after) without changing the spec.

**Alternative considered:** Multiple separate capabilities along functional lines. Rejected because (a) `openspec/specs/` is empty today, so we have no existing capability boundaries to align with, and (b) decomposing across capabilities creates artificial coupling between specs that all describe one feature ship.

### D2. Coordinate space: dashboard-internal world coordinates (main.container's local frame); `getCTM` math is the canonical mechanism

`getNodeBounds` and `panToBounds` operate in the dashboard's internal coordinate frame — the local frame of `dashboard.main.container`, before the zoom transform is applied. This is the same frame the existing helper `getBoundingBoxRelativeToParent(node.element, dashboard.main.container)` (utils.js:88) already produces via `parentCTM.inverse().multiply(elementCTM)` and `getBBox()`. The frame is independent of:

- CSS transforms on the host SVG or any page-level ancestor (these affect `getBoundingClientRect`, not `getBBox` + `getCTM`).
- Fullscreen state.
- Device pixel ratio.
- Host-page zoom.

**Implementation mechanism:** `getNodeBounds` MAY reuse `getBoundingBoxRelativeToParent(node.element, main.container)` directly, or read from zone-system positions where available. Both produce the same frame within floating-point tolerance. The earlier proposal version prescribed "MUST read from the zone system" — that was overspecified; the contract is the **coordinate frame**, not the mechanism. The spec enforces a frame-equivalence property (round-tripping through `zoomToNodeById`'s math yields the same target the existing implementation produces) rather than dictating which API to call.

**Alternative considered:** Document coordinates (DOM rect / `getBoundingClientRect` space). Rejected because that is exactly the fragile frame the downstream integration is trying to escape.

### D3. Render-complete signal: single cadence, anchored on the existing `onMainDisplayChange` rAF

The library already has the right anchor: `Dashboard.onMainDisplayChange()` (`dashboard.js:1988`) is called whenever a node's `handleDisplayChange` bubbles up to the root, coalesces multiple signals within one frame into a single `requestAnimationFrame` callback, runs post-layout work (`zoomManager.handleLayoutChange`, `enforceDomHierarchy`, minimap update, selection bounding-box recompute), and resets `_displayChangeScheduled = false`. **The new render event emits at the tail of that rAF callback**, immediately before `_displayChangeScheduled` is cleared. One emit per coalesced display-change burst — no separate "render flush" concept introduced.

Both `dashboard.on('render', handler)` / `once` / `off` and `dashboard.afterRender() → Promise<void>` are exposed and **share the same cadence**:

- `on('render', h)` registers `h` to be called on every emit.
- `once('render', h)` deregisters after the first call.
- `off('render', h)` deregisters explicitly by reference equality.
- `afterRender()` returns a Promise resolved at the next emit; equivalent to `new Promise(r => dashboard.once('render', r))`.

In the active codebase, layout passes are deterministic — collapse/expand, status changes, resize, and structural mutations all settle within one rAF. So one display-change burst maps to one render emit, and "fires per flush" is equivalent to "fires once per layout pass." The earlier proposal version distinguished "per flush" from "per stable terminal flush" with multi-cadence options; that distinction is unnecessary today.

**Alternative considered (rejected — Option B):** Gate the emit on a "simulation is in flight" flag. Only relevant if `dashboard/js/simulation.js` (force-directed layout, currently out of scope and not active) is reactivated. Implementer note recorded in `tasks.md` to revisit this if/when simulation comes back.

**Alternative considered (rejected — Option C):** Two event types (`'render'` per flush plus `'stable'` per terminal). Overkill for the find-and-navigate use case; no caller has asked for the distinction.

**Alternative considered (rejected — Option D):** Two cadences sharing one event name, with the Promise resolving only on stability. Would have required an extra rAF tick of latency on the Promise variant and an implicit "settling debounce" that is hard to reason about. Cadence-collapse via the deterministic-layout property is cleaner.

**Alternative considered (rejected):** Promise-only API. The downstream integration needs continuous re-application of CSS classes after any re-render, not just one-shot; the event form is the natural fit for that and is cheap to expose alongside the Promise.

**Alternative considered (rejected):** Full event-emitter for many event types (`collapse`, `expand`, `zoom`, `select`, …). Out-of-scope creep; only `render` is needed for issue #14.

### D4. Two identifier axes; no `placementIndex`

Mirror the library's existing model:

- **Single-node primitives** (`getNodeBounds`, `revealNode`, `setNodeClass`) accept only `id`. `id` is unique by design; when load-time data has duplicates (the latent `buildNodeMap` quirk), these APIs operate on the **first match** that `getNode(id)` returns — consistent with existing library behavior.
- **Dataset-axis primitive** (`getDatasetNodeIds`) accepts only `datasetId`. Returns the `string[]` of unique `id`s of every node whose `data.datasetId === datasetId`, in tree-walk order (the order `getNodesByDatasetId` already produces). Empty array for unknown `datasetId`.

`getDatasetNodeIds` is a thin public wrapper over the existing internal `getNodesByDatasetId(datasetId)` tree walk on `main.root`, exposing only the ids (not internal node objects). It is the seam that makes the multi-placement find-and-navigate use case tractable without DOM scraping:

```js
const ids = dashboard.getDatasetNodeIds('orders_clean');
for (const id of ids) {
  if (dashboard.getNodeBounds(id) === null) {
    await dashboard.revealNode(id);
  }
  dashboard.setNodeClass(id, 'search-active', true);
}
```

**Alternative considered:** Keep `placementIndex` from the original proposal. Rejected: the library's two identifier axes are the right level to expose, and `placementIndex` would entrench the load-time duplicate-id quirk as a contract.

**Alternative considered:** Return `Node[]` instances directly from `getDatasetNodeIds`. Rejected: leaks internal types onto the public surface. Returning `string[]` keeps the public type narrow and forces callers through the supported primitives.

### D5. `revealNode`: permanent expansion through existing collapse/expand code path

`revealNode(id)` walks from the target node up through ancestor containers (adapter / foundation / mart / group / lane / etc.) and invokes the same expand path each collapsed ancestor would use if the user clicked its toggle. This means:

- Status cascades fire normally.
- `settings.toggleCollapseOnStatusChange` and `settings.cascadeOnStatusChange` apply unchanged.
- No new "reveal" code path — `revealNode` is composition over existing per-node expand operations.

The library does **not** snapshot prior collapsed state. Callers needing restoration are expected to snapshot the ancestor chain's collapsed state themselves before calling. This keeps the library free of hidden state that diverges from the user's mental model.

The returned Promise resolves after the resulting render flush — implementation can compose `afterRender()` internally. If `id` matches no node, the Promise rejects with a clear error. If `id` matches a node already fully visible, the Promise resolves on the next flush (or immediately if no flush is pending).

For multi-placement use cases, callers iterate `getDatasetNodeIds(datasetId)` and call `revealNode(id)` per placement — or only on the placement they're navigating to.

**Alternative considered:** `revealDataset(datasetId)` as a convenience. Rejected as scope creep; the find-and-navigate use case targets one placement at a time (per Prev/Next step), so the iterator-over-ids form is the better primitive.

**Alternative considered:** Return `{ restore }` from the resolved Promise. Rejected as added surface for a feature the downstream UX hasn't asked for.

### D6. `data-dataset-id` replaces the originally-proposed `data-node-id`

Every rendered top-level node `<g>` whose node has a `data.datasetId` SHALL carry `data-dataset-id="<datasetId>"` in addition to the existing `id="<id>"`. The originally-proposed `data-node-id="<id>"` is **dropped**: with `id` treated as unique (per D4) the proposed attribute would be a duplicate of `id` and adds no integration value. The attribute that does add value — querying by shared datasetId without HTML-id-uniqueness violations — is `data-dataset-id`.

Nodes without a `data.datasetId` get no new attribute. The existing `id` attribute is preserved unchanged for every node.

**Alternative considered:** Keep both `data-node-id` and `data-dataset-id`. Rejected: `data-node-id` would duplicate `id` and only "earn its keep" if the host page wanted to repurpose `id` for something else — which the reporter does not need. YAGNI.

### D7. `panToBounds` viewport clamping and oversized-bbox behavior

- **Clamping**: pan target is clamped against the bounding box of the root container (`dashboard.main.root`) so the viewport never reveals whitespace beyond the diagram. This is the same clamp `zoomManager.computeFit` / `zoomToBoundingBox` effectively applies; extracting it into a reusable helper used by both `zoomToBoundingBox` (today) and `panToBounds` (new) is a pure refactor under this change.
- **Oversized bbox**: if `bbox + padding` is larger than the current viewport (at the current zoom level), the bbox is **centered** in the viewport and overflow is accepted. Zoom does not change. Callers wanting fit-to-bbox should use `zoomToBoundingBox` or `zoomToNodeById` explicitly.
- **`padding`**: applied uniformly on all four sides, in dashboard coordinates (same space as the bbox itself).
- **`animate: false`**: completes within a microtask; returned Promise resolves immediately after the transform is applied via `applyTransform({ animate: false })`.
- **`animate: true`**: uses the same easing and duration as the pan leg of `zoomToBoundingBox`'s existing transition, so the two feel coherent when interleaved by callers.

**Alternative considered:** Auto-zoom-out for oversized bbox. Rejected because the proposal explicitly excludes zoom changes from `panToBounds`. Auto-zoom would invert the relationship between `panToBounds` and `zoomToBoundingBox`.

### D9. Guarantee exactly one `render` emit at the end of `initialize()`, in addition to the per-flush cadence

The per-flush cadence locked in by D3 (emit at the tail of `onMainDisplayChange`'s rAF) does **not** fire reliably during initial load. The library itself acknowledges this — `initialize()` at `dashboard.js:822-828` has an explicit `setTimeout` fallback that hides the loading overlay if `onMainDisplayChange` doesn't trigger, and `dashboard.js:815` sets `data-flowdash-ready="true"` on the host element as the canonical "I'm done initializing" signal independent of `onMainDisplayChange`. The actual cadence by init path:

| Init path                                            | Does `onMainDisplayChange` fire during init?                                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Prerender (`settings.usePrerender` + prerender data) | Yes — `applyDeferredStatusRules` (`dashboard.js:194`) explicitly calls it after lifting `_suspendDisplayChange`. |
| Non-prerender, `zoomToRoot: true`                    | Yes — `setTimeout(onMainDisplayChange, 100)` at `dashboard.js:757`.                                              |
| Non-prerender, `zoomToRoot: false` (default)         | Not reliably — no explicit call. The fallback at `dashboard.js:822-828` exists precisely for this gap.           |

Without a guarantee, `afterRender()` would hang forever for the most common case (non-prerender, default settings, static dashboard): the Promise has nothing to resolve against until the next state change, which may never come.

**The fix:** add `this._emit('render')` at the end of `initialize()`, immediately after the `data-flowdash-ready` attribute write at `dashboard.js:815`. One line. This guarantees:

- **`afterRender()` works as a "dashboard is ready" gate** in all three init paths.
- **Handlers registered before `await init` receive at least one baseline emit** regardless of which path was taken.
- **Idempotent with the prerender path**: if `applyDeferredStatusRules` already emitted via `onMainDisplayChange`, the init-end emit is the second one. The spec already requires handlers to tolerate multiple emits (see scenario "Render hook fires more than once across multiple flushes"); `afterRender()` resolves on the first emit it sees.
- **No change to the locked-in cadence** (D3): per-flush emits via `onMainDisplayChange` continue as before. The init-end emit is **in addition** to those, not a replacement.

**Alternative considered (Option B):** route the init-end emit through `onMainDisplayChange()` rather than direct `_emit('render')`. Rejected: `onMainDisplayChange` is gated by `_suspendDisplayChange` and rAF coalescing, both of which could theoretically suppress the emit at exactly the wrong moment. Direct `_emit` is reliable.

**Alternative considered (Option C):** no init guarantee — document the gotcha and require callers to use `data-flowdash-ready` or trigger a state change before calling `afterRender()`. Rejected: footgun for the most common use case; `afterRender()` would silently hang for static dashboards.

**Alternative considered (Option D):** make `afterRender()` resolve immediately if `_initialLoading === false && _displayChangeScheduled === false`. Rejected: changes `afterRender()`'s semantic from "wait for next emit" to "are we settled now," which is harder to compose inside `revealNode` and other internal callers.

### D10. Re-entrancy contract: emit AFTER clearing the coalescing flag; `afterRender()` resolves immediately when idle

Two coupled decisions, both about behavior at the edges of the render emit:

**Decision D10a — emit after `_displayChangeScheduled = false`, not before.**

`Dashboard.onMainDisplayChange`'s rAF callback clears the coalescing flag (`_displayChangeScheduled = false`, `dashboard.js:2067`) at the very end. The `_emit('render')` call MUST happen **after** that line, not before. Reason: if a handler triggers a mutation that bubbles `handleDisplayChange` to root (e.g., the handler calls `revealNode`, `addNode`, status setters), root invokes `onMainDisplayChange` again. If the coalescing flag is still `true` at that moment, the new signal is swallowed (early-return) and the resulting `zoomManager.handleLayoutChange` / minimap update / `enforceDomHierarchy` work never runs for the new state. By emitting AFTER clearing the flag, handler-triggered mutations get their own rAF cleanly.

Side effect: handlers run after all the existing post-display work (`zoomManager.handleLayoutChange` etc.) has completed for the _current_ state. That's correct — handlers reading bounds via `getNodeBounds` see final positions for this flush, not transient mid-pass values.

**Decision D10b — `afterRender()` resolves immediately (microtask) when the dashboard is idle.**

The naive implementation `afterRender() => new Promise(r => once('render', r))` hangs forever if called on a static dashboard after init: there is no future emit to resolve against, and the caller's await deadlocks. Fix: track whether at least one emit has occurred since construction (`_hasEmittedSinceInit`), and use it to short-circuit:

```js
afterRender() {
  if (this._hasEmittedSinceInit && !this._displayChangeScheduled) {
    return Promise.resolve();  // idle and ready — resolve in microtask
  }
  return new Promise(r => this.once('render', r));  // wait for next emit
}
```

`_hasEmittedSinceInit` flips to `true` inside `_emit('render')` itself, so it covers all three init paths (prerender via `applyDeferredStatusRules` → `onMainDisplayChange`, non-prerender via the init-end emit from D9, and any subsequent per-flush emit). The four cases this handles:

| Call site                             | `_hasEmitted` | `_displayChangeScheduled`             | Resolution                                                                   |
| ------------------------------------- | ------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| Before init completes                 | `false`       | (any)                                 | `once('render', r)` → resolves on first emit (at minimum, the init-end emit) |
| After init, static (no flush pending) | `true`        | `false`                               | Microtask: `Promise.resolve()`                                               |
| After init, flush pending             | `true`        | `true`                                | `once('render', r)` → resolves on this flush's emit                          |
| Inside a `render` handler             | `true`        | `false` (D10a cleared it before emit) | Microtask: `Promise.resolve()` — "this render is done"                       |

The inside-a-handler case may surprise callers who expect "wait for the NEXT render." That interpretation is supported by triggering a state change first (which sets `_displayChangeScheduled = true`) and then awaiting — the natural usage pattern.

Crucially, idle-resolve uses a **microtask** (`Promise.resolve()`), not a synthetic emit. Other `on('render', h)` subscribers are NOT invoked. Only the `afterRender()` caller resolves. No phantom emits in the per-flush stream.

**Alternative considered (rejected — A):** emit before clearing the flag and document the re-entrancy footgun ("don't call mutating APIs from a `render` handler"). Rejected because every event-emitter system that documents this footgun gets bug reports from callers who hit it anyway; the library should handle re-entrancy gracefully without ceremony.

**Alternative considered (rejected — B):** trigger a synthetic emit for idle `afterRender()` callers. Rejected because other `on('render')` subscribers would see a phantom emit with no underlying state change, breaking the "emit means state changed or init completed" invariant.

**Alternative considered (rejected — C):** keep the naive `afterRender()` and require callers to use `data-flowdash-ready` for the idle case. Rejected because it leaks the static-dashboard footgun onto every caller and contradicts the init-end guarantee from D9 (whose whole purpose is making `afterRender()` reliable as a ready gate).

### D8. Acknowledge the load-time duplicate-`id` quirk; do not codify it

`buildNodeMap` (dashboard.js:303) silently overwrites duplicates via `map.set` during initial data load, while `_assertIdAvailable` correctly throws on `addNode`. The new APIs do not depend on this quirk and do not attempt to expose duplicates at the `id` axis. A follow-up change is recommended to tighten initial-load uniqueness to match the runtime contract, but it is **out of scope** here:

- It is a behavior change for any consumer whose data currently relies on the silent-overwrite behavior (including, possibly, the reporter).
- It can ship separately (likely as a 2.0.x major) with its own migration guidance.
- This change should NOT block on that follow-up.

The new APIs document `id` as unique-by-design and behave consistently with that documented intent. The `getDatasetNodeIds` primitive gives callers a supported path for the multi-placement use cases that the duplicate-id quirk currently enables informally.

### D11. Id staleness: collapse three null-cases into one, use `revealNode` as the disambiguator

For find-and-navigate, the caller holds ids over time (search results iterated via Prev/Next). Between caching and use, an id can fall into one of three states:

1. **Hidden** — node exists in the data model, but its top-level `<g>` is detached from the DOM because an ancestor is collapsed.
2. **Stale** — node was removed via the public `removeNode(id)` primitive (`dashboard.js:1466`) after the caller cached the id.
3. **Never existed** — caller passed a typo or fabricated id.

`getNodeBounds(id)` returns `null` for all three. This is deliberate — distinguishing them at the bounds-query level would require either a richer return type or a separate `hasNode(id)` API, both of which add surface for a case the caller can resolve with the existing primitives:

```js
let bounds = dashboard.getNodeBounds(id);
if (bounds === null) {
  try {
    await dashboard.revealNode(id);
    bounds = dashboard.getNodeBounds(id); // now non-null if case 1
  } catch {
    // case 2 or case 3 — id is gone or never existed; same handling either way
  }
}
```

`revealNode(id)` is the disambiguator: it **resolves** on case 1 (hidden, expands ancestors), and **rejects with the same error** on cases 2 and 3 (no node found). The library does not distinguish "was once valid" from "never valid" — both look identical to `getNode(id)` (which returns `null`), and there is no audit trail of removed ids. That's fine for the find-and-navigate use case: the caller's reaction to both is the same (skip this result).

`setNodeClass(id, className, enabled)` is a **silent no-op** for all three null-cases. This is intentional for batch fan-out patterns:

```js
for (const id of dashboard.getDatasetNodeIds(datasetId)) {
  dashboard.setNodeClass(id, 'search-active', true); // no try/catch needed
}
```

Throwing per-id would force callers to wrap every iteration in a try/catch, which is hostile to the common path. Callers who need to know whether the class was applied can guard with `getNodeBounds(id) !== null` first.

**Alternative considered (rejected — B):** richer `getNodeBounds` return type (`null` | `{ status: 'hidden' }` | bbox). Adds a type to remember and a second branch to every consumer; `revealNode` already disambiguates.

**Alternative considered (rejected — C):** `setNodeClass` returns a boolean indicating whether it applied. Inconsistent with the rest of the void-returning setter surface; callers can guard explicitly.

**Alternative considered (rejected — D):** new `hasNode(id) → boolean` primitive. Fourth way to do the same check. Cheap but pure surface-area cost.

**Alternative considered (rejected — E):** `setNodeClass` throws on unknown id (matching `revealNode`'s strictness). Hostile to fan-out patterns; the silent no-op is more ergonomic for batch operations.

### D12. Handler error semantics: `console.error` + grep-able prefix; snapshot iteration

Two coupled emit-loop decisions:

**D12a — Errors thrown by `render` handlers are caught, logged via `console.error`, and do not break the loop.**

Each handler invocation is wrapped:

```js
try {
  h();
} catch (err) {
  console.error('flowdash: render handler threw:', err);
}
```

`console.error` (not `_debugLog`) is used because a handler throwing is a bug in the caller's code, not diagnostic chatter — the library's own convention (`dashboard.js:122`) reserves `_debugLog` for debug-gated chatter and uses `console.warn` / `console.error` for genuine warnings. Hiding handler errors behind `settings.isDebug` would turn caller bugs into silent failures. The `flowdash:` prefix matches how the library already labels error messages (e.g., `flowdash.addNode: …`) and makes the error grep-able in Sentry / Datadog / browser devtools.

One throwing handler does not prevent subsequent handlers in the same emit from running. A throwing handler that also triggered a state change still benefits from re-entrancy safety (D10a): the bubbled `handleDisplayChange` reaches `onMainDisplayChange` before the throw is caught, so the fresh rAF still gets scheduled.

**D12b — Iterate a snapshot of the handler set, taken at emit start.**

```js
const handlers = [...(this._eventHandlers.get('render') ?? [])];
for (const h of handlers) { try { h(); } catch (err) { … } }
```

All handlers registered before this emit started run for this emit; mutations during emit (handlers `on()`'d or `off()`'d, including `once`'s self-deregistration) take effect only on the **next** emit. This matches Node `EventEmitter`, jQuery, and DOM `EventTarget` semantics — the least-surprising choice.

Concrete consequences:

- A handler that calls `dashboard.off('render', otherHandler)` during emit: `otherHandler` still runs for this emit if it was in the snapshot, then skips future emits.
- A `once` handler: its internal `off` runs against the live set; since we iterate the snapshot, the deregistration takes effect for the next emit, which is exactly the "fire once" semantic we want.
- A handler that calls `dashboard.on('render', newHandler)`: `newHandler` is NOT invoked for the current emit; it joins from the next emit.

**Alternative considered (rejected — B):** `_debugLog` (debug-gated) — the original task 1.2 plan. Silent in production; caller bugs go invisible. Rejected.

**Alternative considered (rejected — C):** propagate the first throw out of the emit loop. Strict but leaves subsequent handlers silently un-invoked.

**Alternative considered (rejected — D):** catch + async re-throw via `setTimeout(() => { throw err; }, 0)`. Surfaces to `window.onerror` in a "proper" way. Rejected as marginal benefit — `console.error` is already captured by every error reporter; the extra code isn't worth it.

**Alternative considered (rejected — E):** live-set iteration. A handler that `off()`s a later handler skips it for this emit. Cleaner in isolation but inconsistent with EventEmitter conventions and harder to reason about with `once`. Rejected.

## Risks / Trade-offs

- **Risk:** A caller with legitimate-but-undocumented duplicate-`id` data (relying on the `buildNodeMap` quirk) migrates to the new API expecting `getNodeBounds(id)` to "find all placements," gets first-match behavior, and ends up with subtly broken navigation. → **Mitigation:** documentation explicitly calls out the `id` vs `datasetId` distinction in the new "Public API hooks" section; `getDatasetNodeIds` is highlighted as the supported multi-placement path. Spec scenarios include the duplicate-id-on-load case and assert first-match semantics.
- **Risk:** `revealNode` triggering status cascades could cause neighbour nodes to re-collapse if the user has set `settings.toggleCollapseOnStatusChange: true`. → **Mitigation:** documented in the spec and design (this is intentional — `revealNode` composes existing behavior). The downstream integration can call `afterRender` and re-check `getNodeBounds(id)` to detect this.
- **Risk:** Render-complete event fires on every flush; an unsubscribed listener leak in a long-lived host page could grow unbounded. → **Mitigation:** spec requires `off('render', handler)` to exist and to be referentially correct. Documentation calls out the leak risk in the "Public API hooks" section.
- **Risk:** `getDatasetNodeIds` returning an empty array vs `null` could trip callers who use truthy checks (`if (ids) …` is always true for an empty array). → **Mitigation:** spec explicitly returns `string[]` (never null), so callers always pattern `ids.length === 0` or just iterate. Documentation example uses iteration.
- **Trade-off:** Single capability vs many. Keeps the spec compact, but the capability spec grows to ~7 requirements. Acceptable given each requirement is small.
- **Trade-off:** Coordinate-frame choice (D2) is documented but easy to misuse — a caller could mix `getNodeBounds` output with `getBoundingClientRect` math and get nonsense. → **Mitigation:** documentation includes a one-paragraph "coordinate space" note and the spec scenarios use round-trips that only make sense in dashboard-internal space.
- **Trade-off:** Dropping `data-node-id` (D6) means we don't satisfy the literal text of the original issue's request (5). The reporter's motivation (HTML id-uniqueness) is satisfied a different way (via `data-dataset-id` and `id`-uniqueness-as-contract). We need to communicate this clearly back on the issue so the reporter doesn't expect literal `data-node-id` after the change ships.

## Migration Plan

This is a purely additive change. No migration required for existing callers; existing `id` attribute and `zoomToNodeById` behavior are preserved.

**Deploy steps:**

1. Land must-haves (capabilities 1–4 plus `getDatasetNodeIds` from tasks.md) in one PR.
2. Land optional additions (`data-dataset-id`, `setNodeClass`) in a second PR, or together with the must-haves at the implementer's discretion.
3. Bump dashboard `package.json` to `1.5.0` via explicit `npm version minor`.
4. Update `dashboard/documentation/dashboard.md` with a "Public API hooks" section that includes the `id` vs `datasetId` distinction and links back to issue [#14](https://github.com/schalkje/flowdash/issues/14) for context.

**Rollback:** revert the PRs. No persisted state, no data-shape changes, no breaking surface to unwind.

## Open Questions

None at the spec level. Implementation-level choices (exact event-emitter helper, exact tween used for the animated pan) are left to the implementer. The load-time duplicate-`id` cleanup (D8) is acknowledged as a recommended follow-up but explicitly out of scope.
