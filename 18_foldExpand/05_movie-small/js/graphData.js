// Demo 05 — small movie
//
// A compact dashboard that the page autoplays as a fold/expand
// sequence. Mirrors the layout of demo 02 but adds an extra branch
// so collapses produce more visible motion.

export const demoData = {
    metadata: {
        name: "fold-expand-movie-small",
        description: "Small dashboard cycled through a fold/expand movie",
        version: "1.0.0"
    },

    settings: {
        showCenterMark: false,
        showGrid: false,
        showGhostlines: false,
        showConnectionPoints: false,
        curved: true,
        zoomToRoot: true,
        toggleCollapseOnStatusChange: false,
        cascadeOnStatusChange: false,
        demoMode: true
    },

    nodes: [
        {
            id: "stage",
            label: "Pipeline",
            type: "columns",
            code: "P",
            state: "Updating",
            collapsed: false,
            children: [
                {
                    id: "ingest",
                    label: "Ingest",
                    type: "lane",
                    code: "ING",
                    state: "Updated",
                    collapsed: false,
                    children: [
                        { id: "i1", label: "API", type: "rect", state: "Updated", parentId: "ingest" },
                        { id: "i2", label: "Files", type: "rect", state: "Updated", parentId: "ingest" },
                        { id: "i3", label: "Stream", type: "rect", state: "Updated", parentId: "ingest" }
                    ],
                    parentId: "stage"
                },
                {
                    id: "process",
                    label: "Process",
                    type: "lane",
                    code: "PRC",
                    state: "Updating",
                    collapsed: false,
                    children: [
                        {
                            id: "process-cols",
                            label: "Workers",
                            type: "columns",
                            state: "Updating",
                            collapsed: false,
                            children: [
                                { id: "p1", label: "Cleanse", type: "rect", state: "Updated", parentId: "process-cols" },
                                { id: "p2", label: "Enrich", type: "rect", state: "Updating", parentId: "process-cols" },
                                { id: "p3", label: "Score", type: "rect", state: "Ready", parentId: "process-cols" }
                            ],
                            parentId: "process"
                        }
                    ],
                    parentId: "stage"
                },
                {
                    id: "publish",
                    label: "Publish",
                    type: "lane",
                    code: "PUB",
                    state: "Ready",
                    collapsed: false,
                    children: [
                        { id: "u1", label: "Warehouse", type: "rect", state: "Ready", parentId: "publish" },
                        { id: "u2", label: "Cache", type: "rect", state: "Ready", parentId: "publish" }
                    ],
                    parentId: "stage"
                }
            ],
            parentId: null
        }
    ],

    edges: [
        { id: "e1", source: "i1", target: "p1", type: "default" },
        { id: "e2", source: "i2", target: "p1", type: "default" },
        { id: "e3", source: "i3", target: "p2", type: "default" },
        { id: "e4", source: "p1", target: "p2", type: "default" },
        { id: "e5", source: "p2", target: "p3", type: "default" },
        { id: "e6", source: "p3", target: "u1", type: "default" },
        { id: "e7", source: "p3", target: "u2", type: "default" }
    ]
};

// Movie steps. Each step lists the nodes that should be collapsed at
// that moment; everything else is expanded. The page cycles through
// the steps in order and loops.
export const movieScript = [
    { name: "All expanded", collapsed: [] },
    { name: "Fold Ingest", collapsed: ["ingest"] },
    { name: "Fold Ingest + Publish", collapsed: ["ingest", "publish"] },
    { name: "Fold Process workers", collapsed: ["process-cols"] },
    { name: "Fold every lane", collapsed: ["ingest", "process", "publish"] },
    { name: "Fold root only", collapsed: ["stage"] },
    { name: "All expanded", collapsed: [] }
];
