// Demo: Minimap — viewport drag, zoom-to-region, mode and styling toggles

export const demoData = {
  metadata: { name: 'minimap-basic', description: 'Minimap interactions and modes.' },
  settings: {
    demoMode: true,
    minimap: {
      enabled: true,
      mode: 'always',
      position: 'bottom-right',
      size: 'm',
      opacity: 1,
      collapsed: false,
      scaleIndicator: { visible: true, type: 'percent', decimals: 0 },
    },
  },
  nodes: [
    { id: 'main', label: 'Main', type: 'columns', children: [
      { id: 'l1', label: 'Lane 1', type: 'lane', children: [
        { id: 'a', label: 'A', type: 'rect', code: 'A' },
        { id: 'b', label: 'B', type: 'rect', code: 'B' },
        { id: 'c', label: 'C', type: 'rect', code: 'C' },
      ] },
      { id: 'l2', label: 'Lane 2', type: 'lane', children: [
        { id: 'd', label: 'D', type: 'rect', code: 'D' },
        { id: 'e', label: 'E', type: 'rect', code: 'E' },
        { id: 'f', label: 'F', type: 'rect', code: 'F' },
      ] },
      { id: 'l3', label: 'Lane 3', type: 'lane', children: [
        { id: 'g', label: 'G', type: 'rect', code: 'G' },
        { id: 'h', label: 'H', type: 'rect', code: 'H' },
        { id: 'i', label: 'I', type: 'rect', code: 'I' },
      ] },
    ] },
  ],
  edges: [
    { source: 'a', target: 'd' },
    { source: 'b', target: 'e' },
    { source: 'd', target: 'g' },
    { source: 'e', target: 'h' },
    { source: 'f', target: 'i' },
  ],
};
