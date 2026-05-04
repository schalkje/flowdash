# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

This repo is a vanilla-JS / D3.js codebase served as static files. There are **two npm projects**:

- **Root** (`/package.json`) — hosts the Playwright test suite that drives the demo pages and the dashboard via a static HTTP server.
- **Dashboard** (`/dashboard/package.json`) — the production library; webpack-bundled, version-bumped on each `prebuild`, externalises `d3`. This is the actual product.

The numbered top-level folders (`01_basicNodes/` … `11_dashboard/`), `d3_basics/`, and `experiments/` are standalone HTML demos used both for incremental learning and as test fixtures. They are not built — Playwright loads them directly from the static server.

## Common commands

All demos and tests are served from the **repo root** over plain HTTP on port 8000:

```bash
python -m http.server 8000        # serves repo root; required for tests and for browsing demos
```

`run.ps1` is just a one-liner shortcut for the above.

### Tests (Playwright, from repo root)

`playwright.config.cjs` autostarts `python -m http.server 8000` if it isn't already running, and runs against both Chromium and WebKit.

```bash
npm test                                            # full suite
npm run test:adapter | test:foundation | test:lane  # per-node-type subsets
npm run test:single -- "test name fragment"         # run a single test by name (uses --grep)
npm run test:ui                                     # Playwright UI mode (interactive)
npm run test:headed                                 # see the browser
npx playwright test tests/<file>.spec.js            # one spec file
npx playwright test tests/<file>.spec.js --project=chromium   # single browser
```

### Dashboard build (from `/dashboard`)

```bash
cd dashboard
npm install
npm start            # webpack-dev-server with hot reload
npm run build        # production bundle to dashboard/dist/flowdash.min.js (auto-bumps patch version)
npm run build:analyze  # opens webpack-bundle-analyzer on 127.0.0.1:8888
```

`prebuild` runs `npm version patch --no-git-tag-version`, so every `npm run build` increments the version in `dashboard/package.json`. Don't run `build` casually if you don't want a version bump.

### Distribution scripts (PowerShell, optional)

- `scripts/distribute.ps1` — runs the dashboard build, then copies CSS + bundle to a dist root.
- `scripts/copy-flowdash-css.ps1` — copies `dashboard/flowdash.css` and all theme CSS into a dist tree.
- `scripts/validate-dashboard-json.ps1` — JSON schema check on dashboard data files.
- `scripts/add-node-ids.ps1` — adds missing IDs to nodes in dashboard JSON.

## Architecture

The dashboard product lives in `dashboard/js/`. It's a modular ES-module library with a single public entry point: **`dashboard/js/index.js`** re-exports `dashboard.js` and `data.js`, and (in browser contexts) attaches the API to `window.flowDashboard`. Webpack externalises D3 — consumers must provide `d3` globally.

### Core controller

- **`Dashboard`** (`dashboard.js`) is the orchestrator. Construct with a data object, then call init. Use `createAndInitDashboard(data, "#selector")` for the common case.
- Data shape: `{ settings, nodes, edges }`. Settings are deep-merged with defaults via `ConfigManager` — see `dashboard/documentation/settings.md` for the full schema.

### Node system (inheritance hierarchy)

```
BaseNode
├── BaseContainerNode
│   ├── LaneNode         (vertical stack)
│   ├── ColumnsNode      (horizontal row)
│   ├── AdapterNode      (5 arrangements, role-based)
│   ├── FoundationNode   (raw/base, role-based)
│   ├── MartNode         (load/report, role-based)
│   ├── GroupNode        (force-directed bounding box)
│   └── EdgeDemoNode
├── RectangularNode
└── CircleNode
```

Node creation goes through the factory in `node.js`, which dispatches via `nodeRegistry.js`. New node types must register there.

### Zone system

