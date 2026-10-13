import type { GameState } from './GameState';
import { addItem, countItem, removeItem } from './inventory';
import { npcs, npcIds, isNpcId, type NpcId } from '../data/npcs';
import { commissionDefinitions, commissionIds, resourceNodes, type CommissionId, type ResourceNodeId } from '../data/commissions';
export interface Commission { id: string; definitionId: CommissionId; day: number; status: 'available' | 'accepted' | 'completed' | 'rewarded' }
export interface VillageProgress { friendship: Record<NpcId, number>; talkedOn: Record<NpcId, number>; commissions: Commission[]; generatedOn: number; gatheredOn: Partial<Record<ResourceNodeId, number>> }
export function createVillageProgress(): VillageProgress {
  return { friendship: { 'lin-seed': 0, 'xu-carpenter': 0, 'he-villager': 0 }, talkedOn: { 'lin-seed': 0, 'xu-carpenter': 0, 'he-villager': 0 }, commissions: [], generatedOn: 0, gatheredOn: {} };
}
const result = (ok: boolean, message: string) => ({ ok, message });
export function npcPosition(id: NpcId, minute: number) {
  const schedule = npcs[id].schedule;
  return [...schedule].reverse().find(slot => minute >= slot.minute) ?? schedule[0]!;
}
export function talkToNpc(state: GameState, id: string) {
  if (!isNpcId(id)) return result(false, '找不到这位村民。');
  if (state.village.talkedOn[id] !== state.day) {
    state.village.friendship[id] = Math.min(100, state.village.friendship[id] + npcs[id].talkFriendship);
    state.village.talkedOn[id] = state.day;
  }
  return result(true, `${npcs[id].name} · 好感度 ${state.village.friendship[id]}/100`);
}
export function ensureDailyCommissions(state: GameState): void {
  if (state.village.generatedOn === state.day) return;
  state.village.commissions = state.village.commissions.filter(q => q.status !== 'available');
  for (const [i, category] of (['crop', 'resource'] as const).entries()) {
    const pool = commissionIds.filter(id => commissionDefinitions[id].category === category);
    const hash = (Math.imul(state.day, 1103515245) + i * 12345) >>> 0;
    const definitionId = pool[hash % pool.length]!;
    state.village.commissions.push({ id: `${state.day}:${definitionId}`, definitionId, day: state.day, status: 'available' });
  }
  state.village.generatedOn = state.day;
}
export function commissionProgress(state: GameState, id: string) {
  const quest = state.village.commissions.find(q => q.id === id); if (!quest) return null;
  const d = commissionDefinitions[quest.definitionId];
  return { held: quest.status === 'completed' || quest.status === 'rewarded' ? d.quantity : Math.min(d.quantity, countItem(state, d.itemId)), required: d.quantity };
}
export function acceptCommission(state: GameState, id: string) {
  const quest = state.village.commissions.find(q => q.id === id);
  if (!quest || quest.status !== 'available' || quest.day !== state.day) return result(false, '委托不可接取或已接取。');
  quest.status = 'accepted'; return result(true, '已接取，请带齐物品找委托人交付。');
}
export function deliverCommission(state: GameState, id: string, npcId: string) {
  const quest = state.village.commissions.find(q => q.id === id);
  if (!quest || quest.status !== 'accepted') return result(false, '委托尚未接取或已经交付。');
  const d = commissionDefinitions[quest.definitionId];
  if (npcId !== d.npcId) return result(false, '请向委托人交付物品。');
  if (countItem(state, d.itemId) < d.quantity) return result(false, '物品数量不足，尚未扣除。');
  const removed = removeItem(state, d.itemId, d.quantity); if (!removed.ok) return removed;
  quest.status = 'completed'; return result(true, '交付完成，可以领取奖励。');
}
export function claimCommission(state: GameState, id: string, npcId: string) {
  const quest = state.village.commissions.find(q => q.id === id);
  if (!quest || quest.status !== 'completed') return result(false, '奖励未解锁或已经领取。');
  const d = commissionDefinitions[quest.definitionId];
  if (npcId !== d.npcId || !Number.isSafeInteger(state.coins + d.rewardCoins)) return result(false, '委托人或奖励金额不合法。');
  state.coins += d.rewardCoins; state.village.friendship[d.npcId] = Math.min(100, state.village.friendship[d.npcId] + d.rewardFriendship);
  quest.status = 'rewarded'; return result(true, `获得 ${d.rewardCoins} 金币、${d.rewardFriendship} 好感度。`);
}
export function collectResource(state: GameState, id: string) {
  if (!Object.hasOwn(resourceNodes, id)) return result(false, '这里没有可收集的材料。');
  // The key is validated against the finite configuration above.
  const key = id as ResourceNodeId, node = resourceNodes[key];
  if (state.village.gatheredOn[key] === state.day) return result(false, '这里今天已经收集过，明天再来看看。');
  const outcome = addItem(state, node.itemId, node.quantity); if (!outcome.ok) return outcome;
  state.village.gatheredOn[key] = state.day; return result(true, `收集到 ${node.quantity} 份${node.name}。`);
}
export { npcIds };
