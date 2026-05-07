//////////////////////////////////////////////////////////////
//
// Demo: mixed-children
// Node Type: columns
// Features:
// Test Status: Not Tested
//

export const demoData = {
  // Demo metadata
  metadata: {
    name: 'mixed-children',
    nodeType: 'columns',
    features: [
      'Mixed node types',
      'Heterogeneous children',
      'Horizontal layout',
      'Diverse containers',
    ],
    description: 'Columns containing different types of child nodes',
    testStatus: 'Not Tested',
    version: '1.0.0',
  },

  // Dashboard settings
  settings: {
    // Display settings
    showCenterMark: false,
    showGrid: true,
    showGroupLabels: true,
    showGroupTitles: true,

    // Edge settings
    showGhostlines: false,
    curved: false,

    // Node settings
    showConnectionPoints: false,

    // Demo-specific settings
    demoMode: true,
    enableTesting: true,

    // Debug settings
    isDebug: true,

    // Zoom settings
    zoomToRoot: true,
    toggleCollapseOnStatusChange: false,
  },

  // Node definitions
  nodes: [
    {
      id: 'mixed-columns',
      label: 'Mixed Children Columns',
      type: 'columns',
      // Node-specific properties
      code: 'MIX1',
      status: 'Ready',
      // Layout properties
      layout: {
        displayMode: 'full',
        arrangement: 'mixed',
      },
      // Different types of child nodes
      children: [
        {
          id: 'rect-child',
          label: 'Rectangle',
          type: 'rect',
          code: 'RECT',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'default',
          },
          parentId: 'mixed-columns',
        },
        {
          id: 'circle-child',
          label: 'Circle',
          type: 'circle',
          code: 'CIRC',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'default',
          },
          parentId: 'mixed-columns',
        },
        {
          id: 'lane-child',
          label: 'Lane Container',
          type: 'lane',
          code: 'LANE',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'default',
          },
          children: [
            {
              id: 'nested-rect1',
              label: 'Nested 1',
              type: 'rect',
              code: 'N1',
              status: 'Ready',
              layout: {
                displayMode: 'code',
                arrangement: 'compact',
              },
              parentId: 'lane-child',
            },
            {
              id: 'nested-rect2',
              label: 'Nested 2',
              type: 'rect',
              code: 'N2',
              status: 'Ready',
              layout: {
                displayMode: 'code',
                arrangement: 'compact',
              },
              parentId: 'lane-child',
            },
          ],
          parentId: 'mixed-columns',
        },
        {
          id: 'adapter-child',
          label: 'Adapter',
          type: 'adapter',
          code: 'ADPT',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 1,
          },
          parentId: 'mixed-columns',
        },
      ],
      // Parent reference
      parentId: null,
    },
  ],

  // Edge definitions
  edges: [],
};

// Additional demo data exports for different scenarios
export const demoDataWithChildren = {
  // ... similar structure with children
};

export const demoDataComplex = {
  // ... complex scenario
};
