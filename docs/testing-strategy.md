# Testing Strategy

The canonical testing strategy for FlowDash. Replaces the older [`/dashboard/tests/TESTING_STRATEGY.md`](../dashboard/tests/TESTING_STRATEGY.md), which references a folder layout that no longer exists.

## The four layers

```
              ┌─────────────────────────┐
              │  Visual regression      │   tests/visual-regression.spec.js
              │  (per-pixel guards)     │   chromium-only baselines
              ├─────────────────────────┤
              │  Performance benchmarks │   tests/performance.spec.js
              │  (asserted budgets)     │   chromium-only timing
              ├─────────────────────────┤
              │  E2E / integration      │   tests/*.spec.js
              │  (Playwright, real DOM) │   chromium + webkit
              ├─────────────────────────┤
              │  Unit                   │   dashboard/tests-unit/*.test.js
              │  (Vitest, pure JS)      │   ESM, no DOM
              └─────────────────────────┘
```

Every change should pass through the lowest layer that can express the assertion. Push tests downward when you can; that's where they're cheapest, fastest, and least flaky.

## Layer 1 — Unit (Vitest)

**Scope.** Pure functions and pure-class methods inside `/dashboard/js/` that don't need a browser, d3 runtime, or live DOM.

**Layout.**
- Configuration: [`/dashboard/vitest.config.js`](../dashboard/vitest.config.js)
- Specs: [`/dashboard/tests-unit/`](../dashboard/tests-unit/) — see its [README](../dashboard/tests-unit/README.md) for module-by-module coverage.

**Run.**
```bash
cd dashboard
npm run test:unit
npm run test:unit:watch
npm run test:coverage
```

Or from repo root: `npm run test:unit`, `npm run test:coverage`.

**Coverage policy.** A starting floor (50% statements / 40% branches / 50% functions / 50% lines) is enforced via Vitest's c8 thresholds. Ratchet the floor upward as the suite grows. Never lower it without a deliberate, documented decision.

**What's NOT here.** Anything that imports d3 at module-load time, anything that constructs DOM, anything that needs a webpack bundle. That's the integration layer's job.

## Layer 2 — Integration / E2E (Playwright)

**Scope.** End-to-end behavior in a real browser: rendering, layout, click handlers, zoom, theme swaps, file selection, the whole dashboard load path.

**Layout.**
- Configuration: [`/playwright.config.cjs`](../playwright.config.cjs) — Chromium + WebKit projects, autostarts `python -m http.server 8000`, ignores `tests/_scratch/`.
- Specs: [`/tests/`](../tests/) — 19 specs covering every node type and major composed scenario.
- Helpers: [`/tests/helpers/ready.js`](../tests/helpers/ready.js) — `waitForFlowdashReady` and `gotoAndReady`.

**Run.**
```bash
npm test                                              # full suite
npm run test:adapter | test:foundation | test:lane    # per-node-type subsets
npm run test:single -- "test name fragment"           # one test by --grep
npm run test:ui                                       # interactive UI mode
npx playwright test tests/foo.spec.js                 # one spec
npx playwright test --project=chromium                # one browser
```

**Convention: prefer the readiness helper over `waitForTimeout`.**

```js
import { gotoAndReady } from './helpers/ready.js';

test.beforeEach(async ({ page }) => {
  await gotoAndReady(page, '/dashboard/flowdash-js.html');
});
```

The dashboard sets `data-flowdash-ready="true"` on its root SVG at the end of `Dashboard.initialize()` (see [`/dashboard/js/dashboard.js`](../dashboard/js/dashboard.js)). The helper waits for that attribute, falling back to `svg + 250ms settle` for demo pages that don't (yet) wire it up.

**Animation waits are fine.** `waitForTimeout(500)` after a `dblclick()` to let a zoom transition complete is not the same flake risk as a layout-readiness wait — keep those.

**Cross-browser.** Tests run on Chromium and WebKit. Firefox is excluded by project policy.

