// Demo: Validation indicators ("red noses")
// Every node is Ready — validation errors are orthogonal to status. The page
// shows them on rect leaves AND on the three composite container types
// (foundation, adapter, mart) so the indicator placement can be reviewed on
// each. Toggles in the HTML drive pre/post per node live.

export const demoData = {
  metadata: {
    name: 'validation-errors',
    description:
      'Validation-error indicators (red noses): pre on the left, post on the right. Pick a style and toggle errors per node — leaves and composite containers alike.',
  },
  settings: {
    demoMode: true,
    toggleCollapseOnStatusChange: false,
    cascadeOnStatusChange: false,
    validationIndicatorMode: 'pulse-halo',
    validationIndicator: {
      style: 'pulse-halo',
      glyph: '!',
      animate: true,
    },
  },
  nodes: [
    {
      id: 'root',
      label: 'Customer ETL — validation demo',
      type: 'columns',
      children: [
        // --- existing 4-stage rect pipeline ---
        {
          id: 'pipe',
          label: 'Stages',
          type: 'lane',
          children: [
            {
              id: 'extract',
              label: 'Extract — crm.customers',
              type: 'rect',
              state: 'Ready',
              preValidationState: { state: 'error', message: 'upstream partition missing' },
            },
            {
              id: 'transform',
              label: 'Transform — clean + dedupe',
              type: 'rect',
              state: 'Ready',
            },
            {
              id: 'load',
              label: 'Load — dwh.customers',
              type: 'rect',
              state: 'Ready',
              postValidationState: { state: 'error', message: 'null rate on revenue exceeds 1%' },
            },
            {
              id: 'report',
              label: 'Build daily mart',
              type: 'rect',
              state: 'Ready',
              preValidationState: { state: 'error' },
              postValidationState: { state: 'error', message: 'duplicate primary keys (37)' },
            },
          ],
        },

        // --- foundation (raw + base) ---
        {
          id: 'foundation',
          label: 'Foundation',
          type: 'foundation',
          state: 'Ready',
          layout: { mode: 'auto', displayMode: 'role', orientation: 'horizontal' },
          preValidationState: { state: 'error', message: 'raw source unavailable' },
          children: [
            {
              id: 'foundation-raw',
              label: 'raw',
              type: 'node',
              children: [],
              state: 'Ready',
              role: 'raw',
              category: 'raw',
              width: 60,
            },
            {
              id: 'foundation-base',
              label: 'base',
              type: 'node',
              children: [],
              state: 'Ready',
              role: 'base',
              category: 'base',
              width: 60,
            },
          ],
        },

        // --- adapter (staging / archive / transform) ---
        {
          id: 'adapter',
          label: 'Adapter',
          type: 'adapter',
          state: 'Ready',
          layout: { mode: 'full', arrangement: 1, displayMode: 'full' },
          postValidationState: { state: 'error', message: 'transform output schema mismatch' },
          children: [
            {
              id: 'adapter-staging',
              label: 'STAGING',
              type: 'node',
              children: [],
              state: 'Ready',
              role: 'staging',
            },
            {
              id: 'adapter-archive',
              label: 'ARCHIVE',
              type: 'node',
              children: [],
              state: 'Ready',
              role: 'archive',
            },
            {
              id: 'adapter-transform',
              label: 'TRANSFORM',
              type: 'node',
              children: [],
              state: 'Ready',
              role: 'transform',
            },
          ],
        },

        // --- mart (load + report) ---
        {
          id: 'mart',
          label: 'Mart',
          type: 'mart',
          state: 'Ready',
          layout: { mode: 'auto', displayMode: 'role', orientation: 'horizontal' },
          preValidationState: { state: 'error' },
          postValidationState: { state: 'error', message: 'downstream contract failed' },
          children: [
            {
              id: 'mart-load',
              label: 'load',
              type: 'node',
              children: [],
              state: 'Ready',
              role: 'load',
              category: 'load',
            },
            {
              id: 'mart-report',
              label: 'report',
              type: 'node',
              children: [],
              state: 'Ready',
              role: 'report',
              category: 'report',
            },
          ],
        },
      ],
    },
  ],
  edges: [
    { source: 'extract', target: 'transform' },
    { source: 'transform', target: 'load' },
    { source: 'load', target: 'report' },
  ],
};
