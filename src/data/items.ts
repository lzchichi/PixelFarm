export type CropId = 'turnip' | 'potato' | 'strawberry' | 'pumpkin';
export type SeedId = `seed-${CropId}`;
export type ItemId = 'hoe' | 'watering-can' | SeedId | CropId | 'wood' | 'stone' | 'wild-mushroom' | 'feed' | 'egg' | 'milk' | 'kit-fence' | 'kit-lamp' | 'kit-bench';
export type Equipment = 'hand' | ItemId;
export type ItemQuality = 'normal';
export interface ItemDefinition {
  id: ItemId; name: string; kind: 'tool' | 'seed' | 'crop' | 'resource' | 'supply' | 'product' | 'building'; description: string;
  maxStack: number; buyPrice: number | null; sellPrice: number | null;
}
const tool = (id: 'hoe' | 'watering-can', name: string, description: string): ItemDefinition =>
  ({ id, name, kind: 'tool', description, maxStack: 1, buyPrice: null, sellPrice: null });
const seed = (id: SeedId, name: string, buyPrice: number): ItemDefinition =>
  ({ id, name: `${name}种子`, kind: 'seed', description: `种在空耕地，每天浇水后跨天生长。`, maxStack: 99, buyPrice, sellPrice: null });
const crop = (id: CropId, name: string, sellPrice: number): ItemDefinition =>
  ({ id, name, kind: 'crop', description: `农田收获的${name}，可以出售给种子铺。`, maxStack: 99, buyPrice: null, sellPrice });
export const items: Record<ItemId, ItemDefinition> = {
  hoe: tool('hoe', '锄头', '开垦面前一格可种植土地。'),
  'watering-can': tool('watering-can', '水壶', '给面前一格耕地补充当天水分。'),
  'seed-turnip': seed('seed-turnip', '萝卜', 10), 'seed-potato': seed('seed-potato', '土豆', 30),
  'seed-strawberry': seed('seed-strawberry', '草莓', 50), 'seed-pumpkin': seed('seed-pumpkin', '南瓜', 80),
  turnip: crop('turnip', '萝卜', 25), potato: crop('potato', '土豆', 65),
  strawberry: crop('strawberry', '草莓', 110), pumpkin: crop('pumpkin', '南瓜', 180),
  wood: { id: 'wood', name: '木材', kind: 'resource', description: '采集的木材，可出售、制作建筑或用于委托。', maxStack: 99, buyPrice: null, sellPrice: 5 },
  stone: { id: 'stone', name: '石料', kind: 'resource', description: '采集的石料，可出售、制作建筑或用于委托。', maxStack: 99, buyPrice: null, sellPrice: 5 },
  'wild-mushroom':{id:'wild-mushroom',name:'野生蘑菇',kind:'resource',description:'林地采集的野生植物，可在商店出售。',maxStack:99,buyPrice:null,sellPrice:20},
  feed: {id:'feed',name:'饲料',kind:'supply',description:'每只动物每天一份，喂食后次日生产。',maxStack:99,buyPrice:10,sellPrice:null},
  egg: {id:'egg',name:'鸡蛋',kind:'product',description:'鸡舍收取的鸡蛋，可出售。',maxStack:99,buyPrice:null,sellPrice:40},
  milk: {id:'milk',name:'牛奶',kind:'product',description:'谷仓收取的牛奶，可出售。',maxStack:99,buyPrice:null,sellPrice:100},
  'kit-fence':{id:'kit-fence',name:'栅栏组件',kind:'building',description:'G 打开建筑面板，在面前的网格放置。占 2×1 格。',maxStack:99,buyPrice:35,sellPrice:null},
  'kit-lamp':{id:'kit-lamp',name:'路灯组件',kind:'building',description:'G 打开建筑面板，在面前的网格放置。占 2×1 格。',maxStack:99,buyPrice:60,sellPrice:null},
  'kit-bench':{id:'kit-bench',name:'长椅组件',kind:'building',description:'G 打开建筑面板，在面前的网格放置。占 3×1 格。',maxStack:99,buyPrice:50,sellPrice:null},
};
export function isItemId(value: unknown): value is ItemId { return typeof value === 'string' && Object.hasOwn(items, value); }
for (const definition of Object.values(items)) {
  if (!Number.isSafeInteger(definition.maxStack) || definition.maxStack < 1 ||
      [definition.buyPrice, definition.sellPrice].some(price => price !== null && (!Number.isSafeInteger(price) || price < 0))) throw new Error('物品配置不合法');
}
