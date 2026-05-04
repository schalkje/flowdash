//////////////////////////////////////////////////////////////
//
// Demo: auto-size-mode
// Node Type: columns
// Features: 
// Test Status: Not Tested
//

export const demoData = {
    // Demo metadata
    metadata: {
        name: "auto-size-mode",
        nodeType: "columns",
        features: ["Auto-sizing", "Variable child sizes", "Horizontal layout", "Adaptive width"],
        description: "Columns with auto-sizing and different child sizes",
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
            label: "Auto-Size Columns",
            type: "columns",
            // Node-specific properties
            code: "AC1",
            status: "Ready",
            // Layout properties
            layout: {
                displayMode: "full",
                arrangement: "auto-size"
            },
            // Child nodes with different sizes
            children: [
                {
                    id: "rect1",
                    label: "Small",
                    type: "rect",
                    code: "SM",
                    status: "Ready",
                    layout: {
                        displayMode: "code",
                        arrangement: "compact",
                        layoutMode: "auto-size"
                    },
                    parentId: "columns1"
                },
                {
                    id: "rect2",
                    label: "Medium Width Column",
                    type: "rect",
                    code: "MD",
                    status: "Ready",
                    layout: {
                        displayMode: "full",
                        arrangement: "default",
                        layoutMode: "auto-size"
                    },
                    parentId: "columns1"
                },
                {
                    id: "rect3",
                    label: "Extra Large Width Column Content",
                    type: "rect",
                    code: "XL",
                    status: "Ready",
                    layout: {
                        displayMode: "full",
                        arrangement: "expanded",
                        layoutMode: "auto-size"
                    },
                    parentId: "columns1"
                },
                {
                    id: "rect4",
                    label: "Tiny",
                    type: "rect",
                    code: "T",
                    status: "Ready",
                    layout: {
                        displayMode: "code",
                        arrangement: "minimal",
                        layoutMode: "auto-size"
                    },
                    parentId: "columns1"
                }
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