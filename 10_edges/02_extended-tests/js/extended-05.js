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
          { id: 'A2', type: 'adapter', label: 'Adapter A2', layout: { displayMode: 'full', mode: 'full', arrangement: 1 }, children: [] },
          { id: 'F2', type: 'foundation', label: 'F2', children: [] }
        ] },
        { id: 'L2', type: 'lane', label: 'L2', children: [
          { id: 'M3', type: 'mart', label: 'Mart 3', children: [] },
          { id: 'E3', type: 'edge-demo', label: 'Edge Demo 3', layout: { type: 'grid' }, children: [] }
        ] }
      ]
    }
  ],
  edges: [
    // Adapter internal edges are automatic; use role ids for cross-container
    { source: 'archive_A2', target: 'F2', type: 'DataFlow', state: 'Ready' },
    { source: 'F2', target: 'M3', type: 'DataFlow', state: 'Ready' },
    { source: 'M3', target: 'E3', type: 'DataFlow', state: 'Ready' }
  ]
};


