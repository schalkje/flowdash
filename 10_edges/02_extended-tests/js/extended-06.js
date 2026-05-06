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
      id: 'colsLeft',
      type: 'columns',
      label: 'Sources',
      x: -300,
      y: 0,
      children: [
        { id: 'S1', type: 'rect', label: 'S1', width: 100, height: 50 },
        { id: 'S2', type: 'rect', label: 'S2', width: 100, height: 50 },
        { id: 'S3', type: 'rect', label: 'S3', width: 100, height: 50 },
      ],
    },
    {
      id: 'laneMid',
      type: 'lane',
      label: 'Processors',
      x: 0,
      y: 0,
      children: [
        { id: 'P1', type: 'rect', label: 'P1', width: 120, height: 50 },
        { id: 'P2', type: 'rect', label: 'P2', width: 120, height: 50 },
      ],
    },
    {
      id: 'colsRight',
      type: 'columns',
      label: 'Targets',
      x: 300,
      y: 0,
      children: [
        { id: 'T1', type: 'rect', label: 'T1', width: 100, height: 50 },
        { id: 'T2', type: 'rect', label: 'T2', width: 100, height: 50 },
      ],
    },
  ],
  edges: [
    // Fan-in to P1
    { source: 'S1', target: 'P1', type: 'DataFlow', state: 'Ready' },
    { source: 'S2', target: 'P1', type: 'DataFlow', state: 'Ready' },
    { source: 'S3', target: 'P1', type: 'DataFlow', state: 'Ready' },
    // Fan-out from P2
    { source: 'P2', target: 'T1', type: 'DataFlow', state: 'Ready' },
    { source: 'P2', target: 'T2', type: 'DataFlow', state: 'Ready' },
    // P1 -> P2
    { source: 'P1', target: 'P2', type: 'SSIS', state: 'Ready' },
  ],
};
