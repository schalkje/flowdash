//////////////////////////////////////////////////////////////
//
// Demo: fixed-size-mode
// Node Type: columns
// Features:
// Test Status: Not Tested
//

export const demoData = {
  // Demo metadata
  metadata: {
    name: 'fixed-size-mode',
    nodeType: 'columns',
    features: ['Fixed sizing', 'Uniform children', 'Horizontal layout', 'Consistent width'],
    description: 'Columns with fixed-size children and consistent dimensions',
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
      label: 'Fixed-Size Columns',
      type: 'columns',
      // Node-specific properties
      code: 'FS1',
      status: 'Ready',
      // Layout properties
      layout: {
        displayMode: 'full',
        arrangement: 'fixed-size',
        minimumColumnWidth: 120,
      },
      // Child nodes with consistent sizing
      children: [
        {
          id: 'rect1',
          label: 'Column A',
          type: 'rect',
          code: 'A',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'fixed',
            layoutMode: 'fixed-size',
          },
          width: 120,
          height: 60,
          parentId: 'columns1',
        },
        {
          id: 'rect2',
          label: 'Column B',
          type: 'rect',
          code: 'B',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'fixed',
            layoutMode: 'fixed-size',
          },
          width: 120,
          height: 60,
          parentId: 'columns1',
        },
        {
          id: 'rect3',
          label: 'Column C',
          type: 'rect',
          code: 'C',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'fixed',
            layoutMode: 'fixed-size',
          },
          width: 120,
          height: 60,
          parentId: 'columns1',
        },
        {
          id: 'rect4',
          label: 'Column D',
          type: 'rect',
          code: 'D',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'fixed',
            layoutMode: 'fixed-size',
          },
          width: 120,
          height: 60,
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
