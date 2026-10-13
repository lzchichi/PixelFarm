import { crops } from '../data/crops';
import { addItem, countItem, removeItem, equippedItem } from './inventory';
export { equipItem } from './inventory';
import type { CropInstance, FarmPlot, GameState, Point } from './GameState';
import type { Direction } from './interaction';
import { worldToTile } from './grid';
import { seasonForDay,seasonNames } from '../data/timeConfig';
export { advanceDay } from './time';

export interface FarmingArea { width: number; height: number; cultivable: ReadonlySet<string> }
export interface FarmResult { ok: boolean; message: string }
export const tileKey = (tile: Point): string => `${tile.x},${tile.y}`;
export function isCultivable(tile: Point, area: FarmingArea): boolean {
  return Number.isInteger(tile.x) && Number.isInteger(tile.y) && tile.x >= 0 && tile.y >= 0 &&
    tile.x < area.width && tile.y < area.height && area.cultivable.has(tileKey(tile));
}
export function getPlot(state: GameState, tile: Point): FarmPlot { return state.plots[tileKey(tile)] ?? { kind: 'natural' }; }
export function facingTile(position: Point, direction: Direction): Point {
  const tile = worldToTile(position);
  return { x: tile.x + Number(direction === 'right') - Number(direction === 'left'),
    y: tile.y + Number(direction === 'down') - Number(direction === 'up') };
}
export function cropStage(crop: CropInstance): number {
  return crops[crop.id].stages.reduce((stage, day, index) => crop.growthDays >= day ? index : stage, 0);
}
export function isMature(crop: CropInstance): boolean { return crop.growthDays >= crops[crop.id].growthDays; }
export function isWet(state: GameState, plot: FarmPlot): boolean {
  return state.weather === 'rain' || (plot.kind === 'tilled' && plot.wateredOn === state.day);
}
const result = (ok: boolean, message: string): FarmResult => ({ ok, message });
export function useFarmTool(state: GameState, tile: Point, area: FarmingArea): FarmResult {
  if (!isCultivable(tile, area)) return result(false, '这里不能耕种，请选择没有障碍的农田。');
  const plot = getPlot(state, tile); const equipment = equippedItem(state);
  if (equipment === 'hoe') {
    if (plot.kind === 'tilled') return result(false, '这块地已经开垦。');
    state.plots[tileKey(tile)] = { kind: 'tilled', wateredOn: null, crop: null };
    return result(true, '已开垦，可以播种或浇水。');
  }
  if (plot.kind !== 'tilled') return result(false, '请先使用锄头开垦土地。');
  if (equipment === 'watering-can') {
    if (isWet(state, plot)) return result(false, '这块地今天已经湿润。');
    plot.wateredOn = state.day; return result(true, '已浇水，今天的水分已充足。');
  }
  if (equipment === 'hand') {
    if (!plot.crop) return result(false, '这里没有可收获的作物。');
    if (!isMature(plot.crop)) return result(false, '作物还没有成熟。');
    const definition = crops[plot.crop.id];
    const outcome = addItem(state, definition.harvestId, definition.yield);
    if (!outcome.ok) return result(false, '背包已满，作物仍保留在田里。');
    plot.crop = null; return result(true, `收获了 ${definition.yield} 个${definition.name}。`);
  }
  const definition = Object.values(crops).find((crop) => crop.seedId === equipment);
  if (!definition) return result(false, '未知种子。');
  if (plot.crop) return result(false, '这块地已经种有作物。');
  if(!definition.seasons.includes(seasonForDay(state.day)))return result(false,`${definition.name}适合${definition.seasons.map(s=>seasonNames[s]).join('、')}，当前季节不能播种。`);
  if (countItem(state, definition.seedId) < 1) return result(false, '种子不足。');
  removeItem(state, definition.seedId, 1);
  plot.crop = { id: definition.id, growthDays: 0, plantedOn: state.day };
  return result(true, `已种下${definition.name}，记得每天浇水。`);
}
export function settleCropsForDay(state: GameState): number {
  let grown = 0;
  for (const plot of Object.values(state.plots)) {
    if (plot.kind !== 'tilled') continue;
    if (plot.crop && isWet(state, plot) && !isMature(plot.crop)) { plot.crop.growthDays += 1; grown += 1; }
    plot.wateredOn = null;
  }
  return grown;
}
export function clearOutOfSeasonCrops(state:GameState):number {
  let cleared=0;const season=seasonForDay(state.day);
  for(const plot of Object.values(state.plots))if(plot.kind==='tilled'&&plot.crop&&!crops[plot.crop.id].seasons.includes(season)){plot.crop=null;cleared++;}
  return cleared;
}
