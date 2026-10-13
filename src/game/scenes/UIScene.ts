import Phaser from 'phaser';
import { MenuScene } from './MenuScene';
import type { GameState } from '../../domain/GameState';
import { crops } from '../../data/crops';
import { cropArt } from '../../data/cropArt';
import { countItem, selectHotbar } from '../../domain/inventory';
import { items } from '../../data/items';
import { shops } from '../../data/shops';
import { InventoryPanel } from '../ui/InventoryPanel';
import { ShopPanel } from '../ui/ShopPanel';
import { appendItem } from '../ui/itemDisplay';
import { calendar, clockText } from '../../domain/time';
import { seasonNames, weekdays, weatherNames } from '../../data/timeConfig';
import { loadGame, saveGame, type WorldMaps } from '../../application/session';
import { isNpcId, type NpcId } from '../../data/npcs';
import { DialoguePanel } from '../ui/DialoguePanel';
import { CommissionPanel } from '../ui/CommissionPanel';
import { LivestockPanel } from '../ui/LivestockPanel';
import { isAnimalKind } from '../../data/animals';
import { BuildingPanel } from '../ui/BuildingPanel';
import type { BuildMode } from '../../domain/buildings';

interface UIData { mode: 'menu' | 'farm' }

export class UIScene extends Phaser.Scene {
  private mode: UIData['mode'] = 'menu';
  private root!: HTMLDivElement;
  private modal?: HTMLDivElement;
  private previousFocus?: HTMLElement;
  private disposePanel?: () => void;
  constructor() { super('UI'); }
  init(data: UIData): void { this.mode = data.mode; }

  create(): void {
    this.input.keyboard?.enableGlobalCapture();
    this.registry.set('uiBlocked', false);
    this.root = document.createElement('div');
    this.root.className = 'ui-layer';
    this.root.dataset.scene = this.mode;
    const parent = this.game.canvas.parentElement;
    if (!parent) throw new Error('游戏窗口不存在');
    parent.append(this.root);
    if (this.mode === 'menu') this.createMenu(); else this.createFarmUI();
    const onKey = (event: KeyboardEvent): void => {
      if (this.mode === 'farm' && !this.modal && /^[1-8]$/.test(event.key)) this.selectSlot(Number(event.key) - 1);
      if (this.mode === 'farm' && !this.modal && event.key.toLowerCase() === 'b') this.openInventory();
      if (this.mode === 'farm' && !this.modal && event.key.toLowerCase() === 'q') this.openCommissions();
      if(this.mode==='farm'&&!this.modal&&event.key.toLowerCase()==='g')this.openBuildings();
      if (event.key === 'Escape') {
        if (this.modal) this.closeSettings();
        else if(this.registry.get('buildMode')){this.registry.remove('buildMode');this.game.events.emit('interaction-message','已取消放置，原建筑与组件保留。');}
        else if (this.mode === 'farm') this.openPause();
      }
      if (event.key === 'Tab' && this.modal) {
        const buttons = Array.from(this.modal.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'));
        const first = buttons[0]; const last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('keydown', onKey);
      this.disposePanel?.(); this.disposePanel = undefined;
      this.modal = undefined;
      this.root.remove();
      this.registry.set('uiBlocked', false);
      this.input.keyboard?.enableGlobalCapture();
    });
  }

  private button(label: string, className: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button'; button.className = className; button.textContent = label;
    button.addEventListener('click', action);
    return button;
  }

  private createMenu(): void {
    this.root.innerHTML = `
      <div class="brand"><span class="sprout">✦</span> 青芽农场 <span class="brand-divider">/</span> PIXEL FARM STORY</div>
      <div class="edition">一方小田 · 一段新故事</div>
      <div class="hero-copy"><span class="small-label">A LITTLE LAND. A NEW BEGINNING.</span><p>种下一颗种子，<br>慢慢长成自己的故事。</p></div>
      <section class="menu-card" aria-label="主菜单"><span class="card-eyebrow">WELCOME HOME</span><h1>欢迎来到青芽农场</h1><div class="menu-actions"></div><span class="menu-note">慢一点，也没关系。</span></section>
      <footer class="menu-footer"><span>✦ 原创像素农场 · 单机故事</span><span>让生活慢下来 <span class="footer-star">✧</span></span></footer>`;
    const actions = this.root.querySelector('.menu-actions');
    if (!actions) throw new Error('主菜单初始化失败');
    const start = this.button('开始游戏  →', 'pixel-button primary', () => {
      const menu = this.scene.get('Menu');
      if (menu instanceof MenuScene) menu.startNewGame();
    });
    const continueButton = this.button('继续游戏', 'pixel-button', () => {
      const menu = this.scene.get('Menu'); if (menu instanceof MenuScene) menu.continueGame();
    });
    const map: WorldMaps = this.registry.get('worldMaps');
    const saved = loadGame(map); continueButton.disabled = !saved.ok;
    continueButton.title = saved.message;
    const unavailable = document.createElement('span');
    unavailable.className = 'unavailable-note'; unavailable.textContent = saved.ok ? `可继续：${seasonNames[calendar(saved.state.day).season]} ${calendar(saved.state.day).day} 日` : saved.message;
    const onMessage = (message: string): void => { unavailable.textContent = message; };
    this.game.events.on('menu-save-message', onMessage);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off('menu-save-message', onMessage));
    actions.append(start, continueButton, unavailable, this.button('设置', 'pixel-button secondary', () => this.openSettings()));
  }