Every container node delegates layout to a `ZoneManager` (`js/zones/`) composed of `ContainerZone` / `HeaderZone` / `MarginZone` (top/right/bottom/left) / `InnerContainerZone`. Children live inside the inner container zone. Each zone has its own coordinate system; do not assume children are positioned in container-local coords — go through the zone API.

### Edges, simulation, interaction

- **Edges** — `edge.js` factory + `edgeBase.js`; path math in `utilPath.js`; arrow markers in `markers.js`.
- **Simulation** — `simulation.js` runs the force layout, with custom forces in `forceBoundary.js` (keep nodes inside parent) and `forceRectCollide.js` (rectangle collision instead of D3's circle default).
- **Interaction managers** — `eventManager.js`, `zoomManager.js` (with `buttonZoom.js`), `geometryManager.js`, `layoutManager.js`, `themeManager.js`, `statusManager.js`, `loadingOverlay.js`, `minimap.js`. Each is single-responsibility and owned by the `Dashboard`.
- **Selection model** — single click selects exclusively; double-click computes a *Selection Neighborhood* (using `settings.selector.incomming`/`outgoing` traversal depths) and zooms to its bounding box. Override via `dashboard.main.root.onClick` / `onDblClick` after init.

### Status system

Defined in `nodeBase.js` as `NodeStatus`: `UNDETERMINED`, `UNKNOWN`, `READY`, `UPDATING`, `DELAYED`, `ERROR`, `UPDATED`, `SKIPPED`, `WARNING`, `DISABLED`. Status changes can cascade and trigger auto-collapse, gated by `settings.toggleCollapseOnStatusChange` and `settings.cascadeOnStatusChange`. See `dashboard/documentation/state.md` for the transition diagram.

### Pre-render fast path

For large dashboards (800+ nodes), `dashboard/prerender/prerender-generator.html` produces a `*.prerender.json` with baked-in positions/sizes/edge paths. On load, if pre-render data exists **and** the settings flag is on, the initial layout pass is skipped. Crucially, pre-render data is **single-use**: it's wiped from memory after the first paint, and all subsequent operations (collapse, expand, relayout) behave identically to a non-pre-rendered dashboard. Don't add code paths that read pre-render data after init.

### Themes

CSS-only themes under `dashboard/themes/<name>/` (brutalism, cyberpunk, dark, flat, glassmorphism, light, neumorphism, retro). Switching is via stylesheet swap; no JS changes needed. `themes.css` is the aggregator.

## Where the docs live

The richest architectural docs are inside `dashboard/documentation/` — they go far beyond this file:

- `implementation.md`, `implementation-nodes.md`, `implementation-edges.md`, `implementation-simulation.md`, `implementation-dashboard.md`, `implementation-utils.md` — per-subsystem deep dives.
- `settings.md` — full settings schema with types, ranges, defaults.
- `zone-system.md` — zone layout architecture.
- `state.md` — node status state machine.
- `pre-render.md`, `PRERENDER_USAGE.md`, `ENHANCED_PRERENDER_SUMMARY.md` — pre-render pipeline.
- `auto-collapse-specification.md`, `auto-zoom-behavior.md`, `overlay.md`, `minimap.md`, `dashboard.md` — feature specs.

Read the relevant doc before changing a subsystem; many constraints (e.g. pre-render single-use, zone coordinate isolation) are easy to violate without realizing.

## Test conventions

- Tests live in `tests/*.spec.js` and load demo HTML via `baseURL: http://localhost:8000` — paths are repo-relative (e.g. `/06_adapterNodes/01_single/01_single.html`, `/dashboard/flowdash-bundle.html`).
- Test data is read from `dashboard/data/*.json`; `tests/test-data-generator.js` builds synthetic fixtures.
- Failure artifacts: screenshots `only-on-failure`, video `retain-on-failure`, trace `on-first-retry`. HTML reporter output goes under `playwright-report/`.
- Tests run `fullyParallel`; on CI, `forbidOnly` is enforced and retries=2.
