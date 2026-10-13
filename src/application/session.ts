import { SaveRepository } from '../adapters/storage/SaveRepository';
import type { FarmMapDefinition } from '../data/farmMap';
import type { GameState, Rectangle } from '../domain/GameState';
import { createFarmingArea } from '../game/world/farmingArea';
import { canPlaceBuilding } from '../domain/buildings';
export const saveRepository = new SaveRepository(() => localStorage);
export type WorldMaps = { farm: FarmMapDefinition; town: FarmMapDefinition };
type Maps = FarmMapDefinition | WorldMaps;
export function validateWorldState(state: GameState, maps: Maps): boolean {
  if (!('farm' in maps) && state.mapId !== 'farm') return false;
  const map = 'farm' in maps ? maps[state.mapId] : maps;
  const farm = 'farm' in maps ? maps.farm : maps;
  const box: Rectangle = { x: state.player.x - 12, y: state.player.y - 14, width: 24, height: 28 };
  if (box.x < 0 || box.y < 0 || box.x + box.width > map.width * map.tileSize || box.y + box.height > map.height * map.tileSize) return false;
  if (map.collisions.some(rect => box.x < rect.x + rect.width && box.x + box.width > rect.x + 0.001 && box.y < rect.y + rect.height && box.y + box.height > rect.y + 0.001)) return false;
  for (let y = Math.floor(box.y / 32); y <= Math.floor((box.y + box.height - 0.001) / 32); y++) {
    for (let x = Math.floor(box.x / 32); x <= Math.floor((box.x + box.width - 0.001) / 32); x++) {
      if (map.collidingTileIds.includes(map.ground[y * map.width + x]!)) return false;
    }
  }
  const area = createFarmingArea(farm);
  if(state.expansion.buildings.some(b=>!canPlaceBuilding(state,farm,b.kind,b,b.id).ok))return false;
  return Object.keys(state.plots).every(key => area.cultivable.has(key));
}
export function loadGame(map: Maps) {
  const outcome = saveRepository.load();
  if (outcome.ok && !validateWorldState(outcome.state, map)) return { ok: false as const, message: '存档位置或农田与当前地图不兼容，已保留原存档。' };
  return outcome;
}
export function saveGame(state: GameState, map: Maps, repository: SaveRepository = saveRepository) {
  if (!validateWorldState(state, map)) return { ok: false as const, message: '保存失败：角色位置或农田不合法，原存档未改动。' };
  return repository.save(state, previous => validateWorldState(previous, map));
}