  private createFarmUI(): void {
    this.root.innerHTML = `
      <div class="farm-heading"><span class="sprout">✦</span><div><strong>青芽农场</strong><span>属于你的慢生活</span></div></div>
      <div class="farm-controls"></div>
      <div class="farm-status" role="status"></div><div class="inventory-readout"></div>
      <nav class="tool-bar" aria-label="工具与种子"></nav>
      <div class="interaction-feedback"><div class="interaction-prompt" role="status"></div><div class="interaction-message" role="status" aria-live="polite"></div></div>
      <div class="farm-hint"><span class="keycap">W A S D</span><span>行走</span><i></i><span class="keycap">E</span><span>使用 / 商店</span><i></i><span class="keycap">1–8</span><span>快捷栏</span><i></i><span class="keycap">B</span><span>背包</span><small>青芽种子铺 · 经营你的农场</small></div>`;
    const controls = this.root.querySelector('.farm-controls');
    controls?.append(this.button('背包 B', 'compact-button', () => this.openInventory()), this.button('建筑 G','compact-button',()=>this.openBuildings()),this.button('委托 Q', 'compact-button', () => this.openCommissions()), this.button('日历', 'compact-button', () => this.openCalendar()), this.button('暂停 / 存档', 'compact-button', () => this.openPause()));
    const state: GameState = this.registry.get('gameState');
    const heading = this.root.querySelector('.farm-heading strong'); if (heading && state.mapId === 'town') heading.textContent = '青芽村';
    const hint = this.root.querySelector('.farm-hint small'); if (hint) hint.textContent = state.mapId === 'town' ? '公告栏接委托 · 广场边收集材料' : '路牌通往青芽村 · E 互动';
    const toolbar = this.root.querySelector('.tool-bar');
    for (let index = 0; index < 8; index++) {
      const button = this.button('', 'tool-button', () => this.selectSlot(index));
      button.dataset.shortcut = String(index + 1); toolbar?.append(button);
    }
    const openShop = (id: string): void => this.openShop(id);
    const openSleep = (day: number): void => this.openSleep(day);
    this.game.events.on('open-shop', openShop);
    this.game.events.on('open-sleep', openSleep);
    const openLivestock=(kind:unknown):void=>{if(!isAnimalKind(kind))return;const card=this.beginPanel('动物养殖');if(!card)return;new LivestockPanel(card,state,kind,()=>this.refreshFarmState(),()=>{this.closeSettings();this.openShop('farm-shop');});card.querySelector<HTMLButtonElement>('button')?.focus();};
    this.game.events.on('open-livestock',openLivestock);
    const refresh = (): void => this.refreshFarmState();
    this.game.events.on('farm-state-changed', refresh); refresh();
    const prompt = this.root.querySelector('.interaction-prompt');
    const message = this.root.querySelector('.interaction-message');
    let timer: Phaser.Time.TimerEvent | undefined;
    const onTarget = (label: string): void => { if (prompt) prompt.textContent = label ? `按 E · ${label}` : ''; };
    const onMessage = (content: string): void => {
      if (message) message.textContent = content;
      timer?.remove(); timer = this.time.delayedCall(4500, () => { if (message) message.textContent = ''; });
    };
    this.game.events.on('interaction-target', onTarget);
    const dialogue = (id: string): void => { if (isNpcId(id)) this.openDialogue(id); };
    const commissions = (): void => this.openCommissions();
    this.game.events.on('open-dialogue', dialogue);
    this.game.events.on('open-commissions', commissions);
    this.game.events.on('interaction-message', onMessage);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('interaction-target', onTarget); this.game.events.off('interaction-message', onMessage); timer?.remove();
      this.game.events.off('open-dialogue', dialogue); this.game.events.off('open-commissions', commissions);
      this.game.events.off('farm-state-changed', refresh);
      this.game.events.off('open-shop', openShop);
      this.game.events.off('open-sleep', openSleep);
      this.game.events.off('open-livestock',openLivestock);
    });
  }

  private selectSlot(index: number): void {
    const state: GameState = this.registry.get('gameState');
    const outcome = selectHotbar(state, index);
    if (!outcome.ok) this.game.events.emit('interaction-message', outcome.message);
    this.refreshFarmState(); this.game.canvas.focus();
  }

  private refreshFarmState(): void {
    const state: GameState = this.registry.get('gameState');
    const status = this.root.querySelector('.farm-status');
    const date = calendar(state.day);
    if (status) status.textContent = `第 ${date.year} 年 · ${seasonNames[date.season]} ${date.day} 日 · ${weekdays[date.weekday]}\n${clockText(state.minute)} · ${weatherNames[state.weather]} · 金币 ${state.coins}`;
    const bag = this.root.querySelector('.inventory-readout');
    if (bag) {
      bag.replaceChildren();
      for (const crop of Object.values(crops)) {
        const item = document.createElement('span'); const icon = document.createElement('img');
        icon.src = `${import.meta.env.BASE_URL}${cropArt.assets[`${crop.id}-harvest`].path}`;
        icon.alt = crop.name; item.append(icon, ` ${countItem(state, crop.harvestId)}`); bag.append(item);
      }
    }
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('.tool-button')) {
      const index = Number(button.dataset.shortcut) - 1, slot = state.hotbar[index];
      const stack = slot === null || slot === undefined ? null : state.inventory.slots[slot];
      button.replaceChildren(); const key = document.createElement('span'); key.textContent = `${index + 1}`; button.append(key);
      if (stack) appendItem(button, stack.id, stack.quantity); else button.append(' 空手');
      button.title = stack ? items[stack.id].description : '空手可收获成熟作物';
      button.setAttribute('aria-pressed', String(state.activeHotbar === index));
    }
  }

  private beginPanel(label: string): HTMLElement | null {
    if (this.modal) return null;
    for (const child of Array.from(this.root.children)) if (child instanceof HTMLElement) child.inert = true;
    this.registry.set('uiBlocked', true); this.modal = document.createElement('div'); this.modal.className = 'modal-backdrop';
    this.input.keyboard?.disableGlobalCapture();
    const card = document.createElement('section'); card.className = 'management-card';
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', label);
    card.append(this.button('关闭', 'compact-button panel-close', () => this.closeSettings()));
    this.modal.append(card); this.root.append(this.modal); return card;
  }
  private openInventory(): void {
    const card = this.beginPanel('背包'); if (!card) return;
    const state: GameState = this.registry.get('gameState');
    const panel = new InventoryPanel(card, state, () => this.refreshFarmState());
    this.disposePanel = () => panel.destroy(); card.querySelector<HTMLButtonElement>('button')?.focus();
  }
  private openBuildings():void {
    const state:GameState=this.registry.get('gameState');
    if(state.mapId!=='farm'){this.game.events.emit('interaction-message','请回到农场放置建筑。');return;}
    const card=this.beginPanel('农场建筑');if(!card)return;
    new BuildingPanel(card,state,()=>this.refreshFarmState(),(mode:BuildMode)=>{this.closeSettings();this.registry.set('buildMode',mode);},()=>{this.closeSettings();this.openShop('farm-shop');});
    card.querySelector<HTMLButtonElement>('button')?.focus();
  }
  private openSleep(day: number): void {
    const card = this.beginPanel('小屋休息'); if (!card) return;
    const title = document.createElement('h2'); title.textContent = '小屋休息';
    const note = document.createElement('p'); note.textContent = '睡到明天 06:00，结算今天的作物并自动保存。';
    const sleep = this.button('睡觉，开始新的一天', 'pixel-button primary', () => {
      sleep.disabled = true; this.closeSettings(); this.game.events.emit('sleep-day', day);
    });
    card.append(title, note, sleep); card.querySelector<HTMLButtonElement>('button')?.focus();
  }
  private openPause(): void {
    const card = this.beginPanel('暂停与存档'); if (!card) return;
    const title = document.createElement('h2'); title.textContent = '暂停与存档';
    const note = document.createElement('p'); note.textContent = '时间已暂停。下一天开始时自动保存，也可在这里手动保存。';
    const result = document.createElement('p'); result.setAttribute('role', 'status');
    card.append(title, note,
      this.button('保存游戏', 'pixel-button', () => {
        const state: GameState = this.registry.get('gameState'); const map: WorldMaps = this.registry.get('worldMaps');
        result.textContent = saveGame(state, map).message;
      }),
      this.button('读取存档', 'pixel-button', () => { this.closeSettings(); this.game.events.emit('load-game'); }),
      this.button('设置', 'pixel-button', () => { this.closeSettings(); this.openSettings(); }),
      this.button('返回菜单', 'pixel-button', () => this.returnToMenu()), result);
    card.classList.add('pause-card'); card.querySelector<HTMLButtonElement>('button')?.focus();
  }
  private openCalendar(): void {
    const card = this.beginPanel('农场日历'); if (!card) return;
    const state: GameState = this.registry.get('gameState'); const date = calendar(state.day);
    const title = document.createElement('h2'); title.textContent = `第 ${date.year} 年 · ${seasonNames[date.season]}日历`;
    const grid = document.createElement('div'); grid.className = 'calendar-grid';
    for (const label of weekdays) { const cell = document.createElement('strong'); cell.textContent = label; grid.append(cell); }
    for (let day = 1; day <= 28; day++) {
      const cell = document.createElement('span'); cell.textContent = `${day} 日`; if (day === date.day) { cell.className = 'today'; cell.setAttribute('aria-current', 'date'); } grid.append(cell);
    }
    const note = document.createElement('p'); note.textContent = `今天${weatherNames[state.weather]} · 每季 28 天 · 春夏秋冬循环。适种：${Object.values(crops).filter(c=>c.seasons.includes(date.season)).map(c=>c.name).join('、')||'冬季休耕'}。换季会清理不适种作物，耕地保留。`;
    card.append(title, grid, note); card.querySelector<HTMLButtonElement>('button')?.focus();
  }
  private openShop(id: string): void {
    const shop = shops[id]; if (!shop) return;
    const card = this.beginPanel(shop.name); if (!card) return;
    const state: GameState = this.registry.get('gameState');
    new ShopPanel(card, state, id, () => this.refreshFarmState());
    card.querySelector<HTMLButtonElement>('button')?.focus();
  }
  private openCommissions(npc?: NpcId): void {
    const card = this.beginPanel('村庄委托'); if (!card) return;
    const state: GameState = this.registry.get('gameState');
    new CommissionPanel(card,state,()=>this.refreshFarmState(),npc);
    card.querySelector<HTMLButtonElement>('button')?.focus();
  }
  private openDialogue(id: NpcId): void {
    const card = this.beginPanel('村民对话'); if (!card) return;
    const state: GameState = this.registry.get('gameState');
    const panel = new DialoguePanel(card,state,id,()=>this.refreshFarmState(),()=>this.closeSettings(),
      ()=>{this.closeSettings();this.openCommissions(id);},()=>{this.closeSettings();this.openShop('farm-shop');});
    this.disposePanel = ()=>panel.destroy();card.querySelector<HTMLButtonElement>('button')?.focus();
  }

  private openSettings(): void {
    if (this.modal) return;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    for (const child of Array.from(this.root.children)) if (child instanceof HTMLElement) child.inert = true;
    this.registry.set('uiBlocked', true);
    this.input.keyboard?.disableGlobalCapture();
    this.modal = document.createElement('div');
    this.modal.className = 'modal-backdrop';
    this.modal.innerHTML = `<section class="settings-card" role="dialog" aria-modal="true" aria-labelledby="settings-title"><span class="card-eyebrow">MAKE YOURSELF AT HOME</span><h2 id="settings-title">设置</h2><p>960 × 540 · 整数倍像素显示</p><p>窗口较小时可滚动查看完整画面。<br>WASD / 方向键行走，E 互动，Esc 暂停。<br>返回小屋按 E 可以睡觉。</p><div class="settings-actions"></div><small>本次设置仅在当前页面生效</small></section>`;
    const actions = this.modal.querySelector('.settings-actions');
    const toggle = this.button('', 'pixel-button secondary', () => {
      const enabled = this.registry.get('ambientMotion') !== true;
      this.registry.set('ambientMotion', enabled);
      this.game.events.emit('ambient-changed', enabled);
      updateToggle();
    });
    const updateToggle = (): void => {
      const enabled = this.registry.get('ambientMotion') === true;
      toggle.textContent = `菜单云朵动效：${enabled ? '开' : '关'}`;
      toggle.setAttribute('aria-pressed', String(enabled));
    };
    updateToggle();
    actions?.append(toggle, this.button('返回', 'pixel-button primary', () => this.closeSettings()));
    this.root.append(this.modal);
    toggle.focus();
  }

  private closeSettings(): void {
    this.disposePanel?.(); this.disposePanel = undefined;
    this.modal?.remove(); this.modal = undefined;
    for (const child of Array.from(this.root.children)) if (child instanceof HTMLElement) child.inert = false;
    this.registry.set('uiBlocked', false);
    this.input.keyboard?.enableGlobalCapture();
    if (this.mode === 'farm') this.game.canvas.focus();
    else this.previousFocus?.focus();
  }

  private returnToMenu(): void {
    this.scene.stop('Farm');
    this.scene.stop('Town');
    this.scene.start('Menu');
  }
}
