import Phaser from 'phaser';
import { pixelTitle } from '../assets/pixelTitle';
import { textures } from '../assets/palette';
import { createGameState } from '../../domain/GameState';
import type { FarmMapDefinition } from '../../data/farmMap';
import { artTexture } from '../../data/artAssets';
import { loadGame, type WorldMaps } from '../../application/session';

export class MenuScene extends Phaser.Scene {
  private ambientTweens: Phaser.Tweens.Tween[] = [];
  constructor() { super('Menu'); }

  create(): void {
    this.add.tileSprite(0, 0, 960, 540, textures.grass).setOrigin(0);
    this.add.tileSprite(140, 380, 820, 96, textures.path).setOrigin(0);
    this.add.tileSprite(172, 260, 64, 280, textures.path).setOrigin(0);
    this.add.image(266, 263, artTexture('cabin')).setOrigin(0);
    this.add.image(22, 285, artTexture('tree-oak')).setOrigin(0);
    this.add.image(490, 385, artTexture('tree-apple')).setOrigin(0);
    this.add.image(82, 449, artTexture('bush-pink')).setOrigin(0);
    this.add.image(320, 470, artTexture('flowers-white')).setOrigin(0);
    this.add.rectangle(0, 0, 960, 240, 0x18382e, 0.3).setOrigin(0);
    pixelTitle(this, 'PIXEL', 72, 113, 7);
    pixelTitle(this, 'FARM STORY', 72, 177, 7);
    this.ambientTweens = [];
    for (const [x, y, duration] of [[420, 84, 9000], [72, 42, 12000]] as const) {
      const cloud = this.add.image(x, y, textures.cloud).setScale(2).setAlpha(0.6);
      this.ambientTweens.push(this.tweens.add({ targets: cloud, x: x + 30, duration, yoyo: true, repeat: -1 }));
    }
    const applyMotion = (enabled: boolean): void => {
      for (const tween of this.ambientTweens) { if (enabled) tween.resume(); else tween.pause(); }
    };
    applyMotion(this.registry.get('ambientMotion') === true);
    this.game.events.on('ambient-changed', applyMotion);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off('ambient-changed', applyMotion));
    this.scene.launch('UI', { mode: 'menu' });
  }

  startNewGame(): void {
    const map: FarmMapDefinition = this.registry.get('farmMap');
    this.registry.set('gameState', createGameState(map.spawn));
    this.scene.stop('UI');
    this.scene.start('Farm');
  }
  continueGame(): void {
    const map: WorldMaps = this.registry.get('worldMaps');
    const outcome = loadGame(map);
    if (!outcome.ok) { this.game.events.emit('menu-save-message', outcome.message); return; }
    this.registry.set('gameState', outcome.state);
    this.scene.stop('UI'); this.scene.start(outcome.state.mapId === 'farm' ? 'Farm' : 'Town');
  }
}
