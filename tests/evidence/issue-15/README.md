# Evidence — Issue #15: Validation indicator modes

## `after-migration-02-validation-errors-{4 styles}.png`

The existing `14_status/02_validation-errors` demo, captured after migrating
its fixture and toggle UI to the new `setValidationStateById(id, side, { state, message? })`
API. Confirms each of the four loud styles (pulse-halo, rotating-siren,
industrial-tape, police-line) renders identically to its pre-issue-#15 behavior.
The migration is invisible to the user — these are the "still works" screenshots.

## `after-03-validation-minimal-matrix.png`

First render of the new `14_status/03_validation-minimal` demo. Shows:

- The interactive row at the top (`minimal-bar` mode by default), with the eight
  validation states rendered side-by-side.
- The matrix below: the same eight states rendered in each of the three minimal
  modes (`minimal-bar`, `minimal-circle`, `minimal-corner`) for visual comparison.

Per-state colors resolve via the new `--fd-validation-state-*` theme variables
(falling back to the documented hex set). The `'na'` cell renders no DOM for
its post side, which is the desired "absence" signal.
