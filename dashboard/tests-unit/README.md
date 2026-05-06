# dashboard/tests-unit/

Vitest unit tests for the pure-function and pure-class slice of the FlowDash library. These specs exercise modules that do not need a browser, d3 runtime, or live DOM, giving fast feedback on the math and configuration layers.

## Running

```bash
cd dashboard
npm install        # first time only — pulls in vitest + @vitest/coverage-v8 + jsdom
npm run test:unit
npm run test:unit:watch
npm run test:coverage
```

From the repo root:

```bash
npm run test:unit       # delegates to dashboard
npm run test:coverage
```

## Coverage scope

Configured in [`vitest.config.js`](../vitest.config.js). Coverage tracks only the modules the unit tests can reach without a browser:

- `js/utilPath.js`
- `js/utils.js`
- `js/configManager.js`
- `js/geometryManager.js`
- `js/nodeRegistry.js`
- `js/statusManager.js`

The starting threshold is **50% statements / 40% branches / 50% functions / 50% lines** — a deliberate floor, not a ceiling. Ratchet upward as the suite grows, never downward. Modules that need a real browser (`zoomManager`, `themeManager`, the node classes themselves, anything that calls `d3.select`) are intentionally out of unit-test scope and rely on Playwright integration coverage instead.

## Conventions

- One spec per module under test, named `<module>.test.js`.
- Exercise public exports only — never reach into internals.
- Mock cross-module dependencies that pull in d3 (see `statusManager.test.js`'s mock of `nodeBase.js` for the pattern).
- Tests must be deterministic and pure — no timers, no real DOM, no network.
- Prefer many small `it()` blocks over a single mega-test; each `it` should fail with a clear, single explanation.

## Module-by-module notes

| Spec                      | Tests                                                                                                                                                             | What it asserts |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `utilPath.test.js`        | side-midpoint geometry for `computeConnectionPoints` and `computeLocalConnectionPoints`, including zero/negative inputs                                           |
| `nodeRegistry.test.js`    | registration round-trip, case normalization, container vs simple constructor dispatch, unknown-type fallback                                                      |
| `utils.test.js`           | `computeBoundingBox` for centered nodes, defaults, single-node, negatives. (DOM-dependent helpers in `utils.js` are deferred to integration.)                     |
| `configManager.test.js`   | `deepMerge` semantics (recurse vs replace, array-as-scalar, no mutation), `mergeWithDefaults` for prod and demo, `validateSettings` aggregation, helper freshness |
| `geometryManager.test.js` | bounding-box, container size with margins, minimum-size fallbacks, position adjustment, edges & center                                                            |
| `statusManager.test.js`   | aggregate-status priority, special SKIPPED+UPDATED → UPDATED case, DISABLED filtering, collapse rules, classification helpers                                     |

## What is NOT covered here

- `forceBoundary.js` — the function is defined but never `export`ed (likely loaded as a global script in a non-module context). Cannot be unit-tested via ESM until it is converted to an export. Tracked as a follow-up in [`/docs/improvement-plan.md`](../../docs/improvement-plan.md).
- `forceRectCollide.js` — depends on `d3.quadtree`. Test under jsdom + d3 in a follow-up if needed; for now, integration coverage via Playwright suffices.
- `utilPath.js`'s `generateEdgePath` / `getZoneTransforms` — depend on live node objects with their own methods.
- `utils.js`'s `getTextWidth`, `getRelativeBBox`, `getBoundingBoxRelativeToParent` — DOM-dependent.
- All node classes (`nodeBase`, `nodeRect`, `nodeAdapter`, etc.) — these construct DOM via d3 and are covered by Playwright.
