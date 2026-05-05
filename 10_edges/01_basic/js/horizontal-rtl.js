export const demoData = {
    settings: { demoMode: true, showGhostlines: false,
        showEdges: true,
        curved: false,
        nodeSpacing: { horizontal: 40, vertical: 20 }
    },
    nodes: [
        {
            id: 'cols-1',
            type: 'columns',
            label: 'Horizontal RTL',
            x: 0,
            y: 0,
            children: [
                { id: 'A', type: 'rect', label: 'A', width: 80, height: 50 },
                { id: 'B', type: 'rect', label: 'B', width: 80, height: 50 },
                { id: 'C', type: 'rect', label: 'C', width: 80, height: 50 }
            ]
        }
    ],
    edges: [
        { source: 'C', target: 'B', type: 'SSIS', state: 'Ready' },
        { source: 'B', target: 'A', type: 'SSIS', state: 'Ready' }
    ]
};


