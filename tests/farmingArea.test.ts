import farmMap from '../public/assets/maps/farm.json';
import { expect, it } from 'vitest';
import { parseFarmMap } from '../src/data/farmMap';
import { createFarmingArea } from '../src/game/world/farmingArea';
import { isCultivable } from '../src/domain/farming';
it('allows farmland and excludes roads, water, buildings and decoration footprints', () => {
  const map = parseFarmMap(farmMap);
  const area = createFarmingArea(map);
  expect(isCultivable({ x: 18, y: 26 }, area)).toBe(true);
  expect(isCultivable({ x: 29, y: 23 }, area)).toBe(false);
  expect(isCultivable({ x: 40, y: 30 }, area)).toBe(false);
  expect(isCultivable({ x: 28, y: 18 }, area)).toBe(false);
  const scarecrow = map.collisions.find((rect) => rect.x >= 528 && rect.x < 576 && rect.y >= 792 && rect.y < 864);
  expect(scarecrow).toBeDefined();
  if (!scarecrow) throw new Error('Expected obstacle');
  expect(isCultivable({ x: Math.floor(scarecrow.x / 32), y: Math.floor(scarecrow.y / 32) }, area)).toBe(false);
  const blockedFarmland = createFarmingArea({ ...map, collidingTileIds: [...map.collidingTileIds, 3] });
  expect(blockedFarmland.cultivable.size).toBe(0);
});
