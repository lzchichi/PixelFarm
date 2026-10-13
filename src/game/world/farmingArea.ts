import type { FarmMapDefinition } from '../../data/farmMap';
import { artAssets } from '../../data/artAssets';
import type { FarmingArea } from '../../domain/farming';
import { tileKey } from '../../domain/farming';

export function createFarmingArea(map: FarmMapDefinition): FarmingArea {
  const farmlandId = artAssets.tiles.findIndex((tile) => tile.name === 'farmland') + 1;
  const cultivable = new Set<string>();
  map.ground.forEach((id, index) => {
    if (id !== farmlandId || map.collidingTileIds.includes(id)) return;
    const x = index % map.width, y = Math.floor(index / map.width), size = map.tileSize;
    if (map.collisions.some((rect) => x * size < rect.x + rect.width && (x + 1) * size > rect.x &&
        y * size < rect.y + rect.height && (y + 1) * size > rect.y)) return;
    cultivable.add(tileKey({ x, y }));
  });
  return { width: map.width, height: map.height, cultivable };
}
