# Loading Overlay — Design & Implementation

This document analyzes the current overlay implementation (see `dashboard/js/loadingOverlay.js`) and how the dashboard uses it (references in `dashboard/js/dashboard.js`). It defines the design contract, UX expectations, lifecycle, integration points, and recommended improvements for the overlay used to display dashboard loading state.

## Goal

- Provide a lightweight, robust loading overlay that shows progress and stages when a dashboard file is being loaded, parsed, and rendered.
- Give users a clear, accessible visual indication that work is happening and an estimate of progress/stages.
- Avoid showing the overlay for trivial quick operations; prefer delayed-show to reduce flicker.

## Quick summary of the current implementation

- Location: `dashboard/js/loadingOverlay.js`.
- Public functions:
  - `showLoading(containerOrSelector = null)` — create/attach and show the overlay.
  - `hideLoading()` — hide the overlay; enforces a minimum visible time.
  - `setLoadingStage(stageName)` — record stage transitions and durations.
  - `setLoadingMessage(message)` — update the main message text.
  - `resolveLoadingContainer(svgSelection)` — helper to choose a host element (prefers `#graph-container`, then SVG parent, then `document.body`).

- Structure: a DIV with id `flowdash-loading` containing elements for text, animated dots, a timer, and a stage history area.
- Accessibility: container uses `role="status"` and `aria-live="polite"`.
- Timing: timer updates every 100ms; dots animate at a ~450ms interval; `MIN_VISIBLE_MS = 350`ms prevents flicker.

## Integration in the dashboard

Typical sequence during heavy operations:

1. `showLoading(container)`
2. `setLoadingStage('loading file')` / `setLoadingMessage('Parsing...')`
3. other `setLoadingStage(...)` calls for milestones (layout, minimap, rendering)
4. `hideLoading()` when finished

Dashboard code also collects `performanceMetrics`; overlay stage timings are useful to correlate with those metrics.

## Design contract

Inputs:

- Optional container (element or selector) to host the overlay.
- Stage names and short messages (strings).

Outputs:

- DOM updates (creation or movement of `#flowdash-loading`).
- In-memory stage history and timing data.

Error modes / fallbacks:

- Invalid or missing container → fall back to `document.body`.
- Multiple dashboards on the same page → current code reuses a single global overlay; placement may move it between hosts.

## States & lifecycle

- ensure/create: overlay is lazily created on first show.
- visible: showing starts dots and timers, records shownAt timestamp.
- stage changes: previous stage recorded with duration; UI updated.
- hide: enforces `MIN_VISIBLE_MS`, clears timers, finalizes stage history.

## UX & accessibility notes

- Keep messages short and stage-like (e.g., "loading file", "parsing", "rendering").
- Timer and animated dots indicate ongoing work; stage history shows completed steps.
- Use CSS for visuals and ensure color contrast.
- `role="status"` + `aria-live="polite"` to make announcements non-intrusive.

## DOM placement rules

1. If caller provides a container, use it.
2. Else prefer `#graph-container`.
3. If given an SVG selection, prefer the SVG's parent element.
4. Use `.zoom-overlay-host` inside resolved host if present.
5. Otherwise append to `document.body`.

If the host has `position: static`, the overlay code may set `position: relative` to allow absolute positioning; prefer documenting explicit CSS on pages hosting the dashboard.

## Public API / recommended usage

Pseudocode:

1. `showLoading(container)`
2. `setLoadingStage('loading file')`
3. // fetch / parse
4. `setLoadingStage('layout')`
5. `setLoadingMessage('Rendering nodes...')`
6. `hideLoading()`

Notes: avoid using `showLoading()` for extremely short operations; use `delayedShow(ms)` (suggested improvement) to avoid flicker.

## Tests and validation

Automated tests:

- Unit: ensure element created and attributes set (`id`, `role`, `aria-live`).
- Unit: show/hide enforces `MIN_VISIBLE_MS` (mock timers).
- Integration: simulate dashboard load flow and assert stages recorded and overlay lifecycle.

Manual checks:

- Verify overlay placement with custom container.
- Confirm screen reader announces stage changes (polite).

## Edge cases and recommendations

- Support per-dashboard overlay instances so parallel loads don't conflict.
- Add `delayedShow(ms)` or similar to avoid showing for very short ops.
- Add optional `modal` mode to block pointer events when interaction must be prevented.
- Expose `getStageHistory()` for telemetry and tests; provide a way to merge with `dashboard.performanceMetrics`.

## Implementation notes for contributors

- Keep `flowdash-loading` id for backward compatibility.
- Avoid inline styles in JS; prefer CSS classes.
- If introducing per-dashboard instances, attach to the dashboard object and keep global overlay as fallback.

## Tests / QA checklist

- [ ] Unit: overlay element creation and attributes.
- [ ] Unit: timers and minimum-visible-time enforcement.
- [ ] Integration: full load flow with stage recording.
- [ ] Accessibility: screen reader announces updates.
- [ ] Manual: custom container placement.

---

Document last updated: 2025-10-12

