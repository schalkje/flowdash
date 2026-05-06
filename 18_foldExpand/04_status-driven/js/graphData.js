// Demo 04 — status-driven auto-collapse
//
// With toggleCollapseOnStatusChange = true a container's collapsed
// state follows the statuses of its leaf children (see
// dashboard/documentation/auto-collapse-specification.md and
// StatusManager.shouldContainerCollapse):
//
//   - all leaves share a single status (any of them) → collapse
//   - leaves are a mix of only SKIPPED / UPDATED → collapse
//   - mixed otherwise → expand
//
// The page exposes buttons that flip individual leaf statuses so the
// lane container can be observed reacting to its children.

export const demoData = {
  metadata: {
    name: 'fold-expand-status-driven',
    description: 'Auto-collapse driven by leaf node status changes',
    version: '1.0.0',
  },

  settings: {
    showCenterMark: false,
    showGrid: false,
    showGhostlines: false,
    showConnectionPoints: false,
    zoomToRoot: true,
    toggleCollapseOnStatusChange: true,
    cascadeOnStatusChange: false,
    demoMode: true,
  },

  nodes: [
    {
      id: 'root',
      label: 'Run',
      type: 'columns',
      code: 'RUN',
      // Field name is `state` (see nodeBase.js — initial status reads
      // from nodeData.state, not nodeData.status)
      state: 'Updating',
      collapsed: false,
      children: [
        {
          // Two leaves with the *same* status → starts collapsed.
          id: 'ok-lane',
          label: 'OK Lane',
          type: 'lane',
          code: 'OK',
          state: 'Ready',
          collapsed: false,
          children: [
            {
              id: 'ok1',
              label: 'OK Step 1',
              type: 'rect',
              code: 'OK1',
              state: 'Ready',
              parentId: 'ok-lane',
            },
            {
              id: 'ok2',
              label: 'OK Step 2',
              type: 'rect',
              code: 'OK2',
              state: 'Ready',
              parentId: 'ok-lane',
            },
          ],
          parentId: 'root',
        },
        {
          // Mixed leaf statuses → starts expanded.
          id: 'bad-lane',
          label: 'Problem Lane',
          type: 'lane',
          code: 'BAD',
          state: 'Error',
          collapsed: false,
          children: [
            {
              id: 'bad1',
              label: 'Failing Step',
              type: 'rect',
              code: 'BD1',
              state: 'Error',
              parentId: 'bad-lane',
            },
            {
              id: 'bad2',
              label: 'Healthy Step',
              type: 'rect',
              code: 'BD2',
              state: 'Ready',
              parentId: 'bad-lane',
            },
          ],
          parentId: 'root',
        },
      ],
      parentId: null,
    },
  ],

  edges: [],
};
