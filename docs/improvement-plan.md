# Improvement Plan

A phased, prioritized roadmap for closing the gaps identified in [`current-state.md`](./current-state.md). Each phase has concrete deliverables and links to the existing assets it builds on. Phases are ordered by leverage (impact ÷ risk), not by importance — every phase matters; this is just the recommended sequence.

> **Conventions:** mark a bullet `✅` when complete (do not renumber). When a deliverable is shipped, link to the PR. If a deliverable becomes obsolete, strike it through with a one-line note explaining why.

## Status snapshot (2026-05-04)

The first wave of work has landed. The list below lets you skip the per-bullet detail and see the shape:

| Phase | Status | Notes |
|------:|:-------|-------|
| 1.1 Package versioning | ✅ Shipped | Root renamed `flowdash-harness`, build delegates, `docs/release.md` written. |
| 1.2 README + broken refs | ✅ Shipped | TEST_PLAN refs replaced; `11_dashboard` showcase entry replaces broken `01_loading`. |
| 1.3 Scratch / duplicates | ✅ Shipped | Debug specs and HTMLs moved to `_scratch/`; Playwright `testIgnore` added; zone-double-click duplicate resolved. |
| 1.4 Numbering | ✅ Documented | Scheme codified in `demo-philosophy.md`. d3_basics renumbering deferred (cosmetic, not blocking). |
| 2.1 Vitest unit layer | ✅ Shipped | `dashboard/tests-unit/` with 6 specs covering utilPath, configManager, geometryManager, nodeRegistry, statusManager, utils. Coverage thresholds set. |
| 2.2 Visual regression | ✅ Scaffolding | `tests/visual-regression.spec.js` ready; baselines must be captured on first CI run. |
| 2.3 Performance benchmarks | ✅ Shipped | `tests/performance.spec.js` + `tests/perf-baselines.json`. Generous initial budgets — ratchet after first runs. |
| 2.4 Readiness signal + waits | ⏳ Partial | `data-flowdash-ready` attribute + `tests/helpers/ready.js` shipped. Migrating the remaining ~110 `waitForTimeout` calls is incremental work. |
| 2.5 GitHub Actions CI | ✅ Shipped | `.github/workflows/test.yml`: unit + chromium + webkit, artifact upload, badge added. |
| 3.1 Missing-feature demos | ✅ Shipped | `12_selection`, `13_zoom`, `14_status`, `15_minimap`, `16_overlay`, `17_prerender` all created and registered in the navigator. |
| 3.2 Flagship showcase | ✅ Shipped | `11_dashboard/01_showcase/showcase.html` combines node types + theme switcher + minimap + dataset selector. |
| 3.3 Modernize experiments | ⏳ Open | Decision per item, plus CDN-import migration. Low priority. |
| 3.4 Data-loading demo | ⏳ Open | Pattern is already in the showcase via `fetch()`; a dedicated `18_data-loading/` is still useful. |
| 4 Repo-level docs | ✅ Shipped | `docs/{README,project-goals,current-state,improvement-plan,release,contributing,testing-strategy,architecture-map,demo-philosophy}.md`. |

Items still open are tracked in the per-phase sections below.

---

## Phase 1 — Repo-level hygiene

**Goal:** Make the repository legible to a newcomer in under 30 minutes. Low risk, high information gain.

### 1.1 Reconcile package versioning ✅ pending

- [ ] Document the dual-package model in `docs/release.md` (new file): why root `package.json` is the test harness and `dashboard/package.json` is the library; what each version means; how external consumers should pin.
- [ ] Either bump root `package.json` to mirror the library version, or rename it to make the harness role explicit (e.g. `"name": "flowdash-tests"`). Recommended: **rename** — keeps the library version authoritative and avoids two-bumps-per-release.
- [ ] Remove the misleading `"build": "webpack --mode production"` from the root `package.json`, or rewrite it to delegate to `cd dashboard && npm run build`.

### 1.2 Fix README and broken references ✅ pending

- [ ] Replace `README.md` references to `TEST_PLAN.md` with links to [`tests/COMPREHENSIVE_TESTING.md`](../tests/COMPREHENSIVE_TESTING.md) and [`dashboard/tests/TESTING_STRATEGY.md`](../dashboard/tests/TESTING_STRATEGY.md), or write a real `docs/testing.md` and point there.
- [ ] Fix `11_dashboard/index.html` reference to a non-existent `01_loading/` folder — either create the folder or remove the link.
- [ ] Add a `docs/contributing.md` explaining: how to add a node type, how to add a demo (and register it in the navigator), how to add a test.

