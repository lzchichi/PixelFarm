import Phaser from 'phaser';
import type { GameState } from '../../domain/GameState';
import { animals } from '../../data/animals';
export class Livestock {
  private readonly sprites=new Map<number,Phaser.GameObjects.Image>();
  constructor(private readonly scene:Phaser.Scene,private readonly state:GameState) {}
  refresh():void {
    const counts={chicken:0,cow:0};
    for(const a of this.state.expansion.animals) {
      const point=animals[a.kind].positions[counts[a.kind]++]!;
      let sprite=this.sprites.get(a.id);
      if(!sprite){sprite=this.scene.add.image(point.x,point.y,`animal-${a.kind}-down-0`).setOrigin(.5,1).setDepth(point.y);this.sprites.set(a.id,sprite);}
      const pose=a.productReady?'rest':a.fedOn===this.state.day?'feed':'down-0';
      sprite.setTexture(`animal-${a.kind}-${pose}`);
    }
  }
}
