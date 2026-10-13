import Phaser from 'phaser';
import { generateTextures } from '../assets/generateTextures';
import { parseFarmMap } from '../../data/farmMap';
import { artAssets } from '../../data/artAssets';
import { textures } from '../assets/palette';
import { cropArt } from '../../data/cropArt';
import townArt from '../../data/town-art-manifest.json';
import animalArt from '../../data/animal-art-manifest.json';

export class BootScene extends Phaser.Scene {
  private failed = false;
  constructor() { super('Boot'); }

  preload(): void {
    this.failed = false;
    this.cameras.main.setBackgroundColor('#18382e');
    const label = this.add.text(480, 254, '青芽农场 · 准备出发', { fontFamily: 'monospace', fontSize: '22px', color: '#fff2cd' }).setOrigin(0.5);
    const progress = this.add.rectangle(320, 294, 0, 4, 0xe9bd71).setOrigin(0, 0);
    this.load.on('progress', (value: number) => { progress.width = Math.round(value * 320); });
    this.load.once('loaderror', () => {
      this.failed = true;
      label.setText('地图或美术资源加载失败，请刷新重试');
    });
    this.load.tilemapTiledJSON('farm-map', `${import.meta.env.BASE_URL}assets/maps/farm.json`);
    this.load.tilemapTiledJSON('town-map', `${import.meta.env.BASE_URL}assets/maps/town.json`);
    for(const [key,asset] of Object.entries(animalArt.assets)) this.load.image(`animal-${key}`,`${import.meta.env.BASE_URL}${asset.path}`);
    for (const [id, art] of Object.entries(townArt.npcs)) for (const [direction, path] of Object.entries(art.frames)) {
      this.load.image(`npc-${id}-${direction}`, `${import.meta.env.BASE_URL}${path}`);
    }
    this.load.spritesheet(textures.tileset, `${import.meta.env.BASE_URL}assets/art/game/terrain/farm-tiles.png`, { frameWidth: 32, frameHeight: 32 });
    for (const [key, asset] of Object.entries(artAssets.objects)) {
      this.load.image(`art-${key}`, `${import.meta.env.BASE_URL}${asset.path}`);
    }
    for (const [key, asset] of Object.entries(cropArt.assets)) {
      this.load.image(`crop-${key}`, `${import.meta.env.BASE_URL}${asset.path}`);
    }
    const grass = artAssets.tiles.find((tile) => tile.name === 'grass');
    const dirt = artAssets.tiles.find((tile) => tile.name === 'dirt');
    if (!grass || !dirt) throw new Error('素材清单缺少草地或道路');
    this.load.image(textures.grass, `${import.meta.env.BASE_URL}${grass.path}`);
    this.load.image(textures.path, `${import.meta.env.BASE_URL}${dirt.path}`);
  }

  create(): void {
    if (this.failed) return;
    try {
      const input: unknown = this.cache.tilemap.get('farm-map')?.data;
      this.registry.set('farmMap', parseFarmMap(input));
      const town = parseFarmMap(this.cache.tilemap.get('town-map')?.data);
      this.registry.set('worldMaps', { farm: this.registry.get('farmMap'), town });
      for (const [id, art] of Object.entries(townArt.npcs)) for (const direction of Object.keys(art.frames)) this.textures.get(`npc-${id}-${direction}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.registry.set('ambientMotion', true);
      generateTextures(this);
      for(const key of Object.keys(animalArt.assets)) this.textures.get(`animal-${key}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
      for (const key of Object.keys(artAssets.objects)) {
        // Object keys originate from the checked-in, typed art manifest.
        this.textures.get(`art-${key}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      for (const key of Object.keys(cropArt.assets)) this.textures.get(`crop-${key}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get(textures.tileset).setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.scene.start('Menu');
    } catch (error: unknown) {
      this.add.text(480, 350, error instanceof Error ? error.message : '无法启动农场', {
        fontFamily: 'monospace', fontSize: '16px', color: '#fff2cd', wordWrap: { width: 700 },
      }).setOrigin(0.5);
    }
  }
}
