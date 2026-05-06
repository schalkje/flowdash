//////////////////////////////////////////////////////////////
//
// Demo: basic
// Node Type: node
// Features:
// Test Status: Not Tested
//

export const demoData = {
  // Demo metadata
  metadata: {
    name: 'basic',
    nodeType: 'node',
    features: ['Basic rendering', 'Text display', 'Positioning'],
    description: 'Basic rectangular node with text display',
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
      id: 'node1',
      label: 'node Node',
      type: 'node',
      // Node-specific properties
      code: 'N1',
      status: 'Ready',
      // Layout properties
      layout: {
        displayMode: 'full', // or "role", "code"
        arrangement: 'default', // varies by node type
      },
      // Text configuration
      text: {
        content: 'node Node',
        fontSize: 12,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        textAnchor: 'middle',
        dominantBaseline: 'middle',
        color: '#333333',
        maxLength: null,
      },
      // Child nodes (for container nodes)
      children: [],
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
