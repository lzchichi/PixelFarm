import { animals, type AnimalKind } from '../data/animals';
import type { GameState } from './GameState';
import { addItem, removeItem, type InventoryResult } from './inventory';
export interface AnimalState { id:number; kind:AnimalKind; hunger:number; friendship:number; fedOn:number; productReady:boolean }
const result=(ok:boolean,message:string):InventoryResult=>({ok,message});
export function buyAnimal(s:GameState, kind:AnimalKind, requestId:number):InventoryResult {
  const d=animals[kind];
  if(requestId!==s.nextTradeId || !Number.isSafeInteger(s.nextTradeId+1) || !Number.isSafeInteger(s.expansion.nextAnimalId+1)) return result(false,'购买请求已过期。');
  if(s.expansion.animals.filter(a=>a.kind===kind).length>=d.capacity) return result(false,'饲养空间已满。');
  if(s.coins<d.price) return result(false,'金币不足。');
  s.coins-=d.price; s.nextTradeId++;
  s.expansion.animals.push({id:s.expansion.nextAnimalId++,kind,hunger:60,friendship:0,fedOn:0,productReady:false});
  return result(true,`购买了${d.name}，记得每天喂食。`);
}
export function feedAnimal(s:GameState,id:number):InventoryResult {
  const a=s.expansion.animals.find(a=>a.id===id);
  if(!a) return result(false,'动物不存在。');
  if(a.fedOn===s.day) return result(false,'今天已经喂过了。');
  if(!removeItem(s,'feed',1).ok) return result(false,'饲料不足，请到商店购买。');
  a.fedOn=s.day;a.hunger=0;a.friendship=Math.min(100,a.friendship+2);
  return result(true,'已喂食，次日可生产。');
}
export function collectAnimal(s:GameState,id:number):InventoryResult {
  const a=s.expansion.animals.find(a=>a.id===id);
  if(!a?.productReady) return result(false,'还没有可收取的产物。');
  if(!addItem(s,animals[a.kind].product,1).ok) return result(false,'背包已满，产物仍然保留。');
  a.productReady=false;return result(true,'产物已放入背包，可到商店出售。');
}
/** Called only by the guarded daily settlement in time.ts. */
export function settleAnimalsForDay(s:GameState):void {
  for(const a of s.expansion.animals) {
    if(a.fedOn===s.day) a.productReady=true;
    else a.friendship=Math.max(0,a.friendship-2);
    a.hunger=Math.min(100,a.hunger+35);
  }
}
