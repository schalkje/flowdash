import { describe, it, expect } from 'vitest';
import { computeConnectionPoints, computeLocalConnectionPoints } from '../js/utilPath.js';

describe('computeConnectionPoints', () => {
  it('places connection points at the centers of each side around (x, y)', () => {
    const points = computeConnectionPoints(100, 50, 40, 20);
    expect(points.top).toEqual({ side: 'top', x: 100, y: 40 });
    expect(points.bottom).toEqual({ side: 'bottom', x: 100, y: 60 });
    expect(points.left).toEqual({ side: 'left', x: 80, y: 50 });
    expect(points.right).toEqual({ side: 'right', x: 120, y: 50 });
  });

  it('handles zero-size rectangles by collapsing all sides to the center', () => {
    const points = computeConnectionPoints(10, 10, 0, 0);
    expect(points.top).toEqual({ side: 'top', x: 10, y: 10 });
    expect(points.bottom).toEqual({ side: 'bottom', x: 10, y: 10 });
    expect(points.left).toEqual({ side: 'left', x: 10, y: 10 });
    expect(points.right).toEqual({ side: 'right', x: 10, y: 10 });
  });

  it('handles negative coordinates without sign-flipping the offsets', () => {
    const points = computeConnectionPoints(-5, -5, 4, 6);
    expect(points.top.y).toBe(-8);
    expect(points.bottom.y).toBe(-2);
    expect(points.left.x).toBe(-7);
    expect(points.right.x).toBe(-3);
  });

  it('tags each point with the matching ConnectorSide enum value', () => {
    const points = computeConnectionPoints(0, 0, 2, 2);
    expect(points.top.side).toBe('top');
    expect(points.bottom.side).toBe('bottom');
    expect(points.left.side).toBe('left');
    expect(points.right.side).toBe('right');
  });
});

describe('computeLocalConnectionPoints', () => {
  it('returns side midpoints in local (top-left origin) coordinates', () => {
    const points = computeLocalConnectionPoints(100, 60);
    expect(points.top).toEqual({ x: 50, y: 0 });
    expect(points.bottom).toEqual({ x: 50, y: 60 });
    expect(points.left).toEqual({ x: 0, y: 30 });
    expect(points.right).toEqual({ x: 100, y: 30 });
  });

  it('produces a single (0, 0) anchor for zero-size local boxes', () => {
    const points = computeLocalConnectionPoints(0, 0);
    expect(points.top).toEqual({ x: 0, y: 0 });
    expect(points.bottom).toEqual({ x: 0, y: 0 });
    expect(points.left).toEqual({ x: 0, y: 0 });
    expect(points.right).toEqual({ x: 0, y: 0 });
  });
});
