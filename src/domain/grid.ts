import type { Point } from './GameState';

function validate(point: Point, tileSize: number): void {
  if (!Number.isFinite(tileSize) || tileSize <= 0 || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error('坐标必须为有限数值，瓦片尺寸必须大于 0');
}
export function worldToTile(point: Point, tileSize = 32): Point {
  validate(point, tileSize);
  return { x: Math.floor(point.x / tileSize), y: Math.floor(point.y / tileSize) };
}
export function tileToWorld(tile: Point, tileSize = 32, anchor: 'origin' | 'center' = 'origin'): Point {
  validate(tile, tileSize);
  if (!Number.isInteger(tile.x) || !Number.isInteger(tile.y)) throw new Error('瓦片坐标必须为整数');
  const offset = anchor === 'center' ? tileSize / 2 : 0;
  return { x: tile.x * tileSize + offset, y: tile.y * tileSize + offset };
}
