// Demo 01 — simple manual fold/expand
//
// One Lane container with three rectangle children. The page exposes
// the dashboard via window.flowdash so the spec can drive collapse /
// expand directly through node.collapsed = true|false.

export const demoData = {
  metadata: {
    name: 'fold-expand-simple',
    description: 'Single Lane with three rects — manual fold/expand',
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
      id: 'lane1',
      label: 'Pipeline',
      type: 'lane',
      code: 'L1',
      state: 'Ready',
      layout: { displayMode: 'full', arrangement: 'default' },
      collapsed: false,
      children: [
        {
          id: 'rect1',
          label: 'Step 1',
          type: 'rect',
          code: 'R1',
          state: 'Ready',
          parentId: 'lane1',
        },
        {
          id: 'rect2',
          label: 'Step 2',
          type: 'rect',
          code: 'R2',
          state: 'Ready',
          parentId: 'lane1',
        },
        {
          id: 'rect3',
          label: 'Step 3',
          type: 'rect',
          code: 'R3',
          state: 'Ready',
          parentId: 'lane1',
        },
      ],
      parentId: null,
    },
  ],

  edges: [],
};
