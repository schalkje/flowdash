# Release & Versioning

This repo contains **two npm projects**. Understanding which is which matters when you cut a release.

## The dual-package model

| Package | Path | Role | Versioning |
|---------|------|------|-----------|
| `flowdash` | [`/dashboard/package.json`](../dashboard/package.json) | The library itself. Webpack-bundled, externalises D3, ships [`flowdash.min.js`](../dashboard/dist/flowdash.min.js) and CSS. **This is the version external consumers care about.** | `prebuild` auto-bumps the patch (`npm version patch --no-git-tag-version`) on every successful `npm run build`. |
| `flowdash-harness` | [`/package.json`](../package.json) | Test runner, demo server orchestrator, and dev tooling. **Not published, not consumed by anyone.** | Stays at `0.0.0`, marked `"private": true`. Don't bump it. |

If you find yourself looking at "the version" of FlowDash, you almost always mean the version inside `/dashboard/package.json`.

## Building the library

From the repo root:

```bash
npm run build      # delegates to: cd dashboard && npm run build
```

Or from `/dashboard/`:

```bash
cd dashboard
npm run build
```

What `dashboard/`'s `build` does:

1. **`prebuild` hook fires first** — runs `npm version patch --no-git-tag-version`, which bumps the `version` field in `dashboard/package.json` (e.g. `1.2.32` → `1.2.33`). It does *not* tag git.
2. **Webpack runs in production mode** — produces minified `dashboard/dist/flowdash.min.js` and `dashboard/dist/flowdash.css`. D3 is externalised; consumers must provide it.
3. **CSS distribution scripts** (PowerShell, see `/scripts/`) can copy the bundle and themes into a release tree.

> ⚠️ **Don't run `npm run build` casually.** Every successful build bumps the patch version and modifies `dashboard/package.json`. If you only want to inspect the bundle, use `npm run build:analyze` from `/dashboard/` (still bumps the version) or run webpack directly without the prebuild hook.

## Bundle analysis

```bash
cd dashboard
npm run build:analyze
```

Opens [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) at `http://127.0.0.1:8888`.

## Distribution

PowerShell scripts under [`/scripts/`](../scripts/):

| Script | Purpose |
|--------|---------|
| `distribute.ps1` | Builds the dashboard then copies bundle + CSS to a dist root. |
| `copy-flowdash-css.ps1` | Copies `flowdash.css` and all theme CSS into a dist tree. |
| `validate-dashboard-json.ps1` | JSON schema check on dashboard data files. |
| `add-node-ids.ps1` | Adds missing IDs to nodes in dashboard JSON fixtures. |

These are Windows-only today. Cross-platform replacements are tracked in [`improvement-plan.md`](./improvement-plan.md) under "Out of scope (intentional, for now)".

## Versioning policy

Today FlowDash auto-bumps the **patch** on every build. That is appropriate while the project is still pre-1.0 in spirit: every successful build is a snapshot consumers may want to pin against.

A more disciplined policy, recommended once the test pyramid and CI are in place:

- **Patch** (`1.2.x`) — bug fixes, internal refactors, no API changes. Auto-bump on `prebuild` is appropriate.
- **Minor** (`1.x.0`) — new features, backwards-compatible API additions. Bump manually before the build that ships the feature.
- **Major** (`x.0.0`) — breaking API changes (settings schema, public exports, data shape). Discuss in advance, document the migration in [`docs/migration/`](./), bump manually.

Until the project goes to npm, "bump" means editing `dashboard/package.json` and committing. There is no `npm publish` step today.

## Publishing (currently: not done)

FlowDash is not published to npm. External consumers vendor [`flowdash.min.js`](../dashboard/dist/flowdash.min.js) directly or check out this repository.

If publication becomes a goal, the steps would be:

1. Verify CI is green (unit + Playwright + visual + perf).
2. Decide the version bump (patch/minor/major) per the policy above.
3. From `/dashboard/`: `npm publish --access public`.
4. Tag the repo: `git tag dashboard-v$(node -p "require('./dashboard/package.json').version")` and push the tag.
5. Update [`/dashboard/readme.md`](../dashboard/readme.md) and [`docs/release.md`](./release.md) with the new install instructions.

This is captured as a follow-up in [`improvement-plan.md`](./improvement-plan.md) "Out of scope".

## When something goes wrong

- **A failed build still bumped the version** — `prebuild` runs first. If webpack later fails, the version in `dashboard/package.json` is already incremented. Either revert the file or treat the next successful build as "the real version."
- **Two parallel branches both bumped the version** — git will conflict on `dashboard/package.json`. Resolve by picking the higher version and re-bumping if both branches contribute releases.
- **Consumers get a different bundle than expected** — verify they are sourcing `flowdash.min.js` from the right release. The bundle's first comment line embeds the build-time version (webpack's banner plugin can be configured to make this explicit; see follow-up in `improvement-plan.md`).
