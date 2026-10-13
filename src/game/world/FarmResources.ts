import { farmResources,type FarmResourceId } from '../../data/farmResources';
import type { GameState } from '../../domain/GameState';
import type { InteractionObject } from '../../data/farmMap';
import { resourceAvailable } from '../../domain/gathering';
import type { FarmMap } from './FarmMap';
export class FarmResources {
  readonly interactions:InteractionObject[]=[];
  constructor(private readonly world:FarmMap,private readonly state:GameState) {
    for(const [id,d] of Object.entries(farmResources)) {
      const object=world.definition.objects.find(o=>o.asset===d.asset);if(!object)throw new Error(`地图缺少采集资源 ${id}`);
      this.interactions.push({...object,id,name:`采集${d.name}`,message:''});
    }
  }
  refresh():void {
    for(const [id,d] of Object.entries(farmResources)) {
      const active=resourceAvailable(this.state,id as FarmResourceId);
      this.world.objectImages.find(o=>o.object.asset===d.asset)?.image.setAlpha(active?1:.4);
      const target=this.interactions.find(t=>t.id===id);if(target)target.name=active?`采集${d.name}`:`${d.name} · 恢复中`;
    }
  }
}
