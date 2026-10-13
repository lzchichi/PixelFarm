import Phaser from 'phaser';
import type { GameState, Point, Rectangle } from '../../domain/GameState';
import { buildingBox, canPlaceBuilding, type BuildMode } from '../../domain/buildings';
import { buildings } from '../../data/buildings';
import { artTexture, artAssets } from '../../data/artAssets';
import type { FarmMapDefinition } from '../../data/farmMap';
export class PlacedBuildings {
  private readonly group:Phaser.Physics.Arcade.StaticGroup;
  private readonly sprites:Phaser.GameObjects.Image[]=[];
  private readonly ghost:Phaser.GameObjects.Image;
  private readonly outline:Phaser.GameObjects.Rectangle;
  private signature='';
  obstacles:Rectangle[]=[];
  constructor(private readonly scene:Phaser.Scene,private readonly state:GameState,private readonly map:FarmMapDefinition,player:Phaser.Physics.Arcade.Sprite) {
    this.group=scene.physics.add.staticGroup();scene.physics.add.collider(player,this.group);
    this.ghost=scene.add.image(0,0,artTexture('fence')).setOrigin(.5,1).setAlpha(.65).setDepth(15000).setVisible(false);
    this.outline=scene.add.rectangle(0,0,64,32).setOrigin(0).setDepth(14999).setVisible(false);this.refresh();
  }
  refresh():void {
    const signature=JSON.stringify(this.state.expansion.buildings);if(signature===this.signature)return;this.signature=signature;
    this.group.clear(true,true);for(const s of this.sprites)s.destroy();this.sprites.length=0;this.obstacles=[];
    for(const b of this.state.expansion.buildings) {
      const d=buildings[b.kind],box=buildingBox(b.kind,b),art=artAssets.objects[d.asset];this.obstacles.push(box);
      this.sprites.push(this.scene.add.image(box.x+box.width/2,box.y+box.height,artTexture(d.asset)).setOrigin(.5,1).setDepth(box.y+box.height));
      const zone=this.scene.add.zone(box.x,box.y,box.width,box.height).setOrigin(0);this.group.add(zone);
      if(art.width>box.width)throw new Error('建筑素材超出配置占用网格');
    }
  }
  preview(mode:BuildMode|undefined,tile:Point):void {
    this.ghost.setVisible(!!mode);this.outline.setVisible(!!mode);if(!mode)return;
    const box=buildingBox(mode.kind,tile),check=canPlaceBuilding(this.state,this.map,mode.kind,tile,mode.movingId),color=check.ok?0x8fe085:0xff7676;
    this.ghost.setTexture(artTexture(buildings[mode.kind].asset)).setPosition(box.x+box.width/2,box.y+box.height).setTint(color);
    this.outline.setPosition(box.x,box.y).setSize(box.width,box.height).setFillStyle(color,.22).setStrokeStyle(1,color);
  }
}
