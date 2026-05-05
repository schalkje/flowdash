// Demo: Status state machine — drives every NodeStatus transition

export const demoData = {
  metadata: { name: 'status-basic', description: 'Status state machine and cascade behavior.' },
  settings: {
    demoMode: true,
    toggleCollapseOnStatusChange: false,
    cascadeOnStatusChange: true,
  },
  nodes: [
    { id: 'pipe', label: 'Pipeline', type: 'lane', children: [
      { id: 'extract',  label: 'Extract',  type: 'rect', code: 'E', status: 'Ready' },
      { id: 'transform',label: 'Transform',type: 'rect', code: 'T', status: 'Ready' },
      { id: 'load',     label: 'Load',     type: 'rect', code: 'L', status: 'Ready' },
    ] },
  ],
  edges: [
    { source: 'extract', target: 'transform' },
    { source: 'transform', target: 'load' },
  ],
};
