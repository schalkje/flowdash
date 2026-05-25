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

// Exemplar nodes: one extra child appended to each section, demonstrating
// a richer state — a status that warrants attention combined with a
// validation indicator and meaningful child states. The page-level style
// picker flips Pulse Halo / Siren / Industrial Tape / Police Line / None
// live so reviewers can vet the indicator under every theme.
// See /dashboard/documentation/validation-indicators.md.
const EXEMPLARS = {
  'sec-basic': () => ({
    id: 'sec-basic-exemplar',
    label: '★ Ready · pre',
    type: 'rect',
    state: 'Ready',
    preValidationState: { state: 'error', message: 'upstream contract violated' },
  }),
  'sec-adapter': () => ({
    id: 'sec-adapter-exemplar',
    label: '★ Warning · post',
    type: 'adapter',
    state: 'Warning',
    layout: { mode: 'full', arrangement: 1, displayMode: 'full' },
    children: [
      {
        id: 'sec-adapter-exemplar-staging',
        label: 'STAGING',
        type: 'node',
        children: [],
        state: 'Updated',
        role: 'staging',
        postValidationState: { state: 'error', message: 'output schema mismatch' },
      },
      {
        id: 'sec-adapter-exemplar-archive',
        label: 'ARCHIVE',
        type: 'node',
        children: [],
        state: 'Ready',
        role: 'archive',
      },
      {
        id: 'sec-adapter-exemplar-transform',
        label: 'TRANSFORM',
        type: 'node',
        children: [],
        state: 'Ready',
        role: 'transform',
      },
    ],
  }),
  'sec-columns': () => ({
    id: 'sec-columns-exemplar',
    label: '★ Warning · pre',
    type: 'columns',
    state: 'Warning',
    layout: { mode: 'full', arrangement: 1, displayMode: 'full' },
    children: [
      { id: 'sec-columns-exemplar-a', label: 'A', type: 'node', children: [], state: 'Updated' },
      {
        id: 'sec-columns-exemplar-b',
        label: 'B',
        type: 'node',
        children: [],
        state: 'Ready',
        preValidationState: { state: 'error', message: 'input column missing' },
      },
    ],
  }),
  'sec-foundation': () => ({
    id: 'sec-foundation-exemplar',
    label: '★ Warning · pre & post',
    type: 'foundation',
    state: 'Warning',
    layout: { mode: 'auto', displayMode: 'role', orientation: 'horizontal' },
    children: [
      {
        id: 'sec-foundation-exemplar-raw',
        label: 'raw',
        type: 'node',
        children: [],
        state: 'Updated',
        role: 'raw',
        category: 'raw',
        width: 60,
        postValidationState: { state: 'error', message: 'base contract failed' },
      },
      {
        id: 'sec-foundation-exemplar-base',
        label: 'base',
        type: 'node',
        children: [],
        state: 'Ready',
        role: 'base',
        category: 'base',
        width: 60,
      },
    ],
  }),
  'sec-lane': () => ({
    id: 'sec-lane-exemplar',
    label: '★ Warning · post',
    type: 'lane',
    state: 'Warning',
    postValidationState: { state: 'error', message: 'downstream contract failed' },
    children: [
      { id: 'sec-lane-exemplar-a', label: 'A', type: 'node', children: [], state: 'Updated' },
      { id: 'sec-lane-exemplar-b', label: 'B', type: 'node', children: [], state: 'Ready' },
    ],
  }),
  'sec-mart': () => ({
    id: 'sec-mart-exemplar',
    label: '★ Warning · pre',
    type: 'mart',
    state: 'Warning',
    layout: { mode: 'auto', displayMode: 'role', orientation: 'horizontal' },
    preValidationState: { state: 'error', message: 'upstream snapshot stale' },
    children: [
      {
        id: 'sec-mart-exemplar-load',
        label: 'load',
        type: 'node',
        children: [],
        state: 'Updated',
        role: 'load',
        category: 'load',
      },
      {
        id: 'sec-mart-exemplar-report',
        label: 'report',
        type: 'node',
        children: [],
        state: 'Ready',
        role: 'report',
        category: 'report',
      },
    ],
  }),
};

function withExemplar(section) {
  const make = EXEMPLARS[section.id];
  if (make) section.children.push(make());
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
    validationMode: 'circle',
    validationLoudError: 'pulse',
    validationIndicator: {
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
        // Each section gets its 10 status entries plus one exemplar (★) that
        // mixes a status with validation errors and meaningful child states.
        withExemplar(buildSection({ id: 'sec-basic', label: 'Basic nodes (rect)', type: 'rect' })),
        withExemplar(
          buildSection({
            id: 'sec-adapter',
            label: 'Adapter nodes',
            type: 'adapter',
            makeChildren: adapterChildren,
            layout: { mode: 'full', arrangement: 1, displayMode: 'full' },
          }),
        ),
        withExemplar(
          buildSection({
            id: 'sec-columns',
            label: 'Columns',
            type: 'columns',
            makeChildren: rectPair,
            layout: { mode: 'full', arrangement: 1, displayMode: 'full' },
          }),
        ),
        withExemplar(
          buildSection({
            id: 'sec-foundation',
            label: 'Foundation',
            type: 'foundation',
            makeChildren: foundationChildren,
            layout: { mode: 'auto', displayMode: 'role', orientation: 'horizontal' },
          }),
        ),
        withExemplar(
          buildSection({
            id: 'sec-lane',
            label: 'Lane (2 rects)',
            type: 'lane',
            makeChildren: rectPair,
          }),
        ),
        withExemplar(
          buildSection({
            id: 'sec-mart',
            label: 'Marts',
            type: 'mart',
            makeChildren: martChildren,
            layout: { mode: 'auto', displayMode: 'role', orientation: 'horizontal' },
          }),
        ),
      ],
    },
  ],

  edges: [],
};
