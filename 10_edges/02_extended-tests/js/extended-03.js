export const demoData = {
  settings: { demoMode: true, showGhostlines: false,
    showEdges: true,
    curved: true,
    curveMargin: 0.1,
    nodeSpacing: { horizontal: 40, vertical: 20 }
  },
  nodes: [
    {
      id: 'outerLane', type: 'lane', label: 'Outer Lane', x: 0, y: 0,
      children: [
        { id: 'innerCols', type: 'columns', label: 'Inner Columns', children: [
            { id: 'IC1', type: 'rect', label: 'IC1', width: 110, height: 50 },
            { id: 'IC2', type: 'rect', label: 'IC2', width: 110, height: 50 }
        ]},
        { id: 'innerLane', type: 'lane', label: 'Inner Lane', children: [
            { id: 'IL1', type: 'rect', label: 'IL1', width: 110, height: 50 },
            { id: 'IL2', type: 'rect', label: 'IL2', width: 110, height: 50 }
        ]}
      ]
    }
  ],
  edges: [
    { source: 'IC1', target: 'IC2', type: 'SSIS', state: 'Ready' },
    { source: 'IL1', target: 'IL2', type: 'SSIS', state: 'Ready' },
    { source: 'IC2', target: 'IL1', type: 'DataFlow', state: 'Ready' }
  ]
};


