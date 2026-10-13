import type { GameState } from '../../domain/GameState';
import { items, type ItemId } from '../../data/items';
import { shops } from '../../data/shops';
import { quoteTrade, trade, tradePrice, type TradeQuote } from '../../domain/economy';
import { countItem } from '../../domain/inventory';
import { appendItem } from './itemDisplay';
import { crops } from '../../data/crops';
import { seasonNames } from '../../data/timeConfig';

export class ShopPanel {
  private readonly summary = document.createElement('p');
  private readonly details = document.createElement('p');
  private readonly feedback = document.createElement('p');
  private readonly quantity = document.createElement('input');
  private readonly confirm = document.createElement('button');
  private readonly again = document.createElement('button');
  private readonly listings = document.createElement('div');
  private selected: { id: ItemId; direction: 'buy' | 'sell' } | null = null;
  private quote: TradeQuote | null = null;
  constructor(root: HTMLElement, private readonly state: GameState, private readonly shopId: string, private readonly changed: () => void) {
    const shop = shops[shopId]; if (!shop) throw new Error('商店不存在');
    const title = document.createElement('h2'); title.textContent = shop.name;
    this.listings.className = 'shop-listings'; this.summary.className = 'shop-summary'; this.details.className = 'item-details';
    this.quantity.type = 'number'; this.quantity.min = '1'; this.quantity.max = '999'; this.quantity.step = '1'; this.quantity.value = '1';
    this.quantity.setAttribute('aria-label', '交易数量'); this.quantity.addEventListener('input', () => this.prepare());
    this.confirm.type = 'button'; this.confirm.className = 'pixel-button primary'; this.confirm.textContent = '确认交易'; this.confirm.disabled = true;
    this.again.type = 'button'; this.again.textContent = '继续交易'; this.again.className = 'compact-button'; this.again.disabled = true;
    this.again.addEventListener('click', () => this.prepare());
    this.confirm.addEventListener('click', () => {
      if (!this.quote || this.confirm.disabled) return;
      this.confirm.disabled = true; const outcome = trade(this.state, this.quote); this.feedback.textContent = outcome.message;
      this.again.disabled = false; this.changed(); this.render();
    });
    this.feedback.setAttribute('role', 'status'); this.feedback.className = 'trade-feedback';
    const form = document.createElement('div'); form.className = 'trade-form';
    const label = document.createElement('label'); label.textContent = '数量 '; label.append(this.quantity);
    form.append(label, this.confirm, this.again);
    root.append(title, this.summary, this.listings, this.details, form, this.feedback); this.render();
  }
  private prepare(): void {
    if (!this.selected) return;
    this.quote = quoteTrade(this.state, this.shopId, this.selected.direction, this.selected.id, this.quantity.valueAsNumber);
    const valid = Number.isSafeInteger(this.quote.quantity) && this.quote.quantity > 0 && Number.isSafeInteger(this.quote.total);
    this.confirm.disabled = !valid; this.again.disabled = true;
    this.details.textContent = `${items[this.selected.id].description} ${this.selected.direction === 'buy' ? '支出' : '收入'}：${valid ? this.quote.total : '无效数量'} 金币。`;
    const crop=Object.values(crops).find(c=>c.seedId===this.selected?.id);if(crop)this.details.textContent+=` 适种：${crop.seasons.map(s=>seasonNames[s]).join('、')}。`;
  }
  render(): void {
    const shop = shops[this.shopId]; if (!shop) return;
    this.summary.textContent = `金币 ${this.state.coins} · 背包 ${this.state.inventory.slots.filter(Boolean).length}/24 格`;
    this.listings.replaceChildren();
    for (const direction of ['buy', 'sell'] as const) {
      const section = document.createElement('section'); const title = document.createElement('h3'); title.textContent = direction === 'buy' ? '购买商品' : '出售物品'; section.append(title);
      for (const id of direction === 'buy' ? shop.sells : shop.buys) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'shop-item';
        appendItem(button, id, countItem(this.state, id));
        const price = document.createElement('span'); price.textContent = `${tradePrice(this.shopId, direction, id)} 金币/个`; button.append(price);
        button.setAttribute('aria-label', `${direction === 'buy' ? '购买' : '出售'} ${items[id].name}`);
        button.setAttribute('aria-pressed', String(this.selected?.id === id && this.selected.direction === direction));
        button.addEventListener('click', () => { this.selected = { id, direction }; this.feedback.textContent = ''; this.prepare(); this.render(); });
        section.append(button);
      } this.listings.append(section);
    }
  }
}
