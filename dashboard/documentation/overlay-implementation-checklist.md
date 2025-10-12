# Dashboard Loading Overlay — Implementation Checklist

This checklist covers the steps required to update the dashboard loading overlay to meet the functional requirements in `functional overlay-design.md`.

---

## 1. Overlay Instance Management
- [ ] Refactor `LoadingOverlay` to a class or factory for per-dashboard instances
- [ ] Remove global singleton usage and DOM element reuse
- [ ] Ensure each dashboard manages its own overlay instance

## 2. Overlay Lifecycle & Visibility
- [ ] Update `MIN_VISIBLE_MS` to 2000ms (2 seconds)
- [ ] Ensure overlay shows only when new dashboardData is loaded, and hides after loading completes

## 3. Progress & Stage Indication
- [ ] Ensure `setLoadingStage(stageName)` updates overlay and records timing
- [ ] Add `setProgress(progressMessage)` for node/edge progress display
- [ ] Display compact stage history (name + duration)
- [ ] Maintain animated dots/timer as activity indicators

## 4. Placement & DOM Integration
- [ ] Overlay creates its own container within dashboard host element
- [ ] Remove support for passing a container to `showLoading()`
- [ ] Overlay blocks pointer events on dashboard while visible (modal mode)
- [ ] Ensure host container has `position: relative` for correct overlay positioning

## 5. Accessibility
- [ ] Use `role="status"` and `aria-live="polite"` on overlay
- [ ] Update ARIA attributes on stage/message changes
- [ ] Use CSS for color contrast and font readability

## 6. API & Integration
- [ ] Update overlay API:
    - [ ] `showLoading()`
    - [ ] `hideLoading()`
    - [ ] `setLoadingStage(stageName)`
    - [ ] `setProgress(progressMessage)`
    - [ ] `setLoadingMessage(message)`
- [ ] Remove/refactor legacy global functions and window bindings
- [ ] Integrate overlay instance into `Dashboard` class

## 7. Non-Functional & Testing
- [ ] Remove inline styles from JS; use CSS classes for visuals
- [ ] Write unit tests for overlay creation, visibility timing, stage recording, and accessibility
- [ ] Write integration tests for dashboard load flows with overlay
- [ ] Manual checks for overlay placement, accessibility, and parallel dashboard loads

---

**Reference:** See `functional overlay-design.md`, `overlay.md`, `dashboard.js`, and `loadingOverlay.js` for details.
