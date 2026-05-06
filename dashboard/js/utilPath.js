const ConnectorSide = Object.freeze({
  TOP: 'top',
  RIGHT: 'right',
  BOTTOM: 'bottom',
  LEFT: 'left',
});

export function computeConnectionPoints(x, y, width, height) {
  return {
    top: { side: ConnectorSide.TOP, x: x, y: y - height / 2 },
    bottom: { side: ConnectorSide.BOTTOM, x: x, y: y + height / 2 },
    left: { side: ConnectorSide.LEFT, x: x - width / 2, y: y },
    right: { side: ConnectorSide.RIGHT, x: x + width / 2, y: y },
  };
}

export function computeLocalConnectionPoints(width, height) {
  return {
    top: { x: width / 2, y: 0 },
    bottom: { x: width / 2, y: height },
    left: { x: 0, y: height / 2 },
    right: { x: width, y: height / 2 },
  };
}

export function generateEdgePath(edge) {
  const sourceNode = edge.source;
  const targetNode = edge.target;

  const sourceConnectionPoints = sourceNode.computeConnectionPoints(
    edge.x1,
    edge.y1,
    sourceNode.data.width,
    sourceNode.data.height,
  );

  const targetConnectionPoints = targetNode.computeConnectionPoints(
    edge.x2,
    edge.y2,
    targetNode.data.width,
    targetNode.data.height,
  );

  let sourcePoint, targetPoint;

  // look for closest connection points to straight line
  let minDistance = Number.MAX_VALUE;
  Object.values(sourceConnectionPoints).forEach((source) => {
    Object.values(targetConnectionPoints).forEach((target) => {
      // initialize source and target points; this fixes the nodeColumns object, when all collapsed, and one node is expanded
      if (!sourcePoint) sourcePoint = source;
      if (!targetPoint) targetPoint = target;

      // exclude wrong connections
      // Vertical constraints (top and bottom)
      if (
        (source.side == ConnectorSide.BOTTOM && source.y > target.y) ||
        (target.side == ConnectorSide.TOP && source.y > target.y) ||
        (source.side == ConnectorSide.TOP && source.y < target.y) ||
        (target.side == ConnectorSide.BOTTOM && source.y < target.y)
      ) {
        // console.log("                            wrong 1:", source.y, target.y);
        return;
      }
      // Horizontal constraints (left and right)
      if (
        (source.side == ConnectorSide.LEFT && source.x < target.x) ||
        (source.side == ConnectorSide.RIGHT && source.x > target.x) ||
        (target.side == ConnectorSide.RIGHT && source.x < target.x) ||
        (target.side == ConnectorSide.LEFT && source.x > target.x)
      ) {
        // console.log("                            wrong 2:", source.x, target.x);
        return;
      }

      // calculate distance
      const distance = Math.sqrt((source.x - target.x) ** 2 + (source.y - target.y) ** 2);
      // store if it is smaller than the current minimum distance
      if (distance < minDistance) {
        // console.warn("    Found new minimum distance:", distance, source, target);
        minDistance = distance;
        sourcePoint = source;
        targetPoint = target;
      }
    });
  });

  // Calculate waypoints
  // there are different scenarios to consider:
  let waypoints = [];
  // console.log("    Source Point:", sourcePoint);
  // console.log("    Target Point:", targetPoint);
  const midX = (targetPoint.x - sourcePoint.x) / 2;
  const midY = (targetPoint.y - sourcePoint.y) / 2;
  const curveMargin = edge.settings.curveMargin || 0;
  if (
    (sourcePoint.side == ConnectorSide.LEFT && targetPoint.side == ConnectorSide.RIGHT) ||
    (sourcePoint.side == ConnectorSide.RIGHT && targetPoint.side == ConnectorSide.LEFT)
  ) {
    // left to right or right to left
    // console.log("    Generating Edge Path: Left to Right or Right to Left");
    waypoints = [
      // // for a curve
      [sourcePoint.x + midX * (1 - curveMargin), sourcePoint.y + midY * curveMargin], // Move horizontally to half the distance
      [sourcePoint.x + midX * (1 + curveMargin), targetPoint.y - midY * curveMargin], // Stay on x and move vertically
    ];
  } else if (
    (sourcePoint.side == ConnectorSide.BOTTOM && targetPoint.side == ConnectorSide.TOP) ||
    (sourcePoint.side == ConnectorSide.TOP && targetPoint.side == ConnectorSide.BOTTOM)
  ) {
    // bottom to top or top to bottom
    // console.log("    Generating Edge Path: Bottom to Top or Top to Bottom", midX, midY);
    if (Math.abs(midY) < 20 && edge.settings.curved) {
      waypoints = [
        // // for a curve
        [sourcePoint.x + midX * curveMargin, targetPoint.y], // Move vertically to half the distance
        [targetPoint.x, sourcePoint.y], // Stay on y and move horizontal
      ];
    } else {
      waypoints = [
        // // for a curve
        [sourcePoint.x + midX * curveMargin, sourcePoint.y + midY * (1 - curveMargin)], // Move vertically to half the distance
        [targetPoint.x - midX * curveMargin, sourcePoint.y + midY * (1 + curveMargin)], // Stay on y and move horizontal
      ];
    }
  } else if (
    (sourcePoint.side == ConnectorSide.BOTTOM || sourcePoint.side == ConnectorSide.TOP) &&
    (targetPoint.side == ConnectorSide.LEFT || targetPoint.side == ConnectorSide.RIGHT)
  ) {
    // bottom to top or top to bottom
    waypoints = [
      // // for a curve
      [sourcePoint.x + midX * curveMargin, targetPoint.y - midY * curveMargin], // Stay on y and move horizontal
    ];
  } else if (sourcePoint.side == ConnectorSide.TOP && targetPoint.side == ConnectorSide.TOP) {
    // bottom to top or top to bottom
    waypoints = [
      // // for a curve
      [sourcePoint.x + midX * curveMargin, targetPoint.y - midY * curveMargin], // Stay on y and move horizontal
    ];
  } else if (
    (sourcePoint.side == ConnectorSide.LEFT || sourcePoint.side == ConnectorSide.RIGHT) &&
    (targetPoint.side == ConnectorSide.TOP || targetPoint.side == ConnectorSide.BOTTOM)
  ) {
    // bottom to top or top to bottom
    waypoints = [
      // // for a curve
      [targetPoint.x - midX * curveMargin, sourcePoint.y + midY * curveMargin], // Stay on y and move horizontal
    ];
  } else {
    console.error('    ERROR: Unsupported edge connection:', sourcePoint.side, targetPoint.side);
  }

  //   const result = [edge.sourcePoint, toPoint(sourcePoint), ...waypoints, toPoint(targetPoint)];
  const result = [toPoint(sourcePoint), ...waypoints, toPoint(targetPoint)];
  // console.log("    Generating Edge Path:", result, edge.sourcePoint);
  //   return [sourcePoint, ...waypoints, targetPoint];
  return result;
}

