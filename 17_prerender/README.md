# 17_prerender — Cold vs prerendered comparison

Loads the same fixture twice — once with `usePrerender: false` and once with the `*.prerender.json` fast-path — and compares the phase timings reported by the dashboard's built-in instrumentation. See [`/dashboard/documentation/pre-render.md`](../dashboard/documentation/pre-render.md) and [`PRERENDER_USAGE.md`](../dashboard/documentation/PRERENDER_USAGE.md).

| Demo | Purpose |
|------|---------|
| [`01_basic/basic.html`](./01_basic/basic.html) | Side-by-side load with phase timings + warm/cold ratio. Shorter is better; ratio < 1 means the fast-path actually helped. |
