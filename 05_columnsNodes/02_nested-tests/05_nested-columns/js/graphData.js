//////////////////////////////////////////////////////////////
//
// Demo: nested-columns
// Node Type: columns
// Features: 
// Test Status: Not Tested
//

export const demoData = {
    // Demo metadata
    metadata: {
        name: "nested-columns",
        nodeType: "columns",
        features: ["Nested containers", "Multi-level layout", "Recursive horizontal layout", "Complex hierarchy"],
        description: "Columns containing other columns nodes for complex layouts",
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
            id: "parent-columns",
            label: "Parent Columns",
            type: "columns",
            // Node-specific properties
            code: "PC1",
            status: "Ready",
            // Layout properties
            layout: {
                displayMode: "full",
                arrangement: "nested"
            },
            // Child columns and rectangles
            children: [
                {
                    id: "left-section",
                    label: "Left Section",
                    type: "columns",
                    code: "LS",
                    status: "Ready",
                    layout: {
                        displayMode: "full",
                        arrangement: "default"
                    },
                    children: [
                        {
                            id: "left-1",
                            label: "L1",
                            type: "rect",
                            code: "L1",
                            status: "Ready",
                            layout: {
                                displayMode: "code",
                                arrangement: "compact"
                            },
                            parentId: "left-section"
                        },
                        {
                            id: "left-2",
                            label: "L2",
                            type: "rect",
                            code: "L2",
                            status: "Ready",
                            layout: {
                                displayMode: "code",
                                arrangement: "compact"
                            },
                            parentId: "left-section"
                        }
                    ],
                    parentId: "parent-columns"
                },
                {
                    id: "middle-rect",
                    label: "Middle Column",
                    type: "rect",
                    code: "MID",
                    status: "Ready",
                    layout: {
                        displayMode: "full",
                        arrangement: "default"
                    },
                    parentId: "parent-columns"
                },
                {
                    id: "right-section",
                    label: "Right Section",
                    type: "columns",
                    code: "RS",
                    status: "Ready",
                    layout: {
                        displayMode: "full",
                        arrangement: "default"
                    },
                    children: [
                        {
                            id: "right-1",
                            label: "R1",
                            type: "rect",
                            code: "R1",
                            status: "Ready",
                            layout: {
                                displayMode: "code",
                                arrangement: "compact"
                            },
                            parentId: "right-section"
                        },
                        {
                            id: "right-2",
                            label: "R2",
                            type: "rect",
                            code: "R2",
                            status: "Ready",
                            layout: {
                                displayMode: "code",
                                arrangement: "compact"
                            },
                            parentId: "right-section"
                        },
                        {
                            id: "right-3",
                            label: "R3",
                            type: "rect",
                            code: "R3",
                            status: "Ready",
                            layout: {
                                displayMode: "code",
                                arrangement: "compact"
                            },
                            parentId: "right-section"
                        }
                    ],
                    parentId: "parent-columns"
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