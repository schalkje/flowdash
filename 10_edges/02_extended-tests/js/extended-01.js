export const demoData = {
  settings: { demoMode: true, showGhostlines: false,
    showEdges: true,
    curved: true,
    curveMargin: 0.1,
    nodeSpacing: { horizontal: 40, vertical: 20 }
  },
  nodes: [
    {
      id: 'laneA', type: 'lane', label: 'Lane A', x: -250, y: 0,
      children: [
        { id: 'LA1', type: 'rect', label: 'LA1', width: 110, height: 50 },
        { id: 'LA2', type: 'rect', label: 'LA2', width: 110, height: 50 }
      ]
    },
    {
      id: 'colsB', type: 'columns', label: 'Columns B', x: 250, y: 0,
      children: [
        { id: 'CB1', type: 'rect', label: 'CB1', width: 110, height: 50 },
        { id: 'CB2', type: 'rect', label: 'CB2', width: 110, height: 50 }
      ]
    }
  ],
  edges: [
    { source: 'LA1', target: 'CB1', type: 'DataFlow', state: 'Ready' },
    { source: 'LA2', target: 'CB2', type: 'DataFlow', state: 'Ready' },
    { source: 'LA1', target: 'LA2', type: 'SSIS', state: 'Ready' },
    { source: 'CB1', target: 'CB2', type: 'SSIS', state: 'Ready' }
  ]
};


