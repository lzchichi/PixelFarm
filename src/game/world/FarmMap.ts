import Phaser from 'phaser';
import type { FarmMapDefinition } from '../../data/farmMap';
import type { Rectangle } from '../../domain/GameState';
import { tileToWorld } from '../../domain/grid';
import { textures } from '../assets/palette';
import { artTexture } from '../../data/artAssets';
import { artAssets } from '../../data/artAssets';
import { seasonForDay,seasonalColors,type Season } from '../../data/timeConfig';

export class FarmMap {
  readonly obstacles: Rectangle[];
  readonly objectImages: {object:FarmMapDefinition['objects'][number];image:Phaser.GameObjects.Image}[]=[];
  private readonly terrain: Phaser.Tilemaps.TilemapLayer;
  private readonly bodies: Phaser.Physics.Arcade.StaticGroup;
  private season?:Season;

  constructor(private readonly scene: Phaser.Scene, readonly definition: FarmMapDefinition, key = 'farm-map') {
    const tilemap = scene.make.tilemap({ key });
    const tileset = tilemap.addTilesetImage('farm-tiles', textures.tileset, definition.tileSize, definition.tileSize, 0, 0, 1);
    if (!tileset) throw new Error('地图瓦片集不存在');
    const terrain = tilemap.createLayer('Ground', tileset, 0, 0);
    if (!terrain) throw new Error('地图 Ground 图层不存在');
    this.terrain = terrain;
    terrain.setCollisionByProperty({ collides: true });
    this.bodies = scene.physics.add.staticGroup();
    this.obstacles = definition.collisions.map((rect) => ({ ...rect }));
    for (const rect of definition.collisions) {
      const zone = scene.add.zone(rect.x, rect.y, rect.width, rect.height).setOrigin(0);
      this.bodies.add(zone);
    }
    definition.ground.forEach((id, index) => {
      if (!definition.collidingTileIds.includes(id)) return;
      const point = tileToWorld({ x: index % definition.width, y: Math.floor(index / definition.width) }, definition.tileSize);
      this.obstacles.push({ ...point, width: definition.tileSize, height: definition.tileSize });
    });
    for (const object of definition.objects) {
      const image=scene.add.image(object.x, object.y, artTexture(object.asset)).setOrigin(0).setDepth(object.y + object.depthAnchor);
      this.objectImages.push({object,image});
    }
    const width = definition.width * definition.tileSize; const height = definition.height * definition.tileSize;
    scene.physics.world.setBounds(0, 0, width, height);
    scene.cameras.main.setBounds(0, 0, width, height);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => tilemap.destroy());
  }

  collideWith(player: Phaser.Physics.Arcade.Sprite): void {
    this.scene.physics.add.collider(player, this.terrain);
    this.scene.physics.add.collider(player, this.bodies);
  }
  applySeason(day:number):void {
    const season=seasonForDay(day);if(season===this.season)return;this.season=season;
    this.terrain.setTint(seasonalColors[season].ground);
    for(const {object,image} of this.objectImages) {
      if(object.kind!=='tree')continue;
      const deciduous=['tree-spring','tree-oak','tree-autumn'].includes(object.asset);
      const asset=deciduous&&season==='autumn'?'tree-autumn':object.asset;
      const art=artAssets.objects[asset];
      image.setTexture(artTexture(asset)).setPosition(object.x+(object.width-art.width)/2,object.y+object.height-art.height).setTint(seasonalColors[season].trees);
    }
  }
}
