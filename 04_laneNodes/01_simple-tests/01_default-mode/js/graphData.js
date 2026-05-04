//////////////////////////////////////////////////////////////
//
// Demo: default-mode
// Node Type: lane
// Features: Default mode with 3 rectangles
// Test Status: Not Tested
//

export const demoData = {
    // Demo metadata
    metadata: {
        name: "default-mode",
        nodeType: "lane",
        features: ["Default mode", "3 rectangles", "Vertical stacking", "Horizontal centering"],
        description: "Lane with 3 rectangles in default mode",
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
            id: "lane1",
            label: "Process Lane",
            type: "lane",
            // Node-specific properties
            code: "L1",
            status: "Ready",
            // Layout properties
            layout: {
                displayMode: "full",
                arrangement: "default"
            },
            // Child nodes (for container nodes)
            children: [
                {
                    id: "rect1",
                    label: "Step 1",
                    type: "rect",
                    code: "R1",
                    status: "Ready",
                    layout: {
                        displayMode: "full",
                        arrangement: "default"
                    },
                    parentId: "lane1"
                },
                {
                    id: "rect2",
                    label: "Step 2",
                    type: "rect",
                    code: "R2",
                    status: "Ready",
                    layout: {
                        displayMode: "full",
                        arrangement: "default"
                    },
                    parentId: "lane1"
                },
                {
                    id: "rect3",
                    label: "Step 3",
                    type: "rect",
                    code: "R3",
                    status: "Ready",
                    layout: {
                        displayMode: "full",
                        arrangement: "default"
                    },
                    parentId: "lane1"
                }
            ],
            // Parent reference
            parentId: null
        }
    ],
    
    // Edge definitions
    edges: []
};
