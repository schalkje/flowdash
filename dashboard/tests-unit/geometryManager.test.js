import { describe, it, expect } from 'vitest';
import { GeometryManager } from '../js/geometryManager.js';

// GeometryManager operates on { x, y, data: { width, height } } records — the
// shape used by the live node objects after the constructors have run.

const node = (x, y, w, h) => ({ x, y, data: { width: w, height: h } });

describe('GeometryManager.calculateBoundingBox', () => {
  it('returns a zero box for an empty array', () => {
    expect(GeometryManager.calculateBoundingBox([])).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });

  it('returns a tight bounding box around centered nodes', () => {
    const bb = GeometryManager.calculateBoundingBox([node(0, 0, 10, 10), node(20, 0, 10, 10)]);
    expect(bb).toEqual({ x: -5, y: -5, width: 30, height: 10 });
  });

  it('expands the box by 2*padding on each axis when padding is given', () => {
    const bb = GeometryManager.calculateBoundingBox([node(0, 0, 10, 10)], 5);
    expect(bb).toEqual({ x: -10, y: -10, width: 20, height: 20 });
  });

  it('handles a single node', () => {
    const bb = GeometryManager.calculateBoundingBox([node(50, 100, 20, 30)]);
    expect(bb).toEqual({ x: 40, y: 85, width: 20, height: 30 });
  });
});

describe('GeometryManager.calculateContainerSize', () => {
  it('adds horizontal and vertical margins to the bounding box', () => {
    const size = GeometryManager.calculateContainerSize(
      [node(0, 0, 10, 10), node(20, 0, 10, 10)],
      { top: 4, right: 6, bottom: 8, left: 2 },
      undefined,
    );
    // bounding box = 30 x 10; +left+right=8 → width 38; +top+bottom=12 → height 22
    expect(size).toEqual({ width: 38, height: 22 });
  });
});

describe('GeometryManager.calculateMinimumSize', () => {
  it('returns the supplied default when the node list is empty', () => {
    const size = GeometryManager.calculateMinimumSize([]);
    expect(size).toEqual({ width: 100, height: 100 });
  });

  it('returns the bounding box when it exceeds the default', () => {
    const size = GeometryManager.calculateMinimumSize([node(0, 0, 200, 50)], {
      width: 100,
      height: 100,
    });
    expect(size.width).toBe(200);
    expect(size.height).toBe(100);
  });

  it('honors the default for any axis the bounding box does not exceed', () => {
    const size = GeometryManager.calculateMinimumSize([node(0, 0, 50, 200)], {
      width: 100,
      height: 100,
    });
    expect(size.width).toBe(100);
    expect(size.height).toBe(200);
  });
});

describe('GeometryManager.adjustPositionForContainer', () => {
  it('translates a node by the container origin', () => {
    const adjusted = GeometryManager.adjustPositionForContainer({ x: 5, y: 5 }, { x: 10, y: 20 });
    expect(adjusted).toEqual({ x: 15, y: 25 });
  });
});

describe('GeometryManager.getNodeBounds', () => {
  it('returns left/right/top/bottom edges around the node center', () => {
    const bounds = GeometryManager.getNodeBounds(node(100, 100, 40, 20));
    expect(bounds.left).toBe(80);
    expect(bounds.right).toBe(120);
    expect(bounds.top).toBe(90);
    expect(bounds.bottom).toBe(110);
  });
});

describe('GeometryManager.getNodeCenter', () => {
  it('returns the {x, y} pair', () => {
    expect(GeometryManager.getNodeCenter(node(7, 9, 0, 0))).toEqual({ x: 7, y: 9 });
  });
});
