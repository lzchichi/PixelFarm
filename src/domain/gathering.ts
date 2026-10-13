import { farmResources,type FarmResourceId } from '../data/farmResources';
import { buildings,type BuildingKind } from '../data/buildings';
import type { ItemId } from '../data/items';
import type { GameState } from './GameState';
import { addItem,countItem,removeItem,type InventoryResult } from './inventory';
export function resourceAvailable(s:GameState,id:FarmResourceId):boolean {
  const last=s.expansion.gatheredOn[id];return last===undefined||s.day-last>=farmResources[id].refreshDays;
}
export function gatherFarmResource(s:GameState,id:FarmResourceId):InventoryResult {
  if(s.mapId!=='farm')return {ok:false,message:'这个资源在农场。'};
  if(!resourceAvailable(s,id))return {ok:false,message:'资源还在恢复，过几天再来。'};
  const d=farmResources[id],outcome=addItem(s,d.item,d.quantity);if(!outcome.ok)return outcome;
  s.expansion.gatheredOn[id]=s.day;return {ok:true,message:`收集了 ${d.quantity} 份${d.name}，${d.refreshDays} 天后恢复。`};
}
export function craftBuilding(s:GameState,kind:BuildingKind):InventoryResult {
  const d=buildings[kind];
  const costs=Object.entries(d.materials) as [ItemId,number][]; // Entries come from typed, internal configuration only.
  if(costs.some(([id,n])=>countItem(s,id)<n))return {ok:false,message:'制作材料不足。'};
  // Plan against a separate inventory so failure cannot consume partial ingredients.
  const draft:GameState={...s,inventory:{revision:s.inventory.revision,slots:s.inventory.slots.map(slot=>slot?{...slot}:null)}};
  for(const [id,n] of costs)removeItem(draft,id,n);
  if(!addItem(draft,d.kit,1).ok)return {ok:false,message:'背包已满，材料未扣除。'};
  s.inventory=draft.inventory;return {ok:true,message:`制作了${d.name}组件。`};
}
