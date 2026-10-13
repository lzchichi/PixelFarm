import { isItemId, type ItemId } from './items';
import { isNpcId, type NpcId } from './npcs';
export const commissionIds = ['turnip-gift', 'potato-soup', 'berry-basket', 'pumpkin-dinner', 'wood-repair', 'stone-path'] as const;
export type CommissionId = typeof commissionIds[number];
export interface CommissionDefinition { id: CommissionId; title: string; description: string; category: 'crop' | 'resource'; npcId: NpcId; itemId: ItemId; quantity: number; rewardCoins: number; rewardFriendship: number }
export const commissionDefinitions: Record<CommissionId, CommissionDefinition> = {
  'turnip-gift': { id: 'turnip-gift', title: '新鲜萝卜', description: '莉娜想给邻居做一份清爽小菜。', category: 'crop', npcId: 'he-villager', itemId: 'turnip', quantity: 2, rewardCoins: 70, rewardFriendship: 8 },
  'potato-soup': { id: 'potato-soup', title: '一锅暖汤', description: '艾米需要土豆招待来访的朋友。', category: 'crop', npcId: 'lin-seed', itemId: 'potato', quantity: 2, rewardCoins: 170, rewardFriendship: 8 },
  'berry-basket': { id: 'berry-basket', title: '午后的草莓', description: '莉娜想给广场的茶会带点水果。', category: 'crop', npcId: 'he-villager', itemId: 'strawberry', quantity: 1, rewardCoins: 145, rewardFriendship: 8 },
  'pumpkin-dinner': { id: 'pumpkin-dinner', title: '南瓜晚餐', description: '托马斯准备给工坊伙伴做晚餐。', category: 'crop', npcId: 'xu-carpenter', itemId: 'pumpkin', quantity: 1, rewardCoins: 230, rewardFriendship: 8 },
  'wood-repair': { id: 'wood-repair', title: '修补木椅', description: '托马斯需要两份木材修补广场长椅。', category: 'resource', npcId: 'xu-carpenter', itemId: 'wood', quantity: 2, rewardCoins: 45, rewardFriendship: 10 },
  'stone-path': { id: 'stone-path', title: '整理小径', description: '莉娜想把门前小径铺得更平整。', category: 'resource', npcId: 'he-villager', itemId: 'stone', quantity: 2, rewardCoins: 40, rewardFriendship: 10 },
};
export const resourceNodes = {
  'town-wood': { itemId: 'wood' as const, quantity: 2, name: '落木' },
  'town-stone': { itemId: 'stone' as const, quantity: 2, name: '碎石' },
};
export type ResourceNodeId = keyof typeof resourceNodes;
for (const d of Object.values(commissionDefinitions)) {
  if (!isItemId(d.itemId) || !isNpcId(d.npcId) || !Number.isSafeInteger(d.quantity) || d.quantity < 1 || !Number.isSafeInteger(d.rewardCoins) || d.rewardCoins < 0 || !Number.isSafeInteger(d.rewardFriendship) || d.rewardFriendship < 0) throw new Error('委托配置不合法');
}
