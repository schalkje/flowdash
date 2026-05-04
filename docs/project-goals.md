# Project Goals

FlowDash visualizes data-flow processes (ETL pipelines, data lineage, warehouse schemas) as interactive D3 dashboards. The repository serves three distinct, interlocking purposes.

## Primary goals

### 1. A reusable D3-based dashboard library

The product lives under [`/dashboard/`](../dashboard/). It is intended to be **embedded by external applications**, not just demoed in this repo.

What that means in practice:

- A single, stable public API. Today: [`dashboard/js/index.js`](../dashboard/js/index.js) re-exports `Dashboard`, `data` helpers, and attaches `window.flowDashboard` in browsers.
- A predictable, versioned bundle. Today: webpack produces [`dashboard/dist/flowdash.min.js`](../dashboard/dist/) with D3 externalised; `prebuild` auto-bumps the patch version in [`dashboard/package.json`](../dashboard/package.json).
- A documented data contract. Today: `{ settings, nodes, edges }` with a deep-merged settings schema specified in [`dashboard/documentation/settings.md`](../dashboard/documentation/settings.md).
- Themability without consumer code changes. Today: 8 CSS-only themes under [`dashboard/themes/`](../dashboard/themes/).
- Distribution that an external app can rely on. Today: PowerShell scripts in [`/scripts/`](../scripts/) for CSS + bundle distribution; a standalone [`dashboard/flowdash-bundle.html`](../dashboard/flowdash-bundle.html) for "drop-in" use.

### 2. Interactive demos of every functionality

The numbered top-level folders (`01_basicNodes/` … `11_dashboard/`), [`d3_basics/`](../d3_basics/), and [`experiments/`](../experiments/) exist to **demonstrate the library** at every level of granularity, with **static demo data** so each demo is reproducible and self-contained.

The demo philosophy:

- **One feature per page** at the small end (a single node type, a single edge variant, a single layout mode). This is what a developer evaluating the library wants to see first.
- **Composed scenarios** at the large end (`11_dashboard/`) — combine many features into a realistic dashboard.
- **Static, inline data** wherever possible, so demos load without backend services and remain stable under git.
- **Searchable, navigable from a single entry point**: the root-level [`index.html`](../index.html) provides a sidebar navigator. New demos must register there (currently via [`generateIndex.ps1`](../generateIndex.ps1)).
- **Demos are also fixtures**: the Playwright suite drives the same HTML pages a human would browse to. This keeps demos honest — if a demo breaks, a test breaks.

### 3. Comprehensive automated testing

The project should ship with **all four layers of the testing pyramid**:

| Layer | What it asserts | Why we need it |
|-------|----------------|----------------|
| **Unit tests** | Pure-function correctness (path math, geometry, force calculations, settings merge, registry dispatch, status transitions). | Fast feedback, low flakiness, exhaustive edge-case coverage that's impractical at higher levels. |
| **Integration / component tests** | A node renders correctly in a real browser. A container collapses and reflows. | Catches integration mistakes between modules and DOM. |
| **End-to-end tests** | A full dashboard loads a JSON fixture, the user clicks, selects, zooms, swaps themes, and the system stays consistent. | Mirrors how external consumers will use the library. |
| **Visual regression** | Pixel/screenshot diffs on canonical demos and themes. | Catches subtle rendering bugs (spacing, stroke, color) that DOM assertions miss. |
| **Performance benchmarks** | Init / collapse / relayout times on representative datasets, with and without pre-render. | Guards the 800+-node pre-render fast path and prevents silent regressions. |

E2E and component testing are mature today; the rest are aspirations the [`improvement-plan.md`](./improvement-plan.md) addresses.

## Supporting goals

### Discoverability

- A repo-root [`index.html`](../index.html) lists every demo with a description.
- A `/docs/` folder (this one) summarizes goals, state, and roadmap at the repo level.
- A consistent demo header/footer style via [`dashboard/flowdash-demo.css`](../dashboard/flowdash-demo.css).

### Themability

- Themes are CSS-only. Switching themes is a stylesheet swap, never a code change.
- A theme grid (`01_basicNodes/03_states/themes-grid*.html`) shows every theme side-by-side.

### Performance at scale

- A pre-render pipeline ([`dashboard/prerender/`](../dashboard/prerender/)) bakes positions/sizes/edge paths for 800+ node dashboards into `*.prerender.json` files.
- Built-in performance instrumentation logs phase timings to the console on every load (see [`dashboard/tests/PERFORMANCE_INSTRUMENTATION.md`](../dashboard/tests/PERFORMANCE_INSTRUMENTATION.md)).

### Educational on-ramp

- [`d3_basics/`](../d3_basics/) provides bottom-up D3 lessons.
- [`experiments/`](../experiments/) is a labeled scratchpad for ideas that may become features.
- The numbered demo progression (basic → composed) doubles as a learning path.

## Non-goals (today)

These have been considered and intentionally deferred. They may move into goals later, but should not creep in unannounced:

- **Server-side rendering / SSR.** FlowDash is a client-side library.
- **Mobile-first interaction.** Desktop is the primary target; mobile viewports may work but aren't a tested matrix.
- **Built-in data fetching.** Consumers fetch their own JSON; the library accepts data, it doesn't load it.
- **Framework adapters (React/Vue/Svelte wrappers).** Consumers wrap the vanilla API as needed.
- **Firefox support** — explicitly excluded from the test matrix per project policy ([`dashboard/tests/TESTING_STRATEGY.md`](../dashboard/tests/TESTING_STRATEGY.md)).

## What "done" looks like for each goal

| Goal | Done means |
|------|-----------|
| Library | An external app can `<script src=".../flowdash.min.js">`, drop in a JSON, and get a working dashboard. Versioning is predictable. Breaking changes are rare and announced. |
| Demos | Every public feature has at least one dedicated demo page, listed in the root navigator. The flagship `11_dashboard/` showcase composes them all. |
| Testing | A green CI run gives high confidence that a release is safe to ship: unit + integration + e2e + visual + perf, all enforced. |
