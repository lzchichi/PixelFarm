import { items, type ItemId, type ItemQuality } from '../data/items';
import { shops } from '../data/shops';
import type { GameState } from './GameState';
import { countItem, planAdd, removeItem, type InventoryResult } from './inventory';
export interface TradeQuote {
  id: number; shopId: string; direction: 'buy' | 'sell'; itemId: ItemId; quantity: number; quality: ItemQuality;
  inventoryRevision: number; coins: number; total: number;
}
export function tradePrice(shopId: string, direction: 'buy' | 'sell', itemId: ItemId, quality: ItemQuality = 'normal'): number | null {
  const shop = shops[shopId]; const item = items[itemId]; if (!shop || !item) return null;
  const price = direction === 'buy' ? item.buyPrice : item.sellPrice;
  if (price === null || !(direction === 'buy' ? shop.sells : shop.buys).includes(itemId)) return null;
  return Math.round(price * (direction === 'buy' ? shop.buyRate : shop.sellRate) * shop.qualityRates[quality]);
}
export function quoteTrade(state: GameState, shopId: string, direction: 'buy' | 'sell', itemId: ItemId, quantity: number): TradeQuote {
  return { id: state.nextTradeId, shopId, direction, itemId, quantity, quality: 'normal', inventoryRevision: state.inventory.revision,
    coins: state.coins, total: (tradePrice(shopId, direction, itemId) ?? NaN) * quantity };
}
export function trade(state: GameState, quote: TradeQuote): InventoryResult {
  const fail = (message: string): InventoryResult => ({ ok: false, message });
  if (quote.id !== state.nextTradeId || quote.inventoryRevision !== state.inventory.revision || quote.coins !== state.coins) return fail('这笔交易已处理或背包已变化，请重新选择商品。');
  const price = tradePrice(quote.shopId, quote.direction, quote.itemId, quote.quality);
  if (!Number.isSafeInteger(quote.quantity) || quote.quantity <= 0 || price === null || !Number.isSafeInteger(quote.total) || quote.total < 0 || quote.total !== price * quote.quantity) return fail('交易数量或金额不合法。');
  if (!Number.isSafeInteger(state.coins) || state.coins < 0) return fail('金币状态不合法。');
  if (quote.direction === 'buy') {
    if (state.coins < quote.total) return fail('金币不足。');
    const next = planAdd(state, quote.itemId, quote.quantity, quote.quality); if (!next) return fail('背包已满，购买未扣款。');
    state.inventory.slots = next; state.inventory.revision += 1; state.coins -= quote.total;
  } else {
    if (countItem(state, quote.itemId, quote.quality) < quote.quantity) return fail('可出售的物品不足。');
    if (!Number.isSafeInteger(state.coins + quote.total)) return fail('交易金额超出范围。');
    removeItem(state, quote.itemId, quote.quantity, quote.quality); state.coins += quote.total;
  }
  state.nextTradeId += 1;
  return { ok: true, message: `${quote.direction === 'buy' ? '购买' : '出售'} ${items[quote.itemId].name} ×${quote.quantity}，${quote.direction === 'buy' ? '支出' : '收入'} ${quote.total} 金币。` };
}
