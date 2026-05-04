//////////////////////////////////////////////////////////////
//
// Demo: basic
// Node Type: columns
// Features: Basic horizontal layout, 3 rectangles
// Test Status: Not Tested
//

export const demoData = {
    // Demo metadata
    metadata: {
        name: "basic",
        nodeType: "columns",
        features: ["Horizontal layout", "Child alignment", "Auto-sizing", "3 rectangles"],
        description: "Basic columns layout with horizontal child alignment",
        testStatus: "Not Tested",
        version: "1.0.0"
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
        toggleCollapseOnStatusChange: false
    },
    
    // Node definitions
    nodes: [
        {
            id: "columns1",
            label: "Process Columns",
            type: "columns",
            // Node-specific properties
            code: "C1",
            status: "Ready",
            // Layout properties
            layout: {
                displayMode: "full",
                arrangement: "default"
            },
            // Child nodes (for container nodes)
            children: [
            ],
            // Parent reference
            parentId: null
        }
    ],
    
    // Edge definitions
    edges: []
};

// Additional demo data exports for different scenarios
export const demoDataWithChildren = {
    // ... similar structure with children
};

export const demoDataComplex = {
    // ... complex scenario
};