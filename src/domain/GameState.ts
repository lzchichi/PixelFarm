import type { CropId } from '../data/crops';
import type { InventoryState } from './inventory';
import { createVillageProgress, type VillageProgress } from './village';
import type { AnimalState } from './animals';
import type { PlacedBuilding } from './buildings';
import type { FarmResourceId } from '../data/farmResources';
export interface Point { x: number; y: number }
export interface Rectangle extends Point { width: number; height: number }
export interface CropInstance { id: CropId; growthDays: number; plantedOn: number }
export type FarmPlot = { kind: 'natural' } | { kind: 'tilled'; wateredOn: number | null; crop: CropInstance | null };
export interface GameState {
  schemaVersion: 6; mapId: 'farm' | 'town'; player: Point; day: number; weather: 'clear' | 'rain' | 'cloudy'; coins: number;
  minute: number; lastSettledDay: number; weatherSeed: number;
  inventory: InventoryState; hotbar: (number | null)[]; activeHotbar: number; nextTradeId: number;
  plots: Record<string, FarmPlot>;
  village: VillageProgress;
  expansion: { nextAnimalId:number; animals:AnimalState[]; nextBuildingId:number; buildings:PlacedBuilding[]; gatheredOn:Partial<Record<FarmResourceId,number>> };
}

export function createGameState(spawn: Point): GameState {
  const slots: InventoryState['slots'] = Array.from({ length: 24 }, () => null);
  slots[0] = { id: 'hoe', quantity: 1, quality: 'normal' };
  slots[1] = { id: 'watering-can', quantity: 1, quality: 'normal' };
  slots[2] = { id: 'seed-turnip', quantity: 10, quality: 'normal' };
  return { schemaVersion: 6, mapId: 'farm', player: { ...spawn }, day: 1, weather: 'clear', coins: 500, village: createVillageProgress(), expansion:{nextAnimalId:1,animals:[],nextBuildingId:1,buildings:[],gatheredOn:{}},
    minute: 360, lastSettledDay: 0, weatherSeed: 1,
    inventory: { slots, revision: 0 }, hotbar: [null, 0, 1, 2, 3, 4, 5, 6], activeHotbar: 1, nextTradeId: 1, plots: {} };
}

