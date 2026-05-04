# FlowDash — Repository Documentation

This folder hosts **repo-level** documentation: project goals, current-state analysis, and a forward-looking improvement plan. **Library / product** documentation continues to live alongside the code in [`/dashboard/documentation/`](../dashboard/documentation/).

## Contents

### Strategy
| File | Purpose |
|------|---------|
| [`project-goals.md`](./project-goals.md) | What the project is trying to be (library, demos, testing) and supporting goals (themability, performance, discoverability). |
| [`current-state.md`](./current-state.md) | Honest inventory of strengths and gaps, organized by goal. Every claim cites a concrete path or count. |
| [`improvement-plan.md`](./improvement-plan.md) | Phased, prioritized roadmap: hygiene → testing pyramid → demo coverage → documentation surfacing. |

### Practice
| File | Purpose |
|------|---------|
| [`contributing.md`](./contributing.md) | Practical guide: how to add a node type, demo, test, or theme. |
| [`testing-strategy.md`](./testing-strategy.md) | Canonical strategy across unit, integration, e2e, visual regression, and performance. Replaces the older strategy doc. |
| [`demo-philosophy.md`](./demo-philosophy.md) | Conventions every demo should follow — keep the demo set coherent. |
| [`release.md`](./release.md) | Versioning policy, dual-package model, distribution scripts. |
| [`architecture-map.md`](./architecture-map.md) | One-page navigator into the codebase, links into `/dashboard/documentation/`. |

### Reference
| File | Purpose |
|------|---------|
| [`layout-properties.md`](./layout-properties.md) | (Pre-existing) reference notes on layout properties. |

## How this folder relates to `/dashboard/documentation/`

```
/docs/                              repo-level (this folder)
  └─ goals, current state, plan, contributing, release, testing strategy

/dashboard/documentation/           library deep-dives (already excellent)
  ├─ implementation*.md
  ├─ zone-system.md, state.md
  ├─ minimap.md, overlay.md, settings.md
  ├─ pre-render.md, PRERENDER_USAGE.md, PERFORMANCE_IMPLEMENTATION_PLAN.md
  └─ ...
```

When a topic crosses the boundary (e.g. testing strategy mentions internal subsystems), prefer linking from `/docs/` into `/dashboard/documentation/` rather than duplicating prose.

## How to read these docs

- New to the project? Start with [`project-goals.md`](./project-goals.md).
- Onboarding to contribute? Read [`current-state.md`](./current-state.md) for a candid map of what works and what doesn't.
- Planning work or prioritizing tickets? Use [`improvement-plan.md`](./improvement-plan.md).

## Conventions

- Every factual claim about the codebase should reference a path (`dashboard/js/utilPath.js`), a file count (`19 spec files`), or a configuration line. Drift will be obvious; correct in place when it appears.
- Phase numbers in the improvement plan are stable identifiers — when work completes, mark the bullet `✅` rather than renumbering.
- Out-of-date docs are worse than no docs. If a section is no longer accurate, edit it or delete it.
