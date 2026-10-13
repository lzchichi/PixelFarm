import Phaser from 'phaser';
import type { FarmMapDefinition } from '../../data/farmMap';
import type { GameState } from '../../domain/GameState';
import { findInteraction } from '../../domain/interaction';
import { Player } from '../entities/Player';
import { FarmMap } from '../world/FarmMap';
import { FarmPlots } from '../world/FarmPlots';
import { createFarmingArea } from '../world/farmingArea';
import { facingTile, isCultivable, useFarmTool } from '../../domain/farming';
import { advanceDay } from '../../domain/time';
import { WorldSession } from '../world/WorldSession';
import { equippedItem } from '../../domain/inventory';
import { shops } from '../../data/shops';
import { Livestock } from '../world/Livestock';
import { PlacedBuildings } from '../world/PlacedBuildings';
import { placeBuilding,moveBuilding,buildingTarget,type BuildMode } from '../../domain/buildings';
import { FarmResources } from '../world/FarmResources';
import { gatherFarmResource } from '../../domain/gathering';
import { isFarmResourceId } from '../../data/farmResources';

export class FarmScene extends Phaser.Scene {
  private player!: Player;
  constructor() { super('Farm'); }

  create(): void {
    const map: FarmMapDefinition = this.registry.get('farmMap');
    const state: GameState = this.registry.get('gameState');
    const world = new FarmMap(this, map);
    world.applySeason(state.day);
    this.player = new Player(this, state);
    world.collideWith(this.player);
    this.registry.remove('buildMode');
    const placed=new PlacedBuildings(this,state,map,this.player);
    const area = createFarmingArea(map);
    const plots = new FarmPlots(this, state, area);
    const session = new WorldSession(this, state);
    const livestock=new Livestock(this,state);livestock.refresh();
    const resources=new FarmResources(world,state);resources.refresh();
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 64);
    const prompt = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '12px', color: '#fff2cd',
      backgroundColor: '#18382e', padding: { x: 6, y: 4 } }).setOrigin(0.5, 1).setDepth(10000);
    this.game.canvas.focus();
    this.input.on('pointerdown', () => this.game.canvas.focus());
    this.scene.launch('UI', { mode: 'farm' });
    let lastTarget: string | undefined;
    const sleep = (expectedDay: number): void => {
      const outcome = advanceDay(state, expectedDay);
      this.game.events.emit('interaction-message', outcome.message);
      if (outcome.ok) { plots.refresh(); this.game.events.emit('farm-state-changed'); session.save(); }
    };
    const feedback = (_time: number, delta: number): void => {
      const blocked = this.registry.get('uiBlocked') === true;
      if (session.update(delta)) plots.refresh();
      world.applySeason(state.day);
      livestock.refresh();
      placed.refresh();
      resources.refresh();
      const tile = facingTile(state.player, this.player.facing);
      const mode:BuildMode|undefined=this.registry.get('buildMode');
      const placement=mode?buildingTarget(state.player,this.player.facing,mode.kind):tile;
      placed.preview(blocked?undefined:mode,placement);
      const farming = !blocked && isCultivable(tile, area);
      const target = blocked ? undefined : findInteraction(state.player, this.player.facing, [...resources.interactions,...map.interactions], [...world.obstacles,...placed.obstacles]);
      const label = mode?'放置建筑 · Esc 取消':farming ? '农田 · 使用当前工具' : target?.name ?? '';
      plots.target(tile, !blocked);
      prompt.setVisible(!!label).setPosition(this.player.x, this.player.y - 52).setText(label ? `E · ${label}` : '');
      if (lastTarget !== label) { this.game.events.emit('interaction-target', label); lastTarget = label; }
      if (this.player.consumeInteraction()) {
        if(mode){const outcome=mode.movingId?moveBuilding(state,map,mode.movingId,placement):placeBuilding(state,map,mode.kind,placement);this.game.events.emit('interaction-message',outcome.message);if(outcome.ok){this.registry.remove('buildMode');placed.refresh();this.game.events.emit('farm-state-changed');}return;}
        const shop = Object.values(shops).find(shop => shop.interactionId === target?.id);
        if (target?.id === 'farm-to-town') { session.travel('town'); return; }
        else if (target?.id === 'cabin-door') this.game.events.emit('open-sleep', state.day);
        else if (target?.id === 'coop-door' || target?.id === 'barn-door') this.game.events.emit('open-livestock',target.id==='coop-door'?'chicken':'cow');
        else if(isFarmResourceId(target?.id)){const outcome=gatherFarmResource(state,target.id);this.game.events.emit('interaction-message',outcome.message);if(outcome.ok)this.game.events.emit('farm-state-changed');}
        else if (shop) this.game.events.emit('open-shop', shop.id);
        else if (farming || equippedItem(state) !== 'hand') {
          const outcome = useFarmTool(state, tile, area);
          this.game.events.emit('interaction-message', outcome.message);
          if (outcome.ok) { plots.refresh(); this.game.events.emit('farm-state-changed'); }
        } else if (target) this.game.events.emit('interaction-message', target.message);
      }
    };
    this.game.events.on('sleep-day', sleep);
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, feedback);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, feedback);
      this.game.events.off('sleep-day', sleep);
      this.registry.remove('buildMode');
    });
  }
}
