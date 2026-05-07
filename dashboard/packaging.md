# Packaging

See [`documentation/packaging.md`](documentation/packaging.md) for the full build & release procedure (prerequisites, version bumping, `scripts/distribute.ps1`, CSS-only refresh, and release steps).

Quick start:

```bash
cd dashboard
npm install            # once
npm run build          # patch-bumps version, writes dashboard/dist/flowdash.min.js
```

Build + copy CSS/themes into a dist tree:

```powershell
pwsh scripts/distribute.ps1
```
