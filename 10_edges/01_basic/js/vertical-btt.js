export const demoData = {
    settings: { demoMode: true, showGhostlines: false,
        showEdges: true,
        curved: false,
        nodeSpacing: { horizontal: 40, vertical: 20 }
    },
    nodes: [
        {
            id: 'lane-1',
            type: 'lane',
            label: 'Vertical BTT',
            x: 0,
            y: 0,
            children: [
                { id: 'N1', type: 'rect', label: 'N1', width: 100, height: 50 },
                { id: 'N2', type: 'rect', label: 'N2', width: 100, height: 50 },
                { id: 'N3', type: 'rect', label: 'N3', width: 100, height: 50 }
            ]
        }
    ],
    edges: [
        { source: 'N3', target: 'N2', type: 'SSIS', state: 'Ready' },
        { source: 'N2', target: 'N1', type: 'SSIS', state: 'Ready' }
    ]
};


