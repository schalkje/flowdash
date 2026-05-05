export const demoData = {
  settings: { demoMode: true, showGhostlines: false,
    showEdges: true,
    curved: true,
    curveMargin: 0.1,
    nodeSpacing: { horizontal: 40, vertical: 20 }
  },
  nodes: [
    {
      id: 'L1', type: 'lane', label: 'L1', x: 0, y: 0,
      children: [
        { id: 'C2', type: 'columns', label: 'C2', children: [
          { id: 'L3', type: 'lane', label: 'L3', children: [
            { id: 'C4', type: 'columns', label: 'C4', children: [
              { id: 'N1', type: 'rect', label: 'N1', width: 100, height: 50 },
              { id: 'N2', type: 'rect', label: 'N2', width: 100, height: 50 }
            ] },
            { id: 'F3', type: 'foundation', label: 'F3', children: [] }
          ] },
          { id: 'M2', type: 'mart', label: 'M2', children: [] }
        ] }
      ]
    }
  ],
  edges: [
    { source: 'N1', target: 'N2', type: 'SSIS', state: 'Ready' },
    { source: 'N2', target: 'F3', type: 'DataFlow', state: 'Ready' },
    { source: 'F3', target: 'M2', type: 'DataFlow', state: 'Ready' }
  ]
};


