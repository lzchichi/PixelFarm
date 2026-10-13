import type { GameState } from '../../domain/GameState';
import { items } from '../../data/items';
import { bindHotbar, moveStack, selectHotbar } from '../../domain/inventory';
import { appendItem } from './itemDisplay';

export class InventoryPanel {
  private selected: number | null = null;
  private source: { kind: 'bag' | 'bar'; index: number } | null = null;
  private readonly grid = document.createElement('div');
  private readonly bar = document.createElement('div');
  private readonly details = document.createElement('p');
  private readonly feedback = document.createElement('p');
  constructor(root: HTMLElement, private readonly state: GameState, private readonly changed: () => void) {
    const title = document.createElement('h2'); title.textContent = '背包 · 24 格';
    const hint = document.createElement('p'); hint.textContent = '点击查看物品；点击另一格或拖动可交换/合并。拖到下方快捷栏可绑定，拖动快捷栏可交换位置。';
    hint.className = 'panel-help'; this.grid.className = 'bag-grid'; this.bar.className = 'bag-hotbar';
    this.feedback.setAttribute('role', 'status'); this.details.className = 'item-details';
    root.append(title, hint, this.grid, this.details, this.bar, this.feedback);
    root.addEventListener('pointerdown', this.down); document.addEventListener('pointerup', this.up);
    this.root = root; this.render();
  }
  private readonly root: HTMLElement;
  private down = (event: PointerEvent): void => {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-slot-kind]'); if (!button) return;
    const index = Number(button.dataset.index), kind = button.dataset.slotKind;
    if (kind === 'bag' && this.state.inventory.slots[index]) this.source = { kind: 'bag', index };
    else if (kind === 'bar') this.source = { kind: 'bar', index };
  };
  private up = (event: PointerEvent): void => {
    const source = this.source; this.source = null;
    if (!source || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-slot-kind]');
    if (!button || !this.root.contains(button)) return;
    const index = Number(button.dataset.index), kind = button.dataset.slotKind;
    if (kind === source.kind && index === source.index) return;
    if (source.kind === 'bag' && kind === 'bag') this.feedback.textContent = moveStack(this.state, source.index, index).message;
    else if (source.kind === 'bag' && kind === 'bar') this.feedback.textContent = bindHotbar(this.state, index, source.index).message;
    else if (source.kind === 'bar' && kind === 'bar') {
      const from = this.state.hotbar[source.index] ?? null, to = this.state.hotbar[index] ?? null;
      bindHotbar(this.state, source.index, to); bindHotbar(this.state, index, from); this.feedback.textContent = '快捷栏已交换。';
    } else if (source.kind === 'bar' && kind === 'bag') this.feedback.textContent = bindHotbar(this.state, source.index, index).message;
    this.selected = null; this.changed(); this.render();
  };
  render(): void {
    this.grid.replaceChildren(); this.bar.replaceChildren();
    this.state.inventory.slots.forEach((stack, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'bag-slot';
      button.dataset.slotKind = 'bag'; button.dataset.index = String(index);
      button.setAttribute('aria-label', `背包格 ${index + 1}${stack ? ` ${items[stack.id].name} ${stack.quantity}` : ' 空'}`);
      button.setAttribute('aria-pressed', String(this.selected === index));
      if (stack) appendItem(button, stack.id, stack.quantity); else button.textContent = String(index + 1);
      button.addEventListener('click', () => {
        if (this.selected !== null && this.selected !== index) {
          this.feedback.textContent = moveStack(this.state, this.selected, index).message; this.selected = null; this.changed();
        } else this.selected = stack ? index : null;
        this.render();
      }); this.grid.append(button);
    });
    this.state.hotbar.forEach((slot, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'bag-binding';
      button.dataset.slotKind = 'bar'; button.dataset.index = String(index);
      const stack = slot === null ? null : this.state.inventory.slots[slot];
      button.textContent = `${index + 1} ${stack ? items[stack.id].name : '空手'}`;
      button.setAttribute('aria-label', `绑定快捷栏 ${index + 1}`);
      button.addEventListener('click', () => {
        if (this.selected !== null) { bindHotbar(this.state, index, this.selected); this.selected = null; }
        selectHotbar(this.state, index); this.changed(); this.render();
      }); this.bar.append(button);
    });
    const stack = this.selected === null ? null : this.state.inventory.slots[this.selected];
    this.details.textContent = stack ? `${items[stack.id].name}：${items[stack.id].description} 每格上限 ${items[stack.id].maxStack}。` :
      `已用 ${this.state.inventory.slots.filter(Boolean).length}/24 格 · 选择物品查看说明。`;
  }
  destroy(): void { this.root.removeEventListener('pointerdown', this.down); document.removeEventListener('pointerup', this.up); }
}
