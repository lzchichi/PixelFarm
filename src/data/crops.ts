import { items, type CropId, type SeedId, type ItemId } from './items';
import type { Season } from './timeConfig';
export type { CropId, SeedId, ItemId, Equipment } from './items';
export interface CropDefinition {
  id: CropId; name: string; seedId: SeedId; seedPrice: number;
  growthDays: number; stages: readonly number[]; harvestId: CropId; yield: number;
  seasons:readonly Season[];
}
export const crops: Record<CropId, CropDefinition> = {
  turnip: { id: 'turnip', name: '萝卜', seedId: 'seed-turnip', seedPrice: items['seed-turnip'].buyPrice ?? 0, growthDays: 4, stages: [0, 1, 2, 4], harvestId: 'turnip', yield: 1,seasons:['spring','autumn'] },
  potato: { id: 'potato', name: '土豆', seedId: 'seed-potato', seedPrice: items['seed-potato'].buyPrice ?? 0, growthDays: 6, stages: [0, 1, 3, 6], harvestId: 'potato', yield: 1,seasons:['spring','summer'] },
  strawberry: { id: 'strawberry', name: '草莓', seedId: 'seed-strawberry', seedPrice: items['seed-strawberry'].buyPrice ?? 0, growthDays: 8, stages: [0, 2, 5, 8], harvestId: 'strawberry', yield: 1,seasons:['spring','summer'] },
  pumpkin: { id: 'pumpkin', name: '南瓜', seedId: 'seed-pumpkin', seedPrice: items['seed-pumpkin'].buyPrice ?? 0, growthDays: 10, stages: [0, 2, 6, 10], harvestId: 'pumpkin', yield: 1,seasons:['summer','autumn'] },
};
for (const crop of Object.values(crops)) {
  if (crop.seedId !== `seed-${crop.id}` || crop.harvestId !== crop.id || !Number.isInteger(crop.growthDays) || crop.growthDays <= 0 ||
      !Number.isInteger(crop.seedPrice) || crop.seedPrice < 0 || !Number.isInteger(crop.yield) || crop.yield <= 0 ||
      crop.stages[0] !== 0 || crop.stages.at(-1) !== crop.growthDays ||
      crop.stages.some((day, index) => !Number.isInteger(day) || (index > 0 && day <= (crop.stages[index - 1] ?? -1)))) throw new Error('作物配置不合法');
}
export function itemName(id: ItemId): string {
  return items[id].name;
}
