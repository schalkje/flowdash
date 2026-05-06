//////////////////////////////////////////////////////////////
//
// Demo: variable-width
// Node Type: columns
// Features:
// Test Status: Not Tested
//

export const demoData = {
  // Demo metadata
  metadata: {
    name: 'variable-width',
    nodeType: 'columns',
    features: ['Variable widths', 'Proportional sizing', 'Flexible layout', 'Width constraints'],
    description: 'Columns with variable and constrained child widths',
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
      id: 'variable-columns',
      label: 'Variable Width Columns',
      type: 'columns',
      // Node-specific properties
      code: 'VAR1',
      status: 'Ready',
      // Layout properties
      layout: {
        displayMode: 'full',
        arrangement: 'variable-width',
        minimumColumnWidth: 80,
      },
      // Children with different width constraints
      children: [
        {
          id: 'narrow-rect',
          label: 'Narrow',
          type: 'rect',
          code: 'NAR',
          status: 'Ready',
          layout: {
            displayMode: 'code',
            arrangement: 'compact',
            maxWidth: 100,
          },
          parentId: 'variable-columns',
        },
        {
          id: 'wide-rect',
          label: 'Wide Content Area',
          type: 'rect',
          code: 'WIDE',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'expanded',
            minWidth: 200,
          },
          parentId: 'variable-columns',
        },
        {
          id: 'flexible-rect',
          label: 'Flexible',
          type: 'rect',
          code: 'FLEX',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'flexible',
          },
          parentId: 'variable-columns',
        },
        {
          id: 'constrained-rect',
          label: 'Constrained Between 120-180',
          type: 'rect',
          code: 'CON',
          status: 'Ready',
          layout: {
            displayMode: 'full',
            arrangement: 'constrained',
            minWidth: 120,
            maxWidth: 180,
          },
          parentId: 'variable-columns',
        },
        {
          id: 'tiny-rect',
          label: 'T',
          type: 'rect',
          code: 'T',
          status: 'Ready',
          layout: {
            displayMode: 'code',
            arrangement: 'minimal',
            maxWidth: 60,
          },
          parentId: 'variable-columns',
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
