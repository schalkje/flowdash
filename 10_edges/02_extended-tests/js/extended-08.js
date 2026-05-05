// Arrange nodes to emphasize right-angles with current polyline routing
export const demoData = {
  settings: { demoMode: true, showGhostlines: false,
    showEdges: true,
    curved: false,
    curveMargin: 0,
    nodeSpacing: { horizontal: 60, vertical: 60 }
  },
  nodes: [
    { id: 'colsLeft', type: 'columns', label: 'Left', x: -300, y: -100, children: [
        { id: 'L1', type: 'rect', label: 'L1', width: 100, height: 50 },
        { id: 'L2', type: 'rect', label: 'L2', width: 100, height: 50 }
    ]},
    { id: 'laneMid', type: 'lane', label: 'Middle', x: 0, y: 0, children: [
        { id: 'M1', type: 'rect', label: 'M1', width: 120, height: 50 },
        { id: 'M2', type: 'rect', label: 'M2', width: 120, height: 50 }
    ]},
    { id: 'colsRight', type: 'columns', label: 'Right', x: 300, y: 100, children: [
        { id: 'R1', type: 'rect', label: 'R1', width: 100, height: 50 },
        { id: 'R2', type: 'rect', label: 'R2', width: 100, height: 50 }
    ]}
  ],
  edges: [
    // create L-shaped segments by relative positions (left-top to mid-top to right-bottom)
    { source: 'L1', target: 'M1', type: 'DataFlow', state: 'Ready' },
    { source: 'M1', target: 'R2', type: 'DataFlow', state: 'Ready' },
    // other direction
    { source: 'R1', target: 'M2', type: 'DataFlow', state: 'Ready' },
    { source: 'M2', target: 'L2', type: 'DataFlow', state: 'Ready' }
  ]
};


