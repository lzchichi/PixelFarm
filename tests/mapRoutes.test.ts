import { describe, expect, it } from 'vitest';
import { parseFarmMap } from '../src/data/farmMap';
import { tileToWorld, worldToTile } from '../src/domain/grid';
import type { Rectangle } from '../src/domain/GameState';
import mapJson from '../public/assets/maps/farm.json';

describe('32px farm exploration routes', () => {
  it('keeps farm, houses, pond bank and world edges reachable with the player footprint', () => {
    const map = parseFarmMap(mapJson);
    const obstacles: Rectangle[] = [...map.collisions];
    map.ground.forEach((gid, index) => {
      if (map.collidingTileIds.includes(gid)) obstacles.push({ ...tileToWorld({ x: index % map.width, y: Math.floor(index / map.width) }), width: 32, height: 32 });
    });
    const free = (x: number, y: number): boolean => {
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
      const center = tileToWorld({ x, y }, 32, 'center');
      return !obstacles.some((rect) => center.x - 12 < rect.x + rect.width && center.x + 12 > rect.x &&
        center.y - 14 < rect.y + rect.height && center.y + 14 > rect.y);
    };
    const start = worldToTile(map.spawn); expect(free(start.x, start.y)).toBe(true);
    const queue = [start]; const seen = new Set([`${start.x},${start.y}`]);
    for (let index = 0; index < queue.length; index++) {
      const point = queue[index]; if (!point) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const x = point.x + dx, y = point.y + dy; const key = `${x},${y}`;
        if (free(x, y) && !seen.has(key)) { seen.add(key); queue.push({ x, y }); }
      }
    }
    for (const [x, y] of [[18, 26], [29, 21], [41, 23], [52, 26], [34, 30], [0, 0], [59, 39], [99, 69], [80, 55], [72, 15]] as const) {
      expect(seen.has(`${x},${y}`), `route to tile ${x},${y}`).toBe(true);
    }
  });
});
