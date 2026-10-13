import { describe, expect, it } from 'vitest';
import { worldToTile, tileToWorld } from '../src/domain/grid';

describe('world / tile coordinates', () => {
  it.each([
    [0, 0, { x: 0, y: 0 }], [15.99, 31.99, { x: 0, y: 1 }],
    [16, 32, { x: 1, y: 2 }], [959, 639, { x: 59, y: 39 }],
    [-0.01, -16.01, { x: -1, y: -2 }],
  ])('floors world (%s,%s) to its containing tile', (x, y, expected) => {
    expect(worldToTile({ x, y }, 16)).toEqual(expected);
  });
  it('supports non-default tile size and returns origin or center explicitly', () => {
    expect(worldToTile({ x: 63, y: 64 }, 32)).toEqual({ x: 1, y: 2 });
    expect(tileToWorld({ x: 3, y: 4 }, 16)).toEqual({ x: 48, y: 64 });
    expect(tileToWorld({ x: 3, y: 4 }, 16, 'center')).toEqual({ x: 56, y: 72 });
    expect(tileToWorld({ x: -1, y: -2 }, 16)).toEqual({ x: -16, y: -32 });
  });
  it('rejects invalid sizes and non-finite coordinates instead of making bad positions', () => {
    for (const size of [0, -16, NaN, Infinity]) {
      expect(() => worldToTile({ x: 1, y: 1 }, size)).toThrow();
      expect(() => tileToWorld({ x: 1, y: 1 }, size)).toThrow();
    }
    expect(() => worldToTile({ x: NaN, y: 1 })).toThrow();
    expect(() => tileToWorld({ x: 1.5, y: 1 })).toThrow();
  });
  it('uses the new 32 pixel world grid by default', () => {
    expect(worldToTile({ x: 31, y: 63 })).toEqual({ x: 0, y: 1 });
    expect(worldToTile({ x: 1919, y: 1279 })).toEqual({ x: 59, y: 39 });
    expect(tileToWorld({ x: 3, y: 4 })).toEqual({ x: 96, y: 128 });
    expect(tileToWorld({ x: 3, y: 4 }, undefined, 'center')).toEqual({ x: 112, y: 144 });
  });
});
