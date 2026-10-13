import Phaser from 'phaser';
import type { GameState } from '../../domain/GameState';
import { lightingAlpha } from './lighting';

/** Screen-space world effects sit below the independent DOM UI. No art textures are replaced. */
export class WorldAtmosphere {
  private readonly shade: Phaser.GameObjects.Rectangle;
  private readonly rain: Phaser.GameObjects.Graphics;
  private elapsed = 0;
  constructor(scene: Phaser.Scene) {
    this.shade = scene.add.rectangle(0, 0, 960, 540, 0x172344).setOrigin(0).setScrollFactor(0).setDepth(20000);
    this.rain = scene.add.graphics().setScrollFactor(0).setDepth(20001);
  }
  update(state: GameState, delta: number, paused: boolean): void {
    if (!paused) this.elapsed += delta;
    this.shade.setFillStyle(0x172344, lightingAlpha(state.minute, state.weather));
    this.rain.clear();
    if (state.weather !== 'rain') return;
    this.rain.lineStyle(1, 0xaed4ed, 0.55);
    for (let i = 0; i < 85; i++) {
      const x = (i * 137 + Math.floor(this.elapsed / 22)) % 980 - 10;
      const y = (i * 79 + Math.floor(this.elapsed / 5)) % 560 - 20;
      this.rain.lineBetween(x, y, x - 3, y + 9);
    }
  }
}
