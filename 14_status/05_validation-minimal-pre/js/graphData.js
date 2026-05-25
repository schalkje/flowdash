// Demo: minimal validation-indicator modes — PRE side variant.
//
// Mirror of 03_validation-minimal but drives the **pre** (left) side instead
// of the post side. Renders a row of 8 nodes (one per state), so each cell
// exercises a different (state, mode) combination on the inbound edge. The
// matrix dashboards below (constructed dynamically in the HTML) use this
// same shape for each of the three baseline modes.

const STATES = ['unknown', 'ready', 'busy', 'error', 'warning', 'disabled', 'ok', 'na'];

function makeNode(state) {
  const node = {
    id: `node-${state}`,
    label: state,
    type: 'rect',
    state: 'Ready',
    width: 96,
  };
  // Drive the pre-validation state on each node — post stays 'na' so the
  // pre indicator on the left edge is the focus.
  if (state !== 'na') {
    node.preValidationState =
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
    name: 'validation-minimal-pre',
    description:
      'Three baseline validation-indicator modes (bar / circle / corner) rendering the full 8-state vocabulary on the pre (inbound) side.',
  },
  settings: {
    demoMode: true,
    toggleCollapseOnStatusChange: false,
    cascadeOnStatusChange: false,
    validationMode: 'bar',
    validationIndicator: { animate: true },
  },
  nodes: [
    {
      id: 'root',
      label: 'Validation states (pre side)',
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
    metadata: { name: `validation-minimal-pre-${mode}`, description: `Matrix row: mode=${mode}` },
    settings: {
      demoMode: true,
      toggleCollapseOnStatusChange: false,
      cascadeOnStatusChange: false,
      validationMode: mode,
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