function toPoint(point) {
  return [point.x, point.y];
}
export function generateDirectEdge(edge) {
  return [edge.sourcePoint, edge.targetPoint];
}

export function generateGhostEdge(edge) {
  // Return exact center points in global coordinates by reusing edge coordinate getters
  const start = [edge.x1, edge.y1];
  const end = [edge.x2, edge.y2];
  return [start, end];
}

// getNodeMidpoint no longer used – edge.x1/y1 and edge.x2/y2 compute global centers reliably

// Helper function to get zone transforms for a node. Called from the four
// edge coordinate getters (x1/y1/x2/y2) on every read, so it must be cheap.
// InnerContainerZone caches the numeric offset as `transformOffset` when it
// builds the coordinate system; we read that directly and only fall back to
// regex-parsing the `translate(…)` string on legacy zones that haven't been
// upgraded yet.
export function getZoneTransforms(node) {
  if (!node || !node.parentNode || !node.parentNode.zoneManager) {
    return { x: 0, y: 0 };
  }

  const innerContainerZone = node.parentNode.zoneManager.innerContainerZone;
  if (!innerContainerZone || !innerContainerZone.coordinateSystem) {
    return { x: 0, y: 0 };
  }

  const cached = innerContainerZone.coordinateSystem.transformOffset;
  if (cached && typeof cached.x === 'number' && typeof cached.y === 'number') {
    return cached;
  }

  // Fallback for legacy code paths that build coordinateSystem without
  // populating transformOffset.
  const transform = innerContainerZone.coordinateSystem.transform;
  const transformMatch = transform && transform.match(/translate\(([^,]+),\s*([^)]+)\)/);

  if (transformMatch) {
    const offsetX = parseFloat(transformMatch[1]);
    const offsetY = parseFloat(transformMatch[2]);
    return { x: offsetX, y: offsetY };
  }

  return { x: 0, y: 0 };
}
