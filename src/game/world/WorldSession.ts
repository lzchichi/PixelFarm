import Phaser from 'phaser';
import type { GameState } from '../../domain/GameState';
import { loadGame, saveGame, type WorldMaps } from '../../application/session';
import { tickTime } from '../../domain/time';
import { travelTo } from '../../domain/travel';
import { WorldAtmosphere } from './WorldAtmosphere';
/** Shared clock/save lifecycle; both world scenes operate on the same GameState. */
export class WorldSession {
  private readonly maps: WorldMaps;
  private readonly atmosphere: WorldAtmosphere;
  private lastClock = '';
  constructor(private readonly scene: Phaser.Scene, readonly state: GameState) {
    this.maps = scene.registry.get('worldMaps');
    this.atmosphere = new WorldAtmosphere(scene);
    scene.game.events.on('save-game', this.save, this);
    scene.game.events.on('load-game', this.read, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.game.events.off('save-game', this.save, this);
      scene.game.events.off('load-game', this.read, this);
    });
  }
  save(): void { this.scene.game.events.emit('interaction-message', saveGame(this.state, this.maps).message); }
  private read(): void {
    const outcome = loadGame(this.maps);
    if (!outcome.ok) { this.scene.game.events.emit('interaction-message', outcome.message); return; }
    this.scene.registry.set('gameState', outcome.state);
    this.scene.scene.stop('UI');
    const destination = outcome.state.mapId === 'farm' ? 'Farm' : 'Town';
    if (destination === this.scene.scene.key) this.scene.scene.restart(); else this.scene.scene.start(destination);
  }
  update(delta: number): boolean {
    const paused = this.scene.registry.get('uiBlocked') === true || document.hidden;
    const outcome = tickTime(this.state, Math.min(delta,1000), paused);
    if (outcome.daysAdvanced) this.save();
    this.atmosphere.update(this.state, delta, paused);
    const clock = `${this.state.day}:${Math.floor(this.state.minute)}`;
    if (clock !== this.lastClock) { this.scene.game.events.emit('farm-state-changed'); this.lastClock = clock; }
    return outcome.daysAdvanced > 0;
  }
  travel(destination: GameState['mapId']): void {
    travelTo(this.state, destination, this.maps[destination].spawn);
    this.scene.scene.stop('UI'); this.scene.scene.start(destination === 'farm' ? 'Farm' : 'Town');
  }
}
