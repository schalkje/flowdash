//////////////////////////////////////////////////////////////
//
// Demo: dynamic-addition
// Node Type: columns
// Features:
// Test Status: Not Tested
//

export const demoData = {
  // Demo metadata
  metadata: {
    name: 'dynamic-addition',
    nodeType: 'columns',
    features: ['Dynamic adding', 'Runtime updates', 'Horizontal layout', 'Responsive sizing'],
    description: 'Columns with dynamically added children and responsive layout',
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
      label: 'Dynamic Columns',
      type: 'columns',
      // Node-specific properties
      code: 'DYN1',
      status: 'Ready',
      // Layout properties
      layout: {
        displayMode: 'full',
        arrangement: 'dynamic',
      },
      // Starting with 2 children, more can be added dynamically
      children: [
        {
          id: 'rect1',
          label: 'Initial 1',
          type: 'rect',
          code: 'I1',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'default',
          },
          parentId: 'columns1',
        },
        {
          id: 'rect2',
          label: 'Initial 2',
          type: 'rect',
          code: 'I2',
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

// Additional demo data for dynamic scenarios
export const demoDataWithMoreChildren = {
  ...demoData,
  metadata: {
    ...demoData.metadata,
    description: 'Columns with more children added dynamically',
  },
  nodes: [
    {
      ...demoData.nodes[0],
      children: [
        ...demoData.nodes[0].children,
        {
          id: 'rect3',
          label: 'Added 3',
          type: 'rect',
          code: 'A3',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'default',
          },
          parentId: 'columns1',
        },
        {
          id: 'rect4',
          label: 'Added 4',
          type: 'rect',
          code: 'A4',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'default',
          },
          parentId: 'columns1',
        },
        {
          id: 'rect5',
          label: 'Added 5',
          type: 'rect',
          code: 'A5',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'default',
          },
          parentId: 'columns1',
        },
      ],
    },
  ],
};

// Additional demo data exports for different scenarios
export const demoDataWithChildren = {
  // ... similar structure with children
};

export const demoDataComplex = {
  // ... complex scenario
};
