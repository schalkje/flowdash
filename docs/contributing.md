# Contributing to FlowDash

This is the practical guide for changing things in this repo. For project goals and the broader roadmap see [`project-goals.md`](./project-goals.md) and [`improvement-plan.md`](./improvement-plan.md).

## Repo orientation in 60 seconds

```
/dashboard/                 # the library — webpack-bundled, externalises D3
  /js/                      # 31 ES-module files (managers, nodes, zones, utils)
  /js/index.js              # public entry point
  /tests-unit/              # Vitest unit tests (fast, pure)
  /documentation/           # subsystem deep-dives (~24 markdowns)
  /themes/                  # CSS-only themes
  package.json              # versioned, prebuild auto-bumps patch

/01_basicNodes/ … /11_dashboard/   # demo HTML pages, by feature scope
/d3_basics/                  # bottom-up D3 lessons (educational)
/experiments/                # WIP ideas, may inspire features

/tests/                     # canonical Playwright suite (run via `npm test`)
/tests/_scratch/             # exploratory specs, ignored by Playwright
/tests/helpers/              # shared test utilities (waitForFlowdashReady)
/tests/visual-regression.spec.js
/tests/performance.spec.js

/docs/                      # repo-level docs (this folder)
/.github/workflows/         # CI (Vitest + Playwright matrix)
```

## Local setup

```bash
# Library deps (Vitest, webpack)
cd dashboard
npm install
cd ..

# Test harness deps (Playwright)
npm install

# Static demo server — required for tests and for browsing demos
python -m http.server 8000
```

`run.ps1` is a one-liner shortcut for the Python server.

## How do I…

### Add a new node type

1. Create the class under `/dashboard/js/nodeYourType.js`. Extend `BaseNode`, `BaseContainerNode`, `RectangularNode`, or `CircleNode` as appropriate. See [`/dashboard/documentation/implementation-nodes.md`](../dashboard/documentation/implementation-nodes.md).
2. Register it in `/dashboard/js/nodeRegistry.js` via `registerNodeType('your-type', YourTypeNode)`.
3. If it's a container, add `'your-type'` to the `containerNodeTypes` list in `nodeRegistry.js` so the right constructor signature is used.
4. Add a unit test under `/dashboard/tests-unit/` for any pure helper logic you wrote.
5. Add a demo:
   - Create a numbered folder (next available, e.g. `12_yourType/`) following the existing demo conventions (see [`demo-philosophy.md`](./demo-philosophy.md)).
   - Register it in [`/index.html`](../index.html) via `generateIndex.ps1` (Windows) or by hand-editing the sidebar markup.
6. Add a Playwright spec under `/tests/your-type-nodes.spec.js`. Use `gotoAndReady` from [`/tests/helpers/ready.js`](../tests/helpers/ready.js).
7. Mention the type in [`/dashboard/documentation/implementation-nodes.md`](../dashboard/documentation/implementation-nodes.md).

### Add a demo page

1. Pick the smallest scope it belongs to — feature-isolated demos go under their feature folder (e.g. `12_selection/01_basic/`).
2. Use `dashboard/flowdash-demo.css` for the header/control/footer chrome.
3. Inline the data — `js/graphData.js` next to the HTML is the convention. No `fetch()` for fixture data; demos must work file://-style.
4. Open the page in the browser via `http://localhost:8000/<your-path>` to verify it renders.
5. Register in [`/index.html`](../index.html).
6. Document the demo's purpose in a sibling `README.md` if it's non-trivial.

### Add a test

The right layer depends on what you're asserting:

| Asserting                                  | Layer                    | File                                                     |
| ------------------------------------------ | ------------------------ | -------------------------------------------------------- |
| Pure function correctness                  | Unit (Vitest)            | `dashboard/tests-unit/<module>.test.js`                  |
| A demo or dashboard page renders correctly | Integration (Playwright) | `tests/<feature>.spec.js`                                |
| A user-flow across the full dashboard      | E2E (Playwright)         | `tests/dashboard.spec.js` or `tests/integration.spec.js` |
| Visual fidelity (subtle rendering bugs)    | Visual regression        | extend `TARGETS` in `tests/visual-regression.spec.js`    |
| Performance regression                     | Perf                     | extend `tests/perf-baselines.json`                       |

For Playwright specs, **use the readiness helper** rather than `waitForTimeout`:

```js
import { gotoAndReady } from './helpers/ready.js';

test.beforeEach(async ({ page }) => {
  await gotoAndReady(page, '/dashboard/flowdash-js.html');
});
```

See [`testing-strategy.md`](./testing-strategy.md) for the full discipline.

### Bump the library version

Don't — the `prebuild` hook does it for you on every successful `npm run build` from `/dashboard/`. See [`release.md`](./release.md) for the policy.

### Add a theme

Themes are CSS-only. Add a folder `/dashboard/themes/<your-theme>/` with the same file layout as the existing themes. The theme manager swaps stylesheets at runtime; no JS changes needed. Document the theme in `/dashboard/themes/themes.md`.

## Conventions

- **No comments unless they explain a non-obvious WHY** — per the project's coding style. Don't write running commentary on what the code does.
- **No premature abstractions** — three similar lines is fine. Wait for the real generalization.
- **No new files unless asked** — prefer editing existing files. If you must create one, place it where similar files already live.
- **Run tests before raising a PR** — at minimum `npm run test:unit` and `npm test`. Visual + perf will run in CI.
- **CI must be green** — fix it on your branch, don't merge red.

## When to ask before doing

Some changes touch shared state. Ask before:

- Renaming or deleting any of the numbered demo folders (`01_*` … `11_*`) — they are referenced by tests, the navigator, and external bookmarks.
- Bumping a major version of the library.
- Removing or repurposing a theme.
- Force-pushing or rewriting history on `main`.
- Restructuring `/dashboard/documentation/` — readers and external links may rely on the existing paths.

## Where to file issues

Use the GitHub issue tracker on the upstream repo. For triage, please include:

- Browser + OS
- The exact demo path or test command
- A minimal repro JSON if it's a data-shape issue
- Performance regressions: paste the `performanceMetrics` console table
