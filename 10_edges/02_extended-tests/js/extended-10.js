function makeMany(count, prefix) {
  const nodes = [];
  for (let i = 1; i <= count; i++) {
    nodes.push({
      id: `${prefix}${i}`,
      type: 'rect',
      label: `${prefix}${i}`,
      width: 90,
      height: 40,
    });
  }
  return nodes;
}

export const demoData = {
  settings: {
    demoMode: true,
    showGhostlines: false,
    showEdges: true,
    curved: true,
    curveMargin: 0.1,
    nodeSpacing: { horizontal: 30, vertical: 16 },
  },
  nodes: [
    { id: 'Left', type: 'columns', label: 'Left', x: -400, y: 0, children: makeMany(6, 'L') },
    { id: 'Mid', type: 'lane', label: 'Mid', x: 0, y: 0, children: makeMany(6, 'M') },
    { id: 'Right', type: 'columns', label: 'Right', x: 400, y: 0, children: makeMany(6, 'R') },
  ],
  edges: [
    // Connect each L to M1
    ...Array.from({ length: 6 }, (_, i) => ({
      source: `L${i + 1}`,
      target: 'M1',
      type: 'DataFlow',
      state: 'Ready',
    })),
    // Chain M's
    ...Array.from({ length: 5 }, (_, i) => ({
      source: `M${i + 1}`,
      target: `M${i + 2}`,
      type: 'SSIS',
      state: 'Ready',
    })),
    // Fan-out M6 to all R
    ...Array.from({ length: 6 }, (_, i) => ({
      source: 'M6',
      target: `R${i + 1}`,
      type: 'DataFlow',
      state: 'Ready',
    })),
  ],
};
