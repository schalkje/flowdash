# Functional Requirements — Overlay Loading Design

Document last updated: 2025-10-12

## Purpose

Define the functional requirements and user-facing design for the dashboard loading overlay. This document extracts the requirements and functional design from the implementation analysis, focusing on user experience and expected behavior.

---

## 1. User Stories & Goals

- As a user, I want a clear indication when a dashboard is loading, parsing, or rendering, so I know the application is working and not frozen.
- As a user, I want to see progress or stage information during long operations, so I understand what is happening.
- As a user, I want to see progress when initializing nodes as current number / total number; when applicable
- As a user, I want the overlay to disappear promptly when loading is complete, so I can interact with the dashboard without delay; although the overlay should be visible for a minimum of 2 seconds even when loading takes less time
- As a user, I want the overlay to be accessible, so screen readers announce status changes.
- As a user, I do not want overlays to flicker or appear for trivial, fast operations.
- As a user, I do not want overlays to appear for status changes, or when the user interacts with the dashboard

---

## 2. Functional Requirements

### 2.1 Overlay Visibility & Lifecycle

- The overlay must appear when a dashboard file is being loaded, parsed, or rendered fully.
- The overlay must remain hidden at all other times.
- The overlay must enforce a minimum visible time (e.g., 2 seconds) to prevent flicker.
- The overlay must hide automatically when loading is complete.
- The overlay must start showing before loading commences

### 2.2 Progress & Stage Indication

- The overlay must display a short, descriptive message indicating the current stage (e.g., "Loading file", "Parsing", "Rendering nodes").
- The overlay must allow updating the stage/message as loading progresses.
- The overlay must show animated dots or a timer to indicate ongoing activity directly after the text
- The overlay must show current node/edge number / total number; when applicable for the stage
- The overlay must optionally display a compact history of completed stages and their durations.

### 2.3 Placement & DOM Integration

- The overlay must be attached to a suitable container that is created when necessary and deleted again when finished
- Each dashboard on a page has its own overlay container
- The overlay must block user events on the dashboards
- The overlay must ensure correct positioning (set `position: relative` on host if needed).
- The overlay does not support a provided container

### 2.4 Accessibility

- The overlay must use `role="status"` and `aria-live="polite"` for status announcements.
- The overlay must be readable by screen readers and update announcements on stage/message changes.
- The overlay must use sufficient color contrast and readable fonts (via CSS).

### 2.5 API & Integration

- The overlay must provide functions for:
  - Showing the overlay (`showLoading(containerOrSelector)`)
  - Hiding the overlay (`hideLoading()`)
  - Updating the stage (`setLoadingStage(stageName)`)
  - Updating the progress (`setProgress(progressMessage)`)
  - Updating the message (`setLoadingMessage(message)`)
- The overlay should support per-dashboard instances for parallel loads.

---

## 3. Non-Functional Requirements

- Overlay must be lightweight and not impact dashboard performance.
- Overlay must avoid inline styles in JS; use CSS classes for theming.
- Overlay must be compatible with multiple dashboards on the same page.
- Overlay must be testable via unit and integration tests.
- Overlay must update asynchonous, in a separate thread of the loading process itself

---

## 4. Acceptance Criteria

- Overlay appears only during dashboard load/parse/render operations.
- Overlay displays current stage/message and updates as progress occurs.
- Overlay hides promptly when loading is complete.
- Overlay does not flicker for fast operations.
- Overlay updates and is animated during initialization and rendering.
- Overlay is accessible and announces status changes.
- Overlay is correctly positioned and does not block interaction unless modal mode is enabled.
- Overlay API functions are available and work as described.

---

## 6. References

- See implementation: `dashboard/js/loadingOverlay.js`
- See integration: `dashboard/js/dashboard.js`
- See old/current design analysis: `overlay.md`

---

Document last updated: 2025-10-12
