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
      id: 'adapterA',
      type: 'adapter',
      label: 'Adapter A',
      x: -250,
      y: 0,
      layout: { displayMode: 'full', mode: 'full', arrangement: 1 },
      children: [],
    },
    {
      id: 'foundationB',
      type: 'foundation',
      label: 'Foundation B',
      x: 250,
      y: 0,
      children: [],
    },
  ],
  edges: [
    // Internal edges are created automatically by AdapterNode. Reference role children by id: `${role}_${parentId}`
    { source: 'archive_adapterA', target: 'foundationB', type: 'DataFlow', state: 'Ready' },
  ],
};
