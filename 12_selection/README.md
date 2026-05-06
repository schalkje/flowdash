# 12_selection — Selection model demos

Demonstrates the FlowDash **selection** behavior:

- **Single click** selects a single node exclusively.
- **Double click** computes a _Selection Neighborhood_ (a BFS over edges with depth limits from `settings.selector.incomming` and `settings.selector.outgoing`) and zooms to its bounding box.
- Both behaviors are overridable via `dashboard.main.root.onClick` and `dashboard.main.root.onDblClick`.

See [`/dashboard/documentation/auto-zoom-behavior.md`](../dashboard/documentation/auto-zoom-behavior.md) for the underlying algorithm.

## Demos

| Path                                           | Purpose                                                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [`01_basic/basic.html`](./01_basic/basic.html) | Adjustable incoming/outgoing depth sliders against a small fixed graph. Shows the neighborhood grow as depth increases. |
