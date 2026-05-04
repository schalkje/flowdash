// Demo: Selection model
// Type: any node type with edges
// Demonstrates: single click vs double click, neighborhood traversal,
// settings.selector.incomming / outgoing depths, programmatic selection.

export const demoData = {
  metadata: {
    name: 'selection-basic',
    description: 'Click to select a single node. Double-click to select its neighborhood (and zoom). Adjust the depth sliders to widen or narrow the neighborhood.',
    version: '1.0.0',
  },
  settings: {
    selector: { incomming: 1, outgoing: 1 },
    showCenterMark: false,
    showConnectionPoints: false,
    toggleCollapseOnStatusChange: false,
    cascadeOnStatusChange: false,
  },
  nodes: [
    { id: 'a', label: 'A', type: 'rect', code: 'A', status: 'Ready' },
    { id: 'b', label: 'B', type: 'rect', code: 'B', status: 'Ready' },
    { id: 'c', label: 'C', type: 'rect', code: 'C', status: 'Ready' },
    { id: 'd', label: 'D', type: 'rect', code: 'D', status: 'Ready' },
    { id: 'e', label: 'E', type: 'rect', code: 'E', status: 'Ready' },
    { id: 'f', label: 'F', type: 'rect', code: 'F', status: 'Ready' },
    { id: 'g', label: 'G', type: 'rect', code: 'G', status: 'Ready' },
  ],
  edges: [
    { source: 'a', target: 'b' },
    { source: 'a', target: 'c' },
    { source: 'b', target: 'd' },
    { source: 'c', target: 'd' },
    { source: 'd', target: 'e' },
    { source: 'e', target: 'f' },
    { source: 'e', target: 'g' },
  ],
};
