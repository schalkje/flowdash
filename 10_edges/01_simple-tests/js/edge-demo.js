export function makeData(cfg = {}) {
  const curved = !!cfg.curved;
  const ghost = !!cfg.ghost;
  const mode = cfg.mode || 'grid'; // grid, h-shifted, v-shifted, v-shifted2, stair-up, stair-down

  return {
    settings: {
      demoMode: true,
      showGhostlines: ghost,
      showEdges: true,
      curved: curved,
      curveMargin: curved ? 0.1 : 0,
      nodeSpacing: { horizontal: 30, vertical: 20 },
    },
    nodes: [
      {
        id: 'edge-demo-1',
        type: 'edge-demo',
        label: 'Edge Demo',
        x: 0,
        y: 0,
        width: 334,
        height: 74,
        layout: { type: mode },
      },
    ],
    edges: [],
  };
}
