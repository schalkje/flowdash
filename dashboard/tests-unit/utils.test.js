import { describe, it, expect } from 'vitest';
import { computeBoundingBox } from '../js/utils.js';

// computeBoundingBox is a pure function over {x, y, width, height} records.
// We do NOT exercise getTextWidth / getComputedDimensions / getRelativeBBox here:
// those touch the DOM via d3.select / getBBox / getCTM and require integration.

describe('computeBoundingBox', () => {
  it('returns the tight bounding box around centered rectangles', () => {
    const nodes = [
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 0, width: 10, height: 10 },
    ];
    const bb = computeBoundingBox(nodes);
    expect(bb).toEqual({ x: -5, y: -5, width: 30, height: 10 });
  });

  it('treats missing coordinate fields as zero', () => {
    const nodes = [{}, { width: 4, height: 4 }];
    const bb = computeBoundingBox(nodes);
    // Both nodes contribute (0,0) center; second has dimensions ±2.
    expect(bb).toEqual({ x: -2, y: -2, width: 4, height: 4 });
  });

  it('handles a single node correctly', () => {
    const bb = computeBoundingBox([{ x: 50, y: 100, width: 20, height: 30 }]);
    expect(bb).toEqual({ x: 40, y: 85, width: 20, height: 30 });
  });

  it('handles negative coordinates', () => {
    const nodes = [
      { x: -10, y: -10, width: 4, height: 4 },
      { x: -20, y: -20, width: 4, height: 4 },
    ];
    const bb = computeBoundingBox(nodes);
    expect(bb.x).toBe(-22);
    expect(bb.y).toBe(-22);
    expect(bb.width).toBe(14);
    expect(bb.height).toBe(14);
  });
});