**Failure artifacts.** `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, `trace: 'on-first-retry'`. Reports go to `/playwright-report/` and are uploaded by CI.

## Layer 3 — Performance (Playwright + perf-baselines.json)

**Scope.** Phase-level timing budgets on canonical fixtures. Guards the pre-render fast-path.

**Layout.**
- Spec: [`/tests/performance.spec.js`](../tests/performance.spec.js)
- Baselines: [`/tests/perf-baselines.json`](../tests/perf-baselines.json)
- Underlying instrumentation: [`/dashboard/tests/PERFORMANCE_INSTRUMENTATION.md`](../dashboard/tests/PERFORMANCE_INSTRUMENTATION.md) — the dashboard already collects `performanceMetrics` on every load.

**Run.**
```bash
npm run test:perf
```

**Tolerance.** Each phase budget is multiplied by `_tolerance` in `perf-baselines.json` (default 1.5×). Regressions have to be substantial to fail.

**Chromium-only.** WebKit timing variance is too high for stable budgets without per-machine baselines.

**Update workflow.** When a justified change shifts the timings:

1. Re-run the suite locally to capture new numbers.
2. Edit `perf-baselines.json` by hand. Tighten budgets where you can.
3. Commit the baseline update *alongside* the code change. Reviewers should see both.

**Pre-render assertion.** The `fastPathRatio` block in `perf-baselines.json` asserts that the prerendered version of a fixture is meaningfully faster than the cold version (default: warm/cold ≤ 0.85). This catches "we accidentally broke the pre-render fast path."

## Layer 4 — Visual regression (Playwright `toHaveScreenshot()`)

**Scope.** Per-pixel guards on canonical demos and the theme grid. Catches subtle rendering changes (spacing, stroke, color, text positioning) that DOM assertions miss.

**Layout.**
- Spec: [`/tests/visual-regression.spec.js`](../tests/visual-regression.spec.js)
- Baselines: `tests/visual-regression.spec.js-snapshots/` (per-OS / per-browser PNGs, committed)

**Run.**
```bash
npm run test:visual                                   # asserts against baselines
npx playwright test tests/visual-regression.spec.js --update-snapshots
```

**Chromium-only.** Anti-aliasing differences would force a separate baseline tree per browser for no real signal.

**Tolerance.** `maxDiffPixelRatio: 0.01` allows up to 1% pixel difference per shot to absorb font-rasterization noise without hiding regressions.

**Adding a target.** Append to the `TARGETS` array in `visual-regression.spec.js`. Run with `--update-snapshots`. Review the generated PNG and commit it.

**Renaming a target invalidates its baseline.** Don't rename casually; if you must, regenerate the baseline.

## CI

[`/.github/workflows/test.yml`](../.github/workflows/test.yml) runs three jobs on every push and PR to `main`:

| Job | What |
|-----|------|
| `unit` | `npm run test:coverage` from `/dashboard`. Uploads coverage. |
| `e2e` (chromium) | `npx playwright test --project=chromium`. Includes perf and visual regression specs. Uploads HTML report and failure artifacts. |
| `e2e` (webkit) | Same, on WebKit. Visual + perf are skipped via `test.skip`. |

`forbidOnly: !!process.env.CI` is set, so a `.only` slipping into a spec fails CI.

## Anti-patterns to avoid

- **Adding more `waitForTimeout` calls.** Use `waitForFlowdashReady` or a `locator.waitFor({ state: 'visible' })`. The 110+ existing waits are tracked for migration in [`improvement-plan.md`](./improvement-plan.md).
- **Asserting "something rendered" only.** That fails as a regression test — almost any breakage still renders something. Assert the *specific* shape of what should be there.
- **Coupling tests to internal implementation details.** Prefer DOM / behavior assertions over reaching into `window.dashboard.someInternalProperty` — except in performance and unit specs where it's intentional.
- **Marking flaky tests `.skip` instead of fixing them.** A skipped test is dead; fix the root cause.
- **Generating fixtures from tests.** Fixtures live in `/dashboard/data/` and are committed. Test data comes *from* the repo, not the test run.

## Roadmap

Open items, tracked in [`improvement-plan.md`](./improvement-plan.md):

- Migrate the remaining ~110 `waitForTimeout` calls to readiness signals (Phase 2.4).
- Capture initial visual-regression baselines on CI hardware (Phase 2.2).
- Tighten `perf-baselines.json` after the first stable CI runs (Phase 2.3).
- Wire `data-flowdash-ready` into the demo pages, not just `flowdash-js.html` (Phase 2.4 follow-up).
