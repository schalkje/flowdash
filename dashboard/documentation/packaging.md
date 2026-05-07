# Packaging & Releasing

How to build the `flowdash` bundle and cut a release. The repo has scripts that do the work — this doc just chains them in the right order.

## Prerequisites

- Node.js + npm on PATH.
- From `dashboard/`, install dev dependencies once:

  ```bash
  cd dashboard
  npm install
  ```

## What gets built

`webpack.config.cjs` (entry `js/index.js`) emits to `dashboard/dist/`:

- `flowdash.min.js` — minified bundle, `library: 'flowdash'`, with a banner `flowdash v<version> | (c) schalken.net | MIT`. **D3 is externalised** (`externals.d3 = 'd3'`); consumers must load D3 themselves.
- `flowdash.min.js.LICENSE.txt` — extracted banner.
- `vendors.js` — split vendor chunk (from `optimization.splitChunks`).

`flowdash.css` and the per-theme CSS under `themes/` are **not** bundled by webpack. They are copied alongside the JS by `scripts/distribute.ps1` / `scripts/copy-flowdash-css.ps1`.

## Versioning

The build is idempotent — running `npm run build` does not change `package.json`. The version is set explicitly per release via `npm version <bump>` from `/dashboard/` (see [Cut a release](#cut-a-release)) and embedded in the bundle banner by webpack's `BannerPlugin`.

Local builds during development reuse whatever version is currently in `package.json`; that's fine because they don't ship anywhere.

## Build a bundle (dashboard only)

From `dashboard/`:

```bash
npm run build            # production build → dashboard/dist/flowdash.min.js
npm run build:analyze    # same, plus opens bundle-analyzer at http://127.0.0.1:8888
npm start                # webpack-dev-server with hot reload (no dist write)
```

Open `dashboard/flowdash-bundle.html` over the static server (`python -m http.server 8000` from repo root) to smoke-test the freshly built bundle — it loads `dist/flowdash.min.js` and `flowdash.css`.

> `dashboard/dist/` is gitignored — local builds stay local. Released artefacts live on the GitHub Release page (see below).

## Build + distribute (bundle + CSS to a dist tree)

`scripts/distribute.ps1` is the one-shot release script: it runs `npm install` (only if `node_modules` is missing), runs `npm run build`, then copies `flowdash.css` and every theme `.css` into a dist tree.

```powershell
# Default: writes to dashboard/dist/
pwsh scripts/distribute.ps1

# Custom dist root (e.g. publishing into a sibling repo / consumer app)
pwsh scripts/distribute.ps1 -DistRoot "C:\path\to\consumer\public\flowdash"

# Wipe existing theme CSS in the dist tree before copying
pwsh scripts/distribute.ps1 -Clean
```

After it finishes the dist tree contains:

```
<DistRoot>/
  flowdash.min.js
  flowdash.min.js.LICENSE.txt
  vendors.js
  flowdash.css
  themes/
    <theme>/...css
```

### CSS-only refresh

If the JS bundle hasn't changed but a theme has, skip the build and just sync CSS:

```powershell
pwsh scripts/copy-flowdash-css.ps1                       # → dashboard/dist/
pwsh scripts/copy-flowdash-css.ps1 -DistRoot <path> -Clean
```

## Cut a release

Releases are **automated**. Source of truth: [`.github/workflows/release.yml`](../../.github/workflows/release.yml).

Maintainer flow from a green `main`:

```bash
cd dashboard
npm version <patch|minor|major>   # edits package.json, commits, creates tag vX.Y.Z
cd ..
git push --follow-tags
```

For a release candidate: `npm version prerelease --preid=rc` — the workflow auto-marks the GitHub Release as a pre-release.

CI then:

1. Validates the tag format and asserts `dashboard/package.json` version equals the tag.
2. Runs `npm ci` + `npm run test:unit` + `npm run build` from `/dashboard/`.
3. Stages four assets:
   - `flowdash.min.js`
   - `flowdash.min.js.LICENSE.txt`
   - `flowdash.css`
   - `flowdash-themes-vX.Y.Z.zip` (all theme CSS, folder structure preserved)
4. Calls `gh release create --generate-notes` (auto-generated from commits).

The full Playwright suite is gated by [`test.yml`](../../.github/workflows/test.yml) on the same SHA — only tag commits whose CI is already green.

Re-running a failed release: use the workflow's `workflow_dispatch` input with the existing tag name. If a partial release was created, delete it in the GitHub UI first (`gh release create` is not idempotent).

See [`docs/release.md`](../../docs/release.md) for the broader versioning policy and the npm-publish follow-up.

## Quick reference

| Want                                    | Run                                                           |
| --------------------------------------- | ------------------------------------------------------------- |
| Local dev with hot reload               | `cd dashboard && npm start`                                   |
| Production bundle only (bumps version)  | `cd dashboard && npm run build`                               |
| Production bundle + bundle-analyzer     | `cd dashboard && npm run build:analyze`                       |
| Bundle + CSS + themes into a dist tree  | `pwsh scripts/distribute.ps1 [-DistRoot <p>] [-Clean]`        |
| CSS + themes only (no rebuild)          | `pwsh scripts/copy-flowdash-css.ps1 [-DistRoot <p>] [-Clean]` |
| Validate dashboard JSON before shipping | `pwsh scripts/validate-dashboard-json.ps1`                    |
