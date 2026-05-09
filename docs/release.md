# Release & Versioning

This repo contains **two npm projects**. Understanding which is which matters when you cut a release.

## The dual-package model

| Package            | Path                                                   | Role                                                                                                                                                                       | Versioning                                                                                                                |
| ------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `flowdash`         | [`/dashboard/package.json`](../dashboard/package.json) | The library itself. Webpack-bundled, externalises D3, ships `flowdash.min.js` and CSS as **GitHub Release assets**. **This is the version external consumers care about.** | Bumped explicitly per release via `npm version <bump>` from `/dashboard/`. The tag drives the GitHub Actions release run. |
| `flowdash-harness` | [`/package.json`](../package.json)                     | Test runner, demo server orchestrator, and dev tooling. **Not published, not consumed by anyone.**                                                                         | Stays at `0.0.0`, marked `"private": true`. Don't bump it.                                                                |

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

1. **Webpack runs in production mode** — produces minified `dashboard/dist/flowdash.min.js` and `dashboard/dist/flowdash.css`. D3 is externalised; consumers must provide it.
2. The bundle banner (via webpack `BannerPlugin`) embeds the current version from `dashboard/package.json`.
3. **CSS distribution scripts** (PowerShell, see `/scripts/`) can copy the bundle and themes into a local dist tree for smoke-testing.

