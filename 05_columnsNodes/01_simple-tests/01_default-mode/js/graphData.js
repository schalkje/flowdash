//////////////////////////////////////////////////////////////
//
// Demo: default-mode
// Node Type: columns
// Features:
// Test Status: Not Tested
//

export const demoData = {
  // Demo metadata
  metadata: {
    name: 'default-mode',
    nodeType: 'columns',
    features: ['Default mode', '3 rectangles', 'Horizontal layout', 'Vertical centering'],
    description: 'Columns with 3 rectangles in default mode',
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
      id: 'columns1',
      label: 'Process Columns',
      type: 'columns',
      // Node-specific properties
      code: 'C1',
      status: 'Ready',
      // Layout properties
      layout: {
        displayMode: 'full',
        arrangement: 'default',
      },
      // Child nodes (for container nodes)
      children: [
        {
          id: 'rect1',
          label: 'Column 1',
          type: 'rect',
          code: 'C1',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'default',
          },
          parentId: 'columns1',
        },
        {
          id: 'rect2',
          label: 'Column 2',
          type: 'rect',
          code: 'C2',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'default',
          },
          parentId: 'columns1',
        },
        {
          id: 'rect3',
          label: 'Column 3',
          type: 'rect',
          code: 'C3',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'default',
          },
          parentId: 'columns1',
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
