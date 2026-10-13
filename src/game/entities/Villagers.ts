import type Phaser from 'phaser';
import { npcs, npcIds, type NpcId } from '../../data/npcs';
import type { GameState } from '../../domain/GameState';
import { npcPosition } from '../../domain/village';
import type { InteractionObject } from '../../data/farmMap';
export class Villagers {
  private readonly sprites: {id:NpcId;sprite:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text}[];
  constructor(scene: Phaser.Scene, private readonly state: GameState) {
    this.sprites=npcIds.map(id => ({id,sprite:scene.add.image(0,0,`npc-${id}-down`).setOrigin(0.5,1),label:scene.add.text(0,0,npcs[id].name,{fontFamily:'monospace',fontSize:'11px',color:'#fff2cd',backgroundColor:'#18382e',padding:{x:4,y:2}}).setOrigin(0.5,1)}));
    this.update();
  }
  update(): InteractionObject[] {
    return this.sprites.map(({id,sprite,label}) => {
      const point = npcPosition(id,this.state.minute);
      sprite.setPosition(point.x,point.y+14).setDepth(point.y+14);
      label.setPosition(point.x,point.y-38).setDepth(point.y+15);
      return {id,name:`${npcs[id].name} · ${npcs[id].role}`,message:npcs[id].name,x:point.x-12,y:point.y-14,width:24,height:28};
    });
  }
}
