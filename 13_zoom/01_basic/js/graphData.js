// Demo: Zoom — programmatic, button, double-click auto-zoom, fit-to-viewport

export const demoData = {
  metadata: { name: 'zoom-basic', description: 'Pan, zoom, and auto-zoom controls.' },
  settings: {
    demoMode: true,
    zoomToRoot: true,
    zoom: { scaleExtent: [0.1, 40], epsilonPct: 0.005, minTargetBBoxPx: { w: 24, h: 24 } },
  },
  nodes: [
    {
      id: 'root',
      label: 'Lane',
      type: 'lane',
      children: [
        { id: 'r1', label: 'R1', type: 'rect', code: 'R1' },
        { id: 'r2', label: 'R2', type: 'rect', code: 'R2' },
        { id: 'r3', label: 'R3', type: 'rect', code: 'R3' },
      ],
    },
  ],
  edges: [
    { source: 'r1', target: 'r2' },
    { source: 'r2', target: 'r3' },
  ],
};
