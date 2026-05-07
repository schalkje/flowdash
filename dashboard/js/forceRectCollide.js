// @ts-check

export function rectCollide() {
  let nodes;

  const marginX = 4;
  const marginY = 14;

  function force() {
    const n = nodes.length;
    const quadtree = d3
      .quadtree()
      .x((d) => d.x)
      .y((d) => d.y)
      .addAll(nodes);

    for (let i = 0; i < n; ++i) {
      const node = nodes[i];
      const nx1 = node.x - node.width / 2,
        nx2 = node.x + node.width / 2,
        ny1 = node.y - node.height / 2,
        ny2 = node.y + node.height / 2;

      quadtree.visit(function (quad, x1, y1, x2, y2) {
        if (!quad.data || quad.data.index <= i) return false;

        const data = quad.data;
        let dx = node.x - data.x || Math.random() - 0.5;
        let dy = node.y - data.y || Math.random() - 0.5;

        const xSpacing = (node.width + data.width) / 2 + marginX,
          ySpacing = (node.height + data.height) / 2 + marginY,
          absDx = Math.abs(dx), // || (Math.random() );
          absDy = Math.abs(dy); // || (Math.random() );

        if (absDx < xSpacing && absDy < ySpacing) {
          const overlapX = xSpacing - absDx,
            overlapY = ySpacing - absDy;

          // Resolve collision by adjusting positions
          if (overlapX < overlapY) {
            dx = dx || Math.random() - 0.5; // Avoid division by zero
            const adjustX = (overlapX / absDx) * 0.5;
            node.x += dx * adjustX;
            data.x -= dx * adjustX;
          } else {
            dy = dy || Math.random() - 0.5; // Avoid division by zero
            const adjustY = (overlapY / absDy) * 0.5;
            node.y += dy * adjustY;
            data.y -= dy * adjustY;
          }
        }

        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    }
  }

  force.initialize = function (_) {
    nodes = _;
    for (let i = 0; i < nodes.length; ++i) {
      nodes[i].index = i; // Assign an index to each node
    }
  };

  return force;
}
