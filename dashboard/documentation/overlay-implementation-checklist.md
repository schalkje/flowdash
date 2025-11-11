# Dashboard Loading Overlay — Implementation Checklist

This checklist covers the steps required to update the dashboard loading overlay to meet the functional requirements in `functional overlay-design.md`.

---

## 1. Overlay Instance Management
- [x] Refactor `LoadingOverlay` to a class or factory for per-dashboard instances
- [x] Remove global singleton usage and DOM element reuse (kept legacy compatibility layer)
- [x] Ensure each dashboard manages its own overlay instance

## 2. Overlay Lifecycle & Visibility
- [x] Update `MIN_VISIBLE_MS` to 2000ms (2 seconds)
- [x] Ensure overlay shows only when new dashboardData is loaded, and hides after loading completes

## 3. Progress & Stage Indication
- [x] Ensure `setLoadingStage(stageName)` updates overlay and records timing
- [x] Add `setProgress(progressMessage)` for node/edge progress display
- [x] Display compact stage history (name + duration)
- [x] Maintain animated dots/timer as activity indicators

## 4. Placement & DOM Integration
- [x] Overlay creates its own container within dashboard host element
- [x] Remove support for passing a container to `showLoading()` (container determined from dashboard context)
- [x] Overlay blocks pointer events on dashboard while visible (modal mode)
- [x] Ensure host container has `position: relative` for correct overlay positioning

## 5. Accessibility
- [x] Use `role="status"` and `aria-live="polite"` on overlay
- [x] Update ARIA attributes on stage/message changes
- [x] Use CSS for color contrast and font readability (existing CSS maintained)

## 6. API & Integration
- [x] Update overlay API:
    - [x] `showLoading()`
    - [x] `hideLoading()`
    - [x] `setLoadingStage(stageName)`
    - [x] `setProgress(progressMessage)`
    - [x] `setLoadingMessage(message)`
- [x] Remove/refactor legacy global functions and window bindings (kept for backward compatibility)
- [x] Integrate overlay instance into `Dashboard` class

## 7. Non-Functional & Testing
- [x] Remove inline styles from JS; use CSS classes for visuals (mostly complete, modal behavior uses minimal inline)
- [ ] Write unit tests for overlay creation, visibility timing, stage recording, and accessibility
- [ ] Write integration tests for dashboard load flows with overlay
- [ ] Manual checks for overlay placement, accessibility, and parallel dashboard loads

---

## Implementation Notes (2025-10-12)

**Status:** ~70% Complete  
**Branch:** feature/async

### Completed:
- LoadingOverlay class created with per-dashboard instance support
- Dashboard class integration complete
- MIN_VISIBLE_MS updated to 2000ms
- setProgress() API added
- Modal behavior implemented
- ARIA accessibility attributes
- Legacy compatibility layer

### Remaining Work:
- Clean up duplicate object-style methods in loadingOverlay.js (lines ~540-720)
- Add comprehensive unit and integration tests
- Manual accessibility testing
- Cross-browser verification

### Files Modified:
- `dashboard/js/loadingOverlay.js` (needs cleanup)
- `dashboard/js/dashboard.js` (complete)

See `overlay-implementation-summary.md` for detailed status.

---

**Reference:** See `functional overlay-design.md`, `overlay.md`, `dashboard.js`, and `loadingOverlay.js` for details.
