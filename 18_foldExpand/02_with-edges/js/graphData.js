// Demo 02 — fold/expand with edges
//
// A Columns container holds three Lane siblings (Source / Transform /
// Sink). An edge connects a leaf rect in Source -> a leaf rect in
// Transform -> a leaf rect in Sink. Collapsing the middle lane forces
// the edges to re-route to the lane's collapsed bounding box.

export const demoData = {
    metadata: {
        name: "fold-expand-with-edges",
        description: "Sibling lanes connected by edges — verify edge re-routing on collapse",
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
            id: "root",
            label: "Pipeline",
            type: "columns",
            code: "P",
            state: "Ready",
            layout: { displayMode: "full", arrangement: "default" },
            collapsed: false,
            children: [
                {
                    id: "source",
                    label: "Source",
                    type: "lane",
                    code: "SRC",
                    state: "Ready",
                    collapsed: false,
                    children: [
                        { id: "src_a", label: "Extract A", type: "rect", code: "EA", state: "Ready", parentId: "source" },
                        { id: "src_b", label: "Extract B", type: "rect", code: "EB", state: "Ready", parentId: "source" }
                    ],
                    parentId: "root"
                },
                {
                    id: "transform",
                    label: "Transform",
                    type: "lane",
                    code: "TFM",
                    state: "Ready",
                    collapsed: false,
                    children: [
                        { id: "tfm_a", label: "Cleanse", type: "rect", code: "CL", state: "Ready", parentId: "transform" },
                        { id: "tfm_b", label: "Enrich", type: "rect", code: "EN", state: "Ready", parentId: "transform" }
                    ],
                    parentId: "root"
                },
                {
                    id: "sink",
                    label: "Sink",
                    type: "lane",
                    code: "SNK",
                    state: "Ready",
                    collapsed: false,
                    children: [
                        { id: "sink_a", label: "Load", type: "rect", code: "LD", state: "Ready", parentId: "sink" }
                    ],
                    parentId: "root"
                }
            ],
            parentId: null
        }
    ],

    edges: [
        { id: "e1", source: "src_a", target: "tfm_a", type: "default" },
        { id: "e2", source: "src_b", target: "tfm_a", type: "default" },
        { id: "e3", source: "tfm_a", target: "tfm_b", type: "default" },
        { id: "e4", source: "tfm_b", target: "sink_a", type: "default" }
    ]
};
