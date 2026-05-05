// Demo: Overlay — loading overlay + floating-div integration

export const demoData = {
  metadata: { name: 'overlay-basic', description: 'Loading + floating overlays.' },
  settings: { demoMode: true, toggleCollapseOnStatusChange: false, cascadeOnStatusChange: false },
  nodes: [
    { id: 'n1', label: 'Node 1', type: 'rect', code: 'N1' },
    { id: 'n2', label: 'Node 2', type: 'rect', code: 'N2' },
    { id: 'n3', label: 'Node 3', type: 'rect', code: 'N3' },
  ],
  edges: [
    { source: 'n1', target: 'n2' },
    { source: 'n2', target: 'n3' },
  ],
};
