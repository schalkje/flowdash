# tests/_scratch/

Exploratory specs that pre-date the current test conventions. They contain heavy `console.log` output and weak assertions, and were used as one-off debugging tools rather than as part of the regression suite.

These files are **excluded from `npm test`** via the `testIgnore: ['**/_scratch/**']` rule in [`playwright.config.cjs`](../../playwright.config.cjs).

They are kept here for reference. Either:

- Promote useful pieces into a real spec under `tests/` (with proper assertions and no debug logging), or
- Delete the file when its purpose is well-covered elsewhere.

| File | Origin | Status |
|------|--------|--------|
| `dashboard-init-debug.spec.js` | was `tests/debug.spec.js` | exploratory; superseded by `dashboard.spec.js` |
| `lane-demo-debug.spec.js` | was `tests/debug-lane-test.spec.js` | exploratory; superseded by `lane-nodes.spec.js` |
| `zone-creation-debug.spec.js` | was `dashboard/tests/debug-zone-creation.spec.js` | exploratory; resolves the cross-folder duplicate concern |
