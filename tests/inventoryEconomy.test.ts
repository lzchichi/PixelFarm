import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/domain/GameState';
import { addItem, countItem, removeItem, moveStack, bindHotbar, selectHotbar, equipItem } from '../src/domain/inventory';
import { trade, quoteTrade } from '../src/domain/economy';
import { useFarmTool, advanceDay } from '../src/domain/farming';

const state = () => createGameState({ x: 928, y: 688 });
describe('inventory and hotbar', () => {
  it('starts 24 slots, 8 hotbar bindings and 500 coins', () => {
    const s = state(); expect(s.inventory.slots).toHaveLength(24); expect(s.hotbar).toHaveLength(8);
    expect(countItem(s, 'seed-turnip')).toBe(10); expect(s.coins).toBe(500);
  });
  it('stacks and spills into another slot without losing items', () => {
    const s = state(); expect(addItem(s, 'seed-turnip', 100).ok).toBe(true);
    expect(countItem(s, 'seed-turnip')).toBe(110);
    expect(s.inventory.slots.filter(slot => slot?.id === 'seed-turnip').map(slot => slot?.quantity)).toEqual([99, 11]);
  });
  it('respects exact capacity, remaining stack capacity and atomic full-bag failure', () => {
    const s = state(); s.inventory.slots = Array.from({ length: 24 }, () => ({ id: 'seed-turnip', quantity: 99, quality: 'normal' }));
    s.inventory.slots[0]!.quantity = 98; expect(addItem(s, 'seed-turnip', 1).ok).toBe(true);
    const before = structuredClone(s); expect(addItem(s, 'seed-turnip', 1).ok).toBe(false); expect(s).toEqual(before);
  });
  it('tools do not stack; moving different items swaps, same items merge to the limit', () => {
    const s = state(); addItem(s, 'hoe', 1); expect(s.inventory.slots.filter(slot => slot?.id === 'hoe')).toHaveLength(2);
    expect(moveStack(s, 0, 1).ok).toBe(true); expect(s.inventory.slots[0]?.id).toBe('watering-can');
    addItem(s, 'seed-turnip', 100); const source = s.inventory.slots.findIndex(slot => slot?.id === 'seed-turnip' && slot.quantity === 11);
    removeItem(s, 'seed-turnip', 5); expect(moveStack(s, source, 2).ok).toBe(true);
    expect(s.inventory.slots[2]?.quantity).toBe(99); expect(countItem(s, 'seed-turnip')).toBe(105);
  });
  it('rejects negative, fractional and excessive removal without mutation', () => {
    const s = state(); const before = structuredClone(s);
    for (const qty of [-1, 0, 0.5, Infinity, 11]) expect(removeItem(s, 'seed-turnip', qty).ok).toBe(false);
    expect(s).toEqual(before);
  });
  it('hotbar references the actual slot and can bind and select slot 8', () => {
    const s = state(); expect(bindHotbar(s, 7, 2).ok).toBe(true); expect(selectHotbar(s, 7).ok).toBe(true);
    removeItem(s, 'seed-turnip', 10); expect(s.inventory.slots[s.hotbar[7]!]).toBeNull();
    expect(bindHotbar(s, 8, 0).ok).toBe(false); expect(moveStack(s, -1, 2).ok).toBe(false);
  });
});
describe('atomic shop trades', () => {
  it('completes buying, planting, watered growth, harvesting, selling and reinvesting', () => {
    const s = state(); const tile = { x: 2, y: 3 };
    const area = { width: 60, height: 40, cultivable: new Set(['2,3']) };
    expect(trade(s, quoteTrade(s, 'farm-shop', 'buy', 'seed-turnip', 1)).ok).toBe(true);
    for (const id of ['hoe', 'seed-turnip'] as const) {
      expect(equipItem(s, id).ok).toBe(true); expect(useFarmTool(s, tile, area).ok).toBe(true);
    }
    expect(equipItem(s, 'watering-can').ok).toBe(true);
    for (let day = 0; day < 4; day++) {
      expect(useFarmTool(s, tile, area).ok).toBe(true); expect(advanceDay(s, s.day).ok).toBe(true);
    }
    equipItem(s, 'hand'); expect(useFarmTool(s, tile, area).ok).toBe(true);
    expect(countItem(s, 'turnip')).toBe(1);
    expect(trade(s, quoteTrade(s, 'farm-shop', 'sell', 'turnip', 1)).ok).toBe(true);
    expect(s.coins).toBe(515); expect(countItem(s, 'turnip')).toBe(0);
    expect(trade(s, quoteTrade(s, 'farm-shop', 'buy', 'seed-turnip', 1)).ok).toBe(true);
    expect(s.coins).toBe(505); expect(countItem(s, 'seed-turnip')).toBe(11);
  });
  it('buys seeds at configured prices and refuses reusing the transaction', () => {
    const s = state(); const quote = quoteTrade(s, 'farm-shop', 'buy', 'seed-potato', 2);
    expect(trade(s, quote).ok).toBe(true); expect(s.coins).toBe(440); expect(countItem(s, 'seed-potato')).toBe(2);
    const before = structuredClone(s); expect(trade(s, quote).ok).toBe(false); expect(s).toEqual(before);
  });
  it('rejects insufficient money and full bag without changing either resource', () => {
    const s = state(); s.coins = 5; const before = structuredClone(s);
    expect(trade(s, quoteTrade(s, 'farm-shop', 'buy', 'seed-pumpkin', 1)).ok).toBe(false); expect(s).toEqual(before);
    s.coins = 500; s.inventory.slots = Array.from({ length: 24 }, () => ({ id: 'hoe', quantity: 1, quality: 'normal' }));
    const full = structuredClone(s); expect(trade(s, quoteTrade(s, 'farm-shop', 'buy', 'seed-turnip', 1)).ok).toBe(false); expect(s).toEqual(full);
  });
  it('sells harvested crops and removes exactly the sold quantity', () => {
    const s = state(); addItem(s, 'turnip', 3);
    expect(trade(s, quoteTrade(s, 'farm-shop', 'sell', 'turnip', 2)).ok).toBe(true);
    expect(s.coins).toBe(550); expect(countItem(s, 'turnip')).toBe(1);
    const before = structuredClone(s); expect(trade(s, quoteTrade(s, 'farm-shop', 'sell', 'turnip', 2)).ok).toBe(false); expect(s).toEqual(before);
  });
  it('rejects invalid quantity, altered prices, stale inventory, unknown shop and unsupported tools', () => {
    const s = state(); const before = structuredClone(s);
    for (const quantity of [-1, 0, 0.5, Infinity]) expect(trade(s, quoteTrade(s, 'farm-shop', 'buy', 'seed-turnip', quantity)).ok).toBe(false);
    const quote = quoteTrade(s, 'farm-shop', 'buy', 'seed-turnip', 1);
    expect(trade(s, { ...quote, total: 0 }).ok).toBe(false); expect(s).toEqual(before);
    expect(trade(s, { ...quote, shopId: 'missing' }).ok).toBe(false);
    expect(trade(s, quoteTrade(s, 'farm-shop', 'sell', 'hoe', 1)).ok).toBe(false);
    addItem(s, 'potato', 1); const changed = structuredClone(s); expect(trade(s, quote).ok).toBe(false); expect(s).toEqual(changed);
  });
});
