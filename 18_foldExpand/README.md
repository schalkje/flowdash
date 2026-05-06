# Fold / Expand Demos

A focused set of pages and a Playwright spec covering the **collapse**
(fold) and **expand** behaviour of container nodes.

The demos exercise the same `BaseContainerNode.collapsed` setter that
production code uses — both via the on-node zoom button and via direct
property assignment — and the auto-collapse path driven by status
changes (`toggleCollapseOnStatusChange`).

| #   | Page               | What it covers                                                        |
| --- | ------------------ | --------------------------------------------------------------------- |
| 01  | `01_simple`        | Single container, manual collapse / expand, parent resize             |
| 02  | `02_with-edges`    | Sibling containers + an edge — verifies edge re-routing on collapse   |
| 03  | `03_nested`        | Three levels of nesting — collapse cascade and parent resize          |
| 04  | `04_status-driven` | `toggleCollapseOnStatusChange = true`; mutate status, observe folding |
| 05  | `05_movie-small`   | Autoplay sequence — small dashboard "movie"                           |
| 06  | `06_movie-big`     | Autoplay over the bundled `dwh-tiny` dataset — big dashboard "movie"  |

## Test coverage

`tests/fold-expand.spec.js` runs against these pages and checks:

- Manual collapse shrinks the parent's bounding rectangle.
- Manual expand restores the parent within a tolerance.
- Children are removed from the rendered DOM when the parent is collapsed
  and re-attached on expand.
- An edge between two siblings remains attached and changes its `d`
  attribute when one endpoint collapses.
- Cascade: collapsing a deep root hides every descendant container.
- Status-driven auto-collapse / auto-expand toggles in line with the
  spec in `dashboard/documentation/auto-collapse-specification.md`.
- Movie pages initialise without runtime errors.

## Running

```bash
# Serve from repo root (Playwright autostarts this if missing)
python -m http.server 8000

# All fold/expand tests
npx playwright test tests/fold-expand.spec.js

# Single browser, headed, interactive
npx playwright test tests/fold-expand.spec.js --project=chromium --headed
```

## Manual exploration

Open the demos directly:

- <http://localhost:8000/18_foldExpand/01_simple/simple.html>
- <http://localhost:8000/18_foldExpand/05_movie-small/movie-small.html>
- <http://localhost:8000/18_foldExpand/06_movie-big/movie-big.html>

The movie pages have **Play / Pause / Step / Reset** controls in the
header so they can be paused mid-sequence for inspection or recording.
