import type { ArtObjectKey } from './artAssets';
import type { ItemId } from './items';
export interface FarmResourceDefinition {name:string;asset:ArtObjectKey;item:ItemId;quantity:number;refreshDays:number}
export const farmResources={
  'farm-wood':{name:'落木',asset:'log-moss',item:'wood',quantity:2,refreshDays:2},
  'farm-stone':{name:'石料',asset:'rock-cluster',item:'stone',quantity:2,refreshDays:3},
  'farm-wild':{name:'野生蘑菇',asset:'mushrooms-red',item:'wild-mushroom',quantity:1,refreshDays:1},
} satisfies Record<string,FarmResourceDefinition>;
export type FarmResourceId=keyof typeof farmResources;
export function isFarmResourceId(v:unknown):v is FarmResourceId{return typeof v==='string'&&Object.hasOwn(farmResources,v);}
