export const demoData = {
  settings: {
    demoMode: true,
    showGhostlines: false,
    showEdges: true,
    curved: true,
    curveMargin: 0.1,
    nodeSpacing: { horizontal: 40, vertical: 20 },
  },
  nodes: [
    {
      id: 'topLane',
      type: 'lane',
      label: 'Top Lane',
      x: 0,
      y: -200,
      children: [
        { id: 'TL1', type: 'rect', label: 'TL1', width: 120, height: 50 },
        { id: 'TL2', type: 'rect', label: 'TL2', width: 120, height: 50 },
      ],
    },
    {
      id: 'bottomCols',
      type: 'columns',
      label: 'Bottom Columns',
      x: 0,
      y: 200,
      children: [
        { id: 'BC1', type: 'rect', label: 'BC1', width: 120, height: 50 },
        { id: 'BC2', type: 'rect', label: 'BC2', width: 120, height: 50 },
        { id: 'BC3', type: 'rect', label: 'BC3', width: 120, height: 50 },
      ],
    },
  ],
  edges: [
    { source: 'TL1', target: 'BC2', type: 'DataFlow', state: 'Ready' },
    { source: 'TL2', target: 'BC1', type: 'DataFlow', state: 'Ready' },
    { source: 'TL2', target: 'BC3', type: 'DataFlow', state: 'Ready' },
  ],
};
