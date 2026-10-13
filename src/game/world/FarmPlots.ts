import Phaser from 'phaser';
import type { GameState, Point } from '../../domain/GameState';
import { crops } from '../../data/crops';
import { cropTexture } from '../../data/cropArt';
import { cropStage, getPlot, isMature, isWet, tileKey, type FarmingArea } from '../../domain/farming';
import { tileToWorld } from '../../domain/grid';
import { textures } from '../assets/palette';

/** Draws state-derived overlays; never keeps a second copy of plot state. */
export class FarmPlots {
  private readonly soils = new Map<string, Phaser.GameObjects.Image>();
  private readonly labels = new Map<string, Phaser.GameObjects.Text>();
  private readonly plants = new Map<string, Phaser.GameObjects.Image>();
  private readonly cursor: Phaser.GameObjects.Rectangle;
  constructor(private readonly scene: Phaser.Scene, private readonly state: GameState, readonly area: FarmingArea) {
    for (const key of area.cultivable) {
      const [x = 0, y = 0] = key.split(',').map(Number); const position = tileToWorld({ x, y });
      this.soils.set(key, scene.add.image(position.x, position.y, textures.tileset, 3).setOrigin(0).setDepth(1));
    }
    this.cursor = scene.add.rectangle(0, 0, 30, 30).setStrokeStyle(2, 0xffe4a0).setDepth(9000);
    this.refresh();
  }
  refresh(): void {
    for (const [key, image] of this.soils) {
      const [x = 0, y = 0] = key.split(',').map(Number); const tile = { x, y }; const plot = getPlot(this.state, tile);
      image.setFrame(plot.kind === 'natural' ? 3 : 2).setTint(isWet(this.state, plot) ? 0x8297a8 : 0xffffff);
      const old = this.labels.get(key); old?.destroy(); this.labels.delete(key);
      this.plants.get(key)?.destroy(); this.plants.delete(key);
      if (plot.kind !== 'tilled' || !plot.crop) continue;
      const definition = crops[plot.crop.id]; const mature = isMature(plot.crop);
      const plant = this.scene.add.image(image.x + 16, image.y + 29, cropTexture(plot.crop.id, cropStage(plot.crop)))
        .setOrigin(0.5, 1).setDepth(image.y + 29);
      this.plants.set(key, plant);
      const label = this.scene.add.text(image.x + 16, image.y - 3,
        mature ? `${definition.name} · 成熟` : `${definition.name} ${cropStage(plot.crop) + 1}/${definition.stages.length}`,
        { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '9px', color: mature ? '#ffe28b' : '#f1f1d4',
          backgroundColor: mature ? '#675321' : '#274b31', align: 'center', padding: { x: 1, y: 1 } })
        .setOrigin(0.5, 1).setDepth(image.y + 30);
      this.labels.set(key, label);
    }
  }
  target(tile: Point, visible: boolean): void {
    const position = tileToWorld(tile, 32, 'center');
    this.cursor.setPosition(position.x, position.y).setVisible(visible && this.area.cultivable.has(tileKey(tile)));
  }
}
