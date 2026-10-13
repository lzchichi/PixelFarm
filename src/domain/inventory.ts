import { items, type ItemId, type ItemQuality, type Equipment } from '../data/items';
import type { GameState } from './GameState';
export interface ItemStack { id: ItemId; quantity: number; quality: ItemQuality }
export interface InventoryState { slots: (ItemStack | null)[]; revision: number }
export interface InventoryResult { ok: boolean; message: string }
const result = (ok: boolean, message: string): InventoryResult => ({ ok, message });
const amountValid = (quantity: number): boolean => Number.isSafeInteger(quantity) && quantity > 0;
const indexValid = (index: number, length: number): boolean => Number.isInteger(index) && index >= 0 && index < length;
export function countItem(state: GameState, id: ItemId, quality: ItemQuality = 'normal'): number {
  return state.inventory.slots.reduce((count, slot) => count + (slot?.id === id && slot.quality === quality ? slot.quantity : 0), 0);
}
export function planAdd(state: GameState, id: ItemId, quantity: number, quality: ItemQuality = 'normal'): (ItemStack | null)[] | null {
  if (!amountValid(quantity)) return null;
  const next = state.inventory.slots.map(slot => slot ? { ...slot } : null); let remaining = quantity;
  for (const slot of next) {
    if (slot?.id !== id || slot.quality !== quality) continue;
    const moved = Math.min(items[id].maxStack - slot.quantity, remaining); slot.quantity += moved; remaining -= moved;
  }
  for (let index = 0; index < next.length && remaining > 0; index++) {
    if (next[index]) continue;
    const moved = Math.min(items[id].maxStack, remaining); next[index] = { id, quantity: moved, quality }; remaining -= moved;
  }
  return remaining === 0 ? next : null;
}
export function addItem(state: GameState, id: ItemId, quantity: number, quality: ItemQuality = 'normal'): InventoryResult {
  const next = planAdd(state, id, quantity, quality);
  if (!next) return result(false, amountValid(quantity) ? '背包已满。' : '物品数量不合法。');
  state.inventory.slots = next; state.inventory.revision += 1; return result(true, '物品已放入背包。');
}
export function removeItem(state: GameState, id: ItemId, quantity: number, quality: ItemQuality = 'normal'): InventoryResult {
  if (!amountValid(quantity) || countItem(state, id, quality) < quantity) return result(false, '物品不足或数量不合法。');
  let remaining = quantity;
  state.inventory.slots.forEach((slot, index) => {
    if (slot?.id !== id || slot.quality !== quality || remaining === 0) return;
    const moved = Math.min(slot.quantity, remaining); slot.quantity -= moved; remaining -= moved;
    if (slot.quantity === 0) state.inventory.slots[index] = null;
  });
  state.inventory.revision += 1; return result(true, '物品数量已更新。');
}
export function moveStack(state: GameState, from: number, to: number): InventoryResult {
  const slots = state.inventory.slots;
  if (!indexValid(from, slots.length) || !indexValid(to, slots.length) || !slots[from] || from === to) return result(false, '无法移动这个格子。');
  const source = slots[from]; const target = slots[to]; if (!source) return result(false, '空格不能移动。');
  if (target && target.id === source.id && target.quality === source.quality && target.quantity < items[source.id].maxStack) {
    const moved = Math.min(items[source.id].maxStack - target.quantity, source.quantity);
    target.quantity += moved; source.quantity -= moved; if (source.quantity === 0) slots[from] = null;
  } else { slots[from] = target ?? null; slots[to] = source; }
  state.inventory.revision += 1; return result(true, '背包已整理。');
}
export function bindHotbar(state: GameState, hotbar: number, slot: number | null): InventoryResult {
  if (!indexValid(hotbar, 8) || (slot !== null && !indexValid(slot, 24))) return result(false, '快捷栏位置不合法。');
  state.hotbar[hotbar] = slot; return result(true, '快捷栏已更新。');
}
export function selectHotbar(state: GameState, index: number): InventoryResult {
  if (!indexValid(index, 8)) return result(false, '快捷栏位置不合法。');
  state.activeHotbar = index; return result(true, '已切换快捷栏。');
}
export function equippedItem(state: GameState): Equipment {
  const index = state.hotbar[state.activeHotbar]; return index === null || index === undefined ? 'hand' : state.inventory.slots[index]?.id ?? 'hand';
}
// Compatibility for farming callers; selection still references the real slot.
export function equipItem(state: GameState, equipment: Equipment): InventoryResult {
  if (equipment === 'hand') { state.hotbar[0] = null; state.activeHotbar = 0; return result(true, '已空手。'); }
  const slot = state.inventory.slots.findIndex(entry => entry?.id === equipment);
  if (slot < 0) return result(false, '背包中没有这个物品。');
  const bound = state.hotbar.indexOf(slot); state.activeHotbar = bound >= 0 ? bound : 7;
  if (bound < 0) state.hotbar[7] = slot; return result(true, '已选择物品。');
}