> Build is idempotent — running it does not modify `package.json`. The version is set explicitly by the maintainer before tagging (see [Cutting a release](#cutting-a-release) below). `dashboard/dist/` is gitignored; it lives in CI builds and on the GitHub Release page.

## Bundle analysis

```bash
cd dashboard
npm run build:analyze
```

Opens [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) at `http://127.0.0.1:8888`.

## Distribution

PowerShell scripts under [`/scripts/`](../scripts/):

| Script                        | Purpose                                                       |
| ----------------------------- | ------------------------------------------------------------- |
| `distribute.ps1`              | Builds the dashboard then copies bundle + CSS to a dist root. |
| `copy-flowdash-css.ps1`       | Copies `flowdash.css` and all theme CSS into a dist tree.     |
| `validate-dashboard-json.ps1` | JSON schema check on dashboard data files.                    |
| `add-node-ids.ps1`            | Adds missing IDs to nodes in dashboard JSON fixtures.         |

These are Windows-only today. Cross-platform replacements are tracked in [`improvement-plan.md`](./improvement-plan.md) under "Out of scope (intentional, for now)".

## Versioning policy

Releases use semver bumps chosen explicitly by the maintainer:

- **Patch** (`1.2.x`) — bug fixes, internal refactors, no API changes.
- **Minor** (`1.x.0`) — new features, backwards-compatible API additions.
- **Major** (`x.0.0`) — breaking API changes (settings schema, public exports, data shape). Discuss in advance and document the migration in [`docs/migration/`](./).
- **Pre-release** (`1.3.0-rc.1`) — `npm version prerelease --preid=rc`. The release workflow auto-marks these as GitHub pre-releases.

## Cutting a release

Releases are **tag-driven**: pushing a `v*` tag (any branch — but conventionally `main`) triggers [`.github/workflows/release.yml`](../.github/workflows/release.yml), which builds the bundle on Linux, packages the theme CSS, and creates a GitHub Release with assets attached.

### Preflight

`npm version` will refuse to run if the package directory has uncommitted changes — it errors with `Git working directory not clean` and does **nothing** (no edit, no commit, no tag). Before you start:

```bash
git checkout main
git pull --ff-only
git status -s dashboard/        # MUST be empty
```

If you have unrelated work in progress, stash it (`git stash -u`) or commit it on a feature branch first.

### Bump + tag + push

From a clean working tree:

```bash
cd dashboard
npm version <patch|minor|major>   # edits package.json + commits + creates tag vX.Y.Z
cd ..
git push --follow-tags            # pushes the bump commit AND the tag
```

> `--follow-tags` only pushes annotated tags reachable from the branch you're pushing. If `npm version` succeeded, the tag exists locally — verify with `git tag --list 'v*'` before pushing.

For a release candidate: `cd dashboard && npm version prerelease --preid=rc` — the workflow auto-marks the GitHub Release as a pre-release.

### Releasing from a feature branch

The workflow fires on **any** `v*` tag push, regardless of which branch the tag points at. You can release directly from a feature branch by tagging that branch's HEAD — but the build will use that branch's state, not `main`'s. Convention is to merge to `main` first via PR, then bump + tag from `main`.

### What CI does on the tag push:

1. Resolves the tag (`vX.Y.Z` or `vX.Y.Z-<prerelease>`), validates the format.
2. Asserts `dashboard/package.json`'s `version` equals the tag's version — fails loudly if you forgot the `npm version` step.
3. Runs `npm ci`, `npm run test:unit`, `npm run build` from `/dashboard/`.
4. Stages four release assets:
   - `LICENSE` (MIT)
   - `flowdash.min.js` (banner with version + MIT notice is embedded in the file)
   - `flowdash.css` (license header inlined at the top)
   - `flowdash-themes-vX.Y.Z.zip` (all theme CSS, folder structure preserved; `LICENSE` included inside the archive)
5. Calls `gh release create` with `--generate-notes` (auto-generated commit summary). Pre-release tags get `--prerelease`.

The full Playwright suite is gated by [`test.yml`](../.github/workflows/test.yml) on the same SHA — only tag commits whose CI is already green.

### Manual re-run

Failed releases (bad token, transient network, etc.) can be re-triggered without re-tagging via the workflow's `workflow_dispatch` input — pass the existing tag name. The workflow is idempotent except for `gh release create`, which will fail if the release already exists; delete the partial release in the GitHub UI first.

### Recovery: I bumped the version but no release was created

Symptoms: `dashboard/package.json` shows the new version, the bump is committed, but no Release appears on GitHub and the workflow never ran.

The workflow fires on **tag push**, not on commit push. If `npm version` aborted on a dirty tree and you finished the bump manually (or rewrote the commit), the `vX.Y.Z` tag is missing. Verify and recover:

```bash
git tag --list 'v*'                       # is vX.Y.Z present?
# If not, tag the bump commit (whatever SHA contains the package.json bump):
git tag vX.Y.Z <sha>
git push origin vX.Y.Z                    # this is what triggers release.yml
```

If the tag exists locally but never reached the remote (e.g. you pushed a different branch and `--follow-tags` didn't pick it up), `git push origin vX.Y.Z` is enough — no need to re-tag.

## npm publishing (currently: not done)

FlowDash is not yet published to npm. External consumers download the `flowdash.min.js` + `flowdash.css` from the GitHub Release page and vendor them.

When publishing becomes a goal, the workflow needs a small extension:

1. Set up [npm trusted publishing (OIDC)](https://docs.npmjs.com/trusted-publishers) for the `flowdash` package — no `NPM_TOKEN` secret required.
2. Add a step to the release workflow after the build:
   ```yaml
   - name: Publish to npm
     working-directory: dashboard
     run: npm publish --provenance --access public
   ```
3. The `"files"` allowlist in `dashboard/package.json` is already configured (`dist/`, `flowdash.css`, `themes/`).
4. Update [`/dashboard/readme.md`](../dashboard/readme.md) with `npm install flowdash` instructions.

Tracked as a follow-up in [`improvement-plan.md`](./improvement-plan.md) "Out of scope".

## When something goes wrong

- **Tag pushed without a matching version bump** — the workflow fails at the version-vs-tag assertion. Delete the bad tag locally and on the remote, run `npm version <bump>` from `/dashboard/`, push again.
- **Two parallel branches both bumped the version** — git will conflict on `dashboard/package.json`. Resolve by picking the higher version and re-bumping if both branches contribute releases.
- **Consumers get a different bundle than expected** — verify they are sourcing `flowdash.min.js` from the right release. The bundle's first comment line embeds the build-time version (webpack `BannerPlugin`).
