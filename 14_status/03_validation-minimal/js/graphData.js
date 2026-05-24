// Demo: minimal validation-indicator modes.
//
// Renders a row of 8 nodes, one per state in the validation vocabulary, so
// each cell exercises a different (state, mode) combination. The matrix
// dashboards below (constructed dynamically in the HTML) use this same shape
// for each of the three minimal modes.

const STATES = ['unknown', 'ready', 'busy', 'error', 'warning', 'disabled', 'ok', 'na'];

function makeNode(state) {
  const node = {
    id: `node-${state}`,
    label: state,
    type: 'rect',
    state: 'Ready',
    width: 96,
  };
  // Drive the post-validation state on each node — pre stays 'na' so the
  // post indicator on the right edge is the focus.
  if (state !== 'na') {
    node.postValidationState =
      state === 'error'
        ? { state: 'error', message: 'sample error message' }
        : state === 'warning'
          ? { state: 'warning', message: 'sample warning message' }
          : { state };
  }
  return node;
}

export const STATE_VOCABULARY = STATES.slice();

export const demoData = {
  metadata: {
    name: 'validation-minimal',
    description:
      'Three minimal validation-indicator modes (bar / circle / corner) rendering the full 8-state vocabulary.',
  },
  settings: {
    demoMode: true,
    toggleCollapseOnStatusChange: false,
    cascadeOnStatusChange: false,
    validationIndicatorMode: 'minimal-bar',
    validationIndicator: { animate: true },
  },
  nodes: [
    {
      id: 'root',
      label: 'Validation states',
      type: 'lane',
      children: STATES.map(makeNode),
    },
  ],
  edges: [],
};

// Factory used by the HTML page to build a fresh fixture for each
// matrix-row dashboard (one per mode).
export function buildFixtureForMode(mode) {
  return {
    metadata: { name: `validation-minimal-${mode}`, description: `Matrix row: mode=${mode}` },
    settings: {
      demoMode: true,
      toggleCollapseOnStatusChange: false,
      cascadeOnStatusChange: false,
      validationIndicatorMode: mode,
      validationIndicator: { animate: true },
    },
    nodes: [
      {
        id: `root-${mode}`,
        label: mode,
        type: 'lane',
        children: STATES.map((s) => ({
          ...makeNode(s),
          id: `${mode}-node-${s}`,
        })),
      },
    ],
    edges: [],
  };
}
