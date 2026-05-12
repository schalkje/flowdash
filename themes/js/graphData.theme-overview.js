//////////////////////////////////////////////////////////////
//
// Demo: theme-overview
// Node Type: mixed (rect / adapter / columns / foundation / lane / mart)
// Features: Every node type × every status under one theme
// Test Status: Not Tested
//
// Companion to themes/02_theme-overview.html — that page mounts a single
// flowdash dashboard from this dataset and lets the user switch themes
// live via the themeManager UI. Each section is a sibling lane so the
// visual ordering top-to-bottom is stable.

const STATUSES = [
  'Undetermined',
  'Unknown',
  'Disabled',
  'Ready',
  'Updating',
  'Updated',
  'Skipped',
  'Delayed',
  'Warning',
  'Error',
];

// Per-node-type child generators. Container types render their roles
// inside; we keep them collapsed so the page stays scannable.
function adapterChildren(prefix, state) {
  return [
    {
      id: `${prefix}-staging`,
      label: 'STAGING',
      type: 'node',
      children: [],
      state,
      role: 'staging',
    },
    {
      id: `${prefix}-archive`,
      label: 'ARCHIVE',
      type: 'node',
      children: [],
      state,
      role: 'archive',
    },
    {
      id: `${prefix}-transform`,
      label: 'TRANSFORM',
      type: 'node',
      children: [],
      state,
      role: 'transform',
    },
  ];
}
function foundationChildren(prefix, state) {
  return [
    {
      id: `${prefix}-raw`,
      label: 'raw',
      type: 'node',
      children: [],
      state,
      role: 'raw',
      category: 'raw',
      width: 60,
    },
    {
      id: `${prefix}-base`,
      label: 'base',
      type: 'node',
      children: [],
      state,
      role: 'base',
      category: 'base',
      width: 60,
    },
  ];
}
function martChildren(prefix, state) {
  return [
    {
      id: `${prefix}-load`,
      label: 'load',
      type: 'node',
      children: [],
      state,
      role: 'load',
      category: 'load',
    },
    {
      id: `${prefix}-report`,
      label: 'report',
      type: 'node',
      children: [],
      state,
      role: 'report',
      category: 'report',
    },
  ];
}
function rectPair(prefix, state) {
  return [
    { id: `${prefix}-a`, label: 'A', type: 'node', children: [], state },
    { id: `${prefix}-b`, label: 'B', type: 'node', children: [], state },
  ];
}

// Decorator: stamp validation errors on the Ready entry of a section, so the
// theme overview always shows what a "red nose" looks like under the active
// theme. See /dashboard/documentation/validation-indicators.md.
function withValidationOnReady(section) {
  for (const child of section.children) {
    if (child.state === 'Ready') {
      child.preValidationError = 'upstream contract violated';
      child.postValidationError = 'output schema mismatch';
    }
  }
  return section;
}

function buildSection({ id, label, type, makeChildren = null, layout = null, collapsed = false }) {
  return {
    id,
    label,
    type: 'lane',
    layout: { arrangement: 'default', display: 'content' },
    children: STATUSES.map((state) => {
      const node = {
        id: `${id}-${state.toLowerCase()}`,
        label: state,
        type,
        state,
        layout,
      };
      if (makeChildren) {
        node.collapsed = collapsed;
        node.children = makeChildren(node.id, state);
      }
      return node;
    }),
  };
}

export const demoData = {
  metadata: {
    name: 'theme-overview',
    nodeType: 'mixed',
    features: ['Theme selector', 'All node types', 'All statuses'],
    description:
      'Per-theme overview: every node type rendered in every status. Use the theme selector (top-left) to switch live.',
    testStatus: 'Not Tested',
    version: '1.0.0',
  },

  settings: {
    showCenterMark: false,
    showGrid: true,
    showGroupLabels: true,
    showGroupTitles: true,
    showGhostlines: false,
    curved: false,
    showConnectionPoints: false,
    zoomToRoot: true,
    isDebug: false,
    // Auto-collapse on status change would hide most of the showcase, since
    // every container in this demo is a single status. Force-disable.
    toggleCollapseOnStatusChange: false,
    cascadeOnStatusChange: false,
    // Validation indicator default for this page — the rect Ready node carries
    // both pre and post errors so the indicator can be sanity-checked under
    // every theme. See /dashboard/documentation/validation-indicators.md.
    validationIndicator: {
      style: 'pulse-halo',
      glyph: '!',
      animate: true,
    },
  },

  nodes: [
    {
      id: 'theme-overview-root',
      // Sections sit side-by-side (columns), each section is internally a lane
      // stacking its 10 status nodes vertically. All container nodes inside
      // are expanded by default — the showcase is meant to be glanceable
      // without clicking.
      label: 'Theme Overview — every node type × every status',
      type: 'columns',
      layout: { arrangement: 'default', display: 'content' },
      children: [
        // First column: rect nodes — Ready entry carries pre+post validation
        // errors so the indicator is visible under every theme.
        withValidationOnReady(
          buildSection({ id: 'sec-basic', label: 'Basic nodes (rect)', type: 'rect' }),
        ),
        buildSection({
          id: 'sec-adapter',
          label: 'Adapter nodes',
          type: 'adapter',
          makeChildren: adapterChildren,
          layout: { mode: 'full', arrangement: 1, displayMode: 'full' },
        }),
        buildSection({
          id: 'sec-columns',
          label: 'Columns',
          type: 'columns',
          makeChildren: rectPair,
          layout: { mode: 'full', arrangement: 1, displayMode: 'full' },
        }),
        buildSection({
          id: 'sec-foundation',
          label: 'Foundation',
          type: 'foundation',
          makeChildren: foundationChildren,
          layout: { mode: 'auto', displayMode: 'role', orientation: 'horizontal' },
        }),
        buildSection({
          id: 'sec-lane',
          label: 'Lane (2 rects)',
          type: 'lane',
          makeChildren: rectPair,
        }),
        buildSection({
          id: 'sec-mart',
          label: 'Marts',
          type: 'mart',
          makeChildren: martChildren,
          layout: { mode: 'auto', displayMode: 'role', orientation: 'horizontal' },
        }),
      ],
    },
  ],

  edges: [],
};