### 1.3 Clean up scratch and duplicates ✅ pending

- [ ] Audit and either delete or move into a clearly-labelled `scratch/` subtree:
  - `08_martNodes/debug_comparison.html`
  - `08_martNodes/debug_explicit_role.html`
  - `tests/debug.spec.js`
  - `tests/debug-lane-test.spec.js`
  - `dashboard/tests/debug-zone-creation.spec.js`
- [ ] Resolve the `zone-double-click.spec.js` duplicate between `tests/` and `dashboard/tests/` — keep one, delete the other, document the rationale.
- [ ] Decide and document: is `/tests/` (root) the canonical Playwright location? Recommended: **yes** (matches `npm test`, matches [`playwright.config.cjs`](../playwright.config.cjs)'s `testDir: './tests'`). Migrate the 2 useful specs from `dashboard/tests/` into `/tests/` (or delete if redundant), and reposition `dashboard/tests/` as the home for performance harnesses only.
- [ ] Update [`dashboard/tests/TESTING_STRATEGY.md`](../dashboard/tests/TESTING_STRATEGY.md): its references to `4_edges/`, `5_nodes/`, `6_groups/`, `7_dashboard/` predate the current `01_*` / `02_*` naming. Either rewrite or replace with a top-level `docs/testing-strategy.md`.

### 1.4 Numbering coherence ✅ pending

- [ ] Decide and document the numbering scheme. Recommended:
  - `01–11` reserved for **product-feature demos** in scope progression.
  - `d3_basics/` keeps internal numbering but is treated as a learning subtree, not part of the main scheme. Renumber its 03 → 10 jump to be sequential.
  - `experiments/` is unnumbered or uses a clearly experimental prefix (e.g. `wip-dwhflow/`, `wip-network/`) — currently `40_*` and `50_*` look like first-class entries.
- [ ] Update [`generateIndex.ps1`](../generateIndex.ps1) and [`index.html`](../index.html) to reflect any renumbering.

---

## Phase 2 — Testing pyramid

**Goal:** Lift the testing pyramid into shape. The current setup is "all E2E, no unit, no visual, no perf assertions, no CI." Address each in order.

### 2.1 Introduce a unit-test layer

Recommendation: **Vitest**. Reasons: ESM-native (matches `"type": "module"`), fast, c8 coverage built in, JSDOM compatibility for the few utilities that touch the DOM, minimal config.

- [ ] Add Vitest to `dashboard/package.json` devDependencies. Add scripts: `test:unit`, `test:unit:watch`, `test:coverage`.
- [ ] Create `dashboard/tests-unit/` with first-pass coverage of:
  - **`utilPath.js`** — every public path-math function. High value; today entirely untested.
  - **`geometryManager.js`** — coordinate transforms, bounds calculations.
  - **`configManager.js`** — deep-merge of user settings vs defaults; corner cases (deep arrays, null overrides).
  - **`forceBoundary.js`** — boundary force math.
  - **`forceRectCollide.js`** — rectangle collision math (replacing D3's circle default).
  - **`nodeRegistry.js`** — factory dispatch; assert that an unknown type throws or is registrable.
  - **`statusManager.js`** + the `NodeStatus` transitions — assert each legal transition; assert cascades terminate.
- [ ] Set a starting coverage floor (e.g. 60% statements on the files above) and ratchet it upward as new tests land. Configure c8 to fail the run below the floor.

### 2.2 Visual regression

- [ ] Adopt Playwright's built-in `expect(page).toHaveScreenshot()` for canonical demos. Treat baselines as **per-OS, per-browser** committed PNGs under `tests/__screenshots__/`.
- [ ] Initial baseline set:
  - One demo per node type (rect, circle, lane, columns, adapter, foundation, mart, group).
  - The `themes-grid` page across all 8 themes.
  - The 4 edge directional flows from `10_edges/`.
  - The flagship `11_dashboard/` showcase (after Phase 3.2).
- [ ] Document the baseline-update workflow: when is `--update-snapshots` legitimate, who reviews diffs, how do platform-specific renders get reconciled. Put this in `docs/testing-strategy.md`.

### 2.3 Asserted performance benchmarks

The instrumentation already exists ([`dashboard/tests/PERFORMANCE_INSTRUMENTATION.md`](../dashboard/tests/PERFORMANCE_INSTRUMENTATION.md)). The gap is **assertion**.

- [ ] Add a Playwright `tests/performance.spec.js` that:
  - Loads `dwh-1.json` (small) and `dwh-6.json` (~579 KB, 800+ nodes) via `dashboard/flowdash-js.html`.
  - Reads the global perf metrics object the dashboard already emits.
  - Asserts each phase against a ratcheted threshold stored in `tests/perf-baselines.json`.
  - Repeats with the matching `*.prerender.json` to assert the fast-path delta is at least N×.
- [ ] On regression, fail loudly with a diff against the baseline. Allow `npm run test:perf:update` to re-record after a justified change.
- [ ] Cover the lifecycle, not just init: also measure single-node collapse, full-tree collapse, expand-from-collapsed, theme swap, fit-to-viewport.

### 2.4 Replace hard-coded waits

- [ ] Audit specs for `waitForTimeout(`. Replace each with one of:
  - `await locator.waitFor({ state: 'visible' })`
  - A `data-ready` attribute the dashboard sets when a layout pass completes.
  - `await page.waitForFunction(() => window.flowDashboard?.ready === true)`.
- [ ] Add a `data-ready="true"` attribute on the dashboard root after `Dashboard.init()` resolves; document the contract in [`dashboard/documentation/dashboard.md`](../dashboard/documentation/dashboard.md).

### 2.5 Continuous integration

- [ ] Add `.github/workflows/test.yml`:
  - Trigger on push and PR.
  - Matrix: `ubuntu-latest` × `[chromium, webkit]`.
  - Steps: checkout → setup-node → `npm ci` → `npm run test:unit` → `npx playwright install --with-deps` → `npm test` → `npm run test:perf` → upload `playwright-report/` and screenshot diffs as artifacts on failure.
- [ ] Add a `coverage.yml` job that uploads c8 output and posts a coverage comment on PRs.
- [ ] Add a status badge to the README.

### 2.6 Test-folder ownership

(See Phase 1.3.) The outcome should be: `/tests/` is the only Playwright spec directory. `dashboard/tests/` becomes the home for manual perf harnesses (`test-*.html`, `*.ps1`) and is renamed `dashboard/perf/` to make the role explicit.

---

## Phase 3 — Demo coverage

**Goal:** Every public feature has at least one dedicated, navigator-listed demo, plus a flagship integrated dashboard.

### 3.1 Add missing-feature demos

Each demo follows the existing convention: self-contained HTML, inline static data, registered in [`index.html`](../index.html) via `generateIndex.ps1`.

- [ ] **`12_selection/`** — single click vs double click; programmatic `dashboard.main.root.onClick` override; the **Selection Neighborhood** algorithm with sliders for `settings.selector.incomming` and `settings.selector.outgoing` traversal depths. Reference: [`dashboard/documentation/auto-zoom-behavior.md`](../dashboard/documentation/auto-zoom-behavior.md).
- [ ] **`13_zoom/`** — button zoom, pan, double-click auto-zoom-to-neighborhood, fit-to-viewport, programmatic zoom API. Reference: [`dashboard/js/zoomManager.js`](../dashboard/js/zoomManager.js), [`dashboard/js/buttonZoom.js`](../dashboard/js/buttonZoom.js).
- [ ] **`14_status/`** — drive every transition in the `NodeStatus` state machine (UNDETERMINED → READY → UPDATING → UPDATED, plus DELAYED / ERROR / SKIPPED / WARNING / DISABLED branches). Show cascade on / off, auto-collapse-on-status on / off. Reference: [`dashboard/documentation/state.md`](../dashboard/documentation/state.md).
- [ ] **`15_minimap/`** — viewport drag in the minimap, zoom-to-region, styling toggles. Reference: [`dashboard/documentation/minimap.md`](../dashboard/documentation/minimap.md).
- [ ] **`16_overlay/`** — loading overlay + floating-div overlay integration. Reference: [`dashboard/documentation/overlay.md`](../dashboard/documentation/overlay.md). Replaces the broken stub at `11_dashboard/02_click-handlers/`.
- [ ] **`17_prerender/`** — side-by-side: same dataset loaded with and without `*.prerender.json`, with timing displayed. Hard-asserts the existing instrumentation. Reference: [`dashboard/documentation/pre-render.md`](../dashboard/documentation/pre-render.md), [`dashboard/documentation/PRERENDER_USAGE.md`](../dashboard/documentation/PRERENDER_USAGE.md).

### 3.2 Promote `11_dashboard/` to a flagship showcase

- [ ] Build `11_dashboard/01_showcase/showcase.html`: a single page combining every node type, edges, themes (toggleable), minimap, status legend, selection, zoom controls, and one large dataset (`dwh-6.fixed.json`). This is the "evaluator's first impression" page.
- [ ] Use the showcase as the headline target for both visual regression (Phase 2.2) and performance benchmarks (Phase 2.3).
- [ ] Replace the existing thin `11_dashboard/index.html` with a navigator listing the showcase plus the new feature demos.

### 3.3 Modernize `experiments/`

- [ ] Decide each item's future:
  - `40_dwhflow/`, `41_dwhflow/`, `42_dwhflow/` — graduate the latest into a feature demo or archive.
  - `50_network/`, `51_network/` — same treatment.
  - `force/` — same treatment.
- [ ] Move accepted experiments into a numbered demo folder; archive rejected ones into `experiments/archive/` or delete; add a one-line `experiments/README.md` updating its current scope.
- [ ] Migrate any kept experiments off CDN imports onto the local `dashboard/libs/` set, for consistency and offline reliability.

### 3.4 A "load real data" demo

- [ ] Add `18_data-loading/` (or attach to the showcase): demonstrates the real-world pattern of fetching a JSON URL and feeding it into `createAndInitDashboard()`. Uses an actual file from `dashboard/data/` over `fetch()`. This is the closest the demo set gets to what an external consumer will write.

---

## Phase 4 — Documentation surfacing

**Goal:** Anchor everything to `/docs/`. External consumers and new contributors should never feel the docs are "buried."

### 4.1 Repo-level docs

- [ ] **`docs/contributing.md`** — how to add a node type, a demo, a test. Cite specific files and patterns. (Phase 1.2 created the placeholder; this fleshes it out.)
- [ ] **`docs/release.md`** — version-bump policy, dist generation steps, distribution-script usage, how to publish if the project goes to npm.
- [ ] **`docs/testing-strategy.md`** — the canonical strategy doc, written fresh and accurate (replacing the stale [`dashboard/tests/TESTING_STRATEGY.md`](../dashboard/tests/TESTING_STRATEGY.md)). Cover all four pyramid layers including baselines and CI.
- [ ] **`docs/architecture-map.md`** — one-page navigator that links into [`dashboard/documentation/`](../dashboard/documentation/) by topic. The only "table of contents" a new contributor should need.
- [ ] **`docs/demo-philosophy.md`** — codify the conventions (one-feature-per-page, inline static data, register in navigator, share `flowdash-demo.css`).

### 4.2 Cross-link in both directions

- [ ] Add a "See repo-level docs" header to [`dashboard/documentation/README.md`](../dashboard/documentation/README.md) pointing back to `/docs/`.
- [ ] Add per-subsystem cross-links so a reader of `state.md` can jump to the `14_status/` demo, a reader of `minimap.md` can jump to `15_minimap/`, etc.

### 4.3 Fill thin spots in `/dashboard/documentation/`

- [ ] **Themes architecture doc** — there is a [`dashboard/themes/README.md`](../dashboard/themes/README.md) but no "how themes work" deep-dive. Document the CSS-only contract, what variables a theme must define, the naming convention, and how a consumer adds a custom theme without touching JS.
- [ ] **Status system deep-dive** — [`state.md`](../dashboard/documentation/state.md) is light. Expand to cover cascade rules, auto-collapse settings, programmatic transitions.

---

## Out-of-scope (intentional, for now)

- npm publication of the library bundle.
- Framework wrappers (React/Vue/Svelte).
- Mobile-viewport testing.
- Firefox support.
- Migrating PowerShell scripts to cross-platform Node.js / shell equivalents (worth doing eventually, low priority).
- Removing checked-in build artifacts (`dashboard/dist/`, `dashboard/playwright-report/`, `dashboard/test-results/`, `dashboard/performance-results/`) — separate decision.

---

## Suggested execution order

If picked up by a single contributor, a sensible sequence:

1. **Phase 1.2 + 1.3** (a few hours) — fixes broken README links and removes scratch. Immediate readability gain.
2. **Phase 2.1 + 2.5** (a day or two) — Vitest unit layer + GitHub Actions. The two highest-leverage testing investments.
3. **Phase 3.2** (a day) — flagship showcase. Makes the project's polish self-evident.
4. **Phase 2.2 + 2.3** (a couple of days) — visual regression and asserted perf, anchored to the showcase from step 3.
5. **Phase 3.1** (incremental) — one missing-feature demo per session.
6. **Phase 4** (alongside) — documentation grows as features are demoed and tested.

Phase 1.1 (versioning reconciliation) and Phase 1.4 (numbering coherence) can slot in whenever convenient — they're cosmetic but worth doing once the rest is moving.
