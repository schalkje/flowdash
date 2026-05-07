// Demo 03 — fold/expand with deep nesting
//
// 4 levels deep:
//   root (columns)
//     -> wing-a (lane)
//        -> wing-a-cols (columns)
//           -> rect-a1, rect-a2
//     -> wing-b (lane)
//        -> wing-b-cols (columns)
//           -> rect-b1, rect-b2
//
// Collapsing root should hide every descendant container.
// Collapsing one wing should keep the other wing fully visible
// while shrinking the parent columns.

export const demoData = {
  metadata: {
    name: 'fold-expand-nested',
    description: 'Deep nesting cascade — fold subtrees and verify parent resize',
    version: '1.0.0',
  },

  settings: {
    showCenterMark: false,
    showGrid: false,
    showGhostlines: false,
    showConnectionPoints: false,
    zoomToRoot: true,
    toggleCollapseOnStatusChange: false,
    cascadeOnStatusChange: false,
    demoMode: true,
  },

  nodes: [
    {
      id: 'root',
      label: 'Org',
      type: 'columns',
      code: 'ORG',
      state: 'Ready',
      collapsed: false,
      children: [
        {
          id: 'wing-a',
          label: 'Wing A',
          type: 'lane',
          code: 'WA',
          state: 'Ready',
          collapsed: false,
          children: [
            {
              id: 'wing-a-cols',
              label: 'A · Tasks',
              type: 'columns',
              code: 'WA-T',
              state: 'Ready',
              collapsed: false,
              children: [
                {
                  id: 'rect-a1',
                  label: 'A · 1',
                  type: 'rect',
                  code: 'A1',
                  state: 'Ready',
                  parentId: 'wing-a-cols',
                },
                {
                  id: 'rect-a2',
                  label: 'A · 2',
                  type: 'rect',
                  code: 'A2',
                  state: 'Ready',
                  parentId: 'wing-a-cols',
                },
              ],
              parentId: 'wing-a',
            },
          ],
          parentId: 'root',
        },
        {
          id: 'wing-b',
          label: 'Wing B',
          type: 'lane',
          code: 'WB',
          state: 'Ready',
          collapsed: false,
          children: [
            {
              id: 'wing-b-cols',
              label: 'B · Tasks',
              type: 'columns',
              code: 'WB-T',
              state: 'Ready',
              collapsed: false,
              children: [
                {
                  id: 'rect-b1',
                  label: 'B · 1',
                  type: 'rect',
                  code: 'B1',
                  state: 'Ready',
                  parentId: 'wing-b-cols',
                },
                {
                  id: 'rect-b2',
                  label: 'B · 2',
                  type: 'rect',
                  code: 'B2',
                  state: 'Ready',
                  parentId: 'wing-b-cols',
                },
              ],
              parentId: 'wing-b',
            },
          ],
          parentId: 'root',
        },
      ],
      parentId: null,
    },
  ],

  edges: [
    { id: 'e1', source: 'rect-a1', target: 'rect-a2', type: 'default' },
    { id: 'e2', source: 'rect-b1', target: 'rect-b2', type: 'default' },
  ],
};
