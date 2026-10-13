import Phaser from 'phaser';
import type { GameState } from '../../domain/GameState';
import type { WorldMaps } from '../../application/session';
import { findInteraction } from '../../domain/interaction';
import { collectResource, ensureDailyCommissions } from '../../domain/village';
import { isNpcId } from '../../data/npcs';
import { resourceNodes } from '../../data/commissions';
import { Player } from '../entities/Player';
import { Villagers } from '../entities/Villagers';
import { FarmMap } from '../world/FarmMap';
import { WorldSession } from '../world/WorldSession';
export class TownScene extends Phaser.Scene {
  constructor() { super('Town'); }
  create(): void {
    const maps: WorldMaps = this.registry.get('worldMaps'); const state: GameState = this.registry.get('gameState');
    ensureDailyCommissions(state);
    const world = new FarmMap(this,maps.town,'town-map'); const player = new Player(this,state); world.collideWith(player);
    const villagers = new Villagers(this,state); const session = new WorldSession(this,state);
    this.cameras.main.startFollow(player,true,0.12,0.12,0,64);
    const prompt = this.add.text(0,0,'',{fontFamily:'monospace',fontSize:'12px',color:'#fff2cd',backgroundColor:'#18382e',padding:{x:6,y:4}}).setOrigin(0.5,1).setDepth(10000);
    this.scene.launch('UI',{mode:'farm'}); this.game.canvas.focus(); this.input.on('pointerdown',()=>this.game.canvas.focus());
    const update = (_time:number,delta:number):void => {
      session.update(delta);world.applySeason(state.day); const interactions = [...villagers.update(),...maps.town.interactions];
      const blocked = this.registry.get('uiBlocked') === true;
      const target = blocked ? undefined : findInteraction(state.player,player.facing,interactions,world.obstacles);
      prompt.setVisible(!!target).setText(target ? `E · ${target.name}`:'').setPosition(player.x,player.y-52);
      this.game.events.emit('interaction-target',target?.name ?? '');
      if (!player.consumeInteraction() || !target) return;
      if (target.id === 'town-to-farm') { session.travel('farm'); return; }
      if (target.id === 'town-board') this.game.events.emit('open-commissions');
      else if (isNpcId(target.id)) this.game.events.emit('open-dialogue',target.id);
      else if (target.id === 'town-shop') this.game.events.emit('open-shop','farm-shop');
      else if (Object.hasOwn(resourceNodes,target.id)) { this.game.events.emit('interaction-message',collectResource(state,target.id).message); this.game.events.emit('farm-state-changed'); }
      else this.game.events.emit('interaction-message',target.message);
    };
    this.events.on(Phaser.Scenes.Events.POST_UPDATE,update);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.events.off(Phaser.Scenes.Events.POST_UPDATE,update));
  }
}
