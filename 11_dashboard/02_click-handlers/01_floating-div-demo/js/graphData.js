// Demo data for click handler functionality
export const demoData = {
  settings: {
    zoomToRoot: true,
    showBoundingBox: true,
    selector: { incoming: 1, outgoing: 1 }
  },
  nodes: [
    {
      id: "node1",
      type: "rect",
      label: "Data Source",
      x: 0,
      y: 0,
      width: 120,
      height: 60,
      status: "Ready"
    },
    {
      id: "node2", 
      type: "rect",
      label: "Processing",
      x: 200,
      y: 0,
      width: 120,
      height: 60,
      status: "Updating"
    },
    {
    id: "adapter1",
    label: "adapter Node",
    type: "adapter",
    // Node-specific properties
    code: "N1",
    status: "Ready",
    // Layout properties
    layout: {
        mode: "full", // or "role", "code"
    },
    // Child nodes (for container nodes)
    children: [],
    // Parent reference
    parentId: null
},
    {
      id: "node3",
      type: "rect", 
      label: "Storage",
      x: 400,
      y: 0,
      width: 120,
      height: 60,
      status: "Updated"
    },
    {
      id: "node4",
      type: "rect",
      label: "Error Node",
      x: 200,
      y: 150,
      width: 120,
      height: 60,
      status: "Error"
    },
    {
      id: "node5",
      type: "rect",
      label: "Warning Node", 
      x: 0,
      y: 150,
      width: 120,
      height: 60,
      status: "Warning"
    }
  ],
  edges: [
    {
      id: "edge1",
      source: "node1",
      target: "node2"
    },
    {
      id: "edge2", 
      source: "node2",
      target: "node3"
    },
    {
      id: "edge3",
      source: "node2", 
      target: "node4"
    },
    {
      id: "edge4",
      source: "node1",
      target: "node5"
    }
  ]
};
