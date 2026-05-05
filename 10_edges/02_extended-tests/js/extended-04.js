export const demoData = {
  settings: { demoMode: true, showGhostlines: false,
    showEdges: true,
    curved: true,
    curveMargin: 0.1,
    nodeSpacing: { horizontal: 40, vertical: 20 }
  },
  nodes: [
    { id: 'martA', type: 'mart', label: 'Mart A', x: -300, y: 0, children: [] },
    { id: 'colsB', type: 'columns', label: 'Columns B', x: 0, y: 0, children: [
        { id: 'B1', type: 'rect', label: 'B1', width: 110, height: 50 },
        { id: 'B2', type: 'rect', label: 'B2', width: 110, height: 50 },
        { id: 'B3', type: 'rect', label: 'B3', width: 110, height: 50 }
    ]},
    { id: 'foundationC', type: 'foundation', label: 'Foundation C', x: 300, y: 0, children: [] }
  ],
  edges: [
    { source: 'martA', target: 'B1', type: 'DataFlow', state: 'Ready' },
    { source: 'B1', target: 'B2', type: 'SSIS', state: 'Ready' },
    { source: 'B2', target: 'B3', type: 'SSIS', state: 'Ready' },
    { source: 'B3', target: 'foundationC', type: 'DataFlow', state: 'Ready' }
  ]
};


