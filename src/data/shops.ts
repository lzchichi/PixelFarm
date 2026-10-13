import type { ItemId, ItemQuality } from './items';
export interface ShopDefinition {
  id: string; name: string; interactionId: string;
  buys: readonly ItemId[]; sells: readonly ItemId[];
  buyRate: number; sellRate: number; qualityRates: Record<ItemQuality, number>;
}
export const shops: Record<string, ShopDefinition> = {
  'farm-shop': { id: 'farm-shop', name: '青芽种子铺', interactionId: 'farm-shop',
    sells: ['seed-turnip', 'seed-potato', 'seed-strawberry', 'seed-pumpkin', 'feed','kit-fence','kit-lamp','kit-bench'],
    buys: ['turnip', 'potato', 'strawberry', 'pumpkin','egg','milk','wood','stone','wild-mushroom'], buyRate: 1, sellRate: 1, qualityRates: { normal: 1 } },
};
