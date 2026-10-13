import type { ItemId } from './items';
import type { ArtObjectKey } from './artAssets';
export type BuildingKind='fence'|'lamp'|'bench';
export interface BuildingDefinition {name:string;kit:ItemId;asset:ArtObjectKey;width:number;height:number;materials:Partial<Record<ItemId,number>>}
export const buildings:Record<BuildingKind,BuildingDefinition>={
  fence:{name:'栅栏',kit:'kit-fence',asset:'fence',width:2,height:1,materials:{wood:4}},
  lamp:{name:'路灯',kit:'kit-lamp',asset:'lantern',width:2,height:1,materials:{wood:3,stone:2}},
  bench:{name:'长椅',kit:'kit-bench',asset:'bench',width:3,height:1,materials:{wood:6}},
};
export function isBuildingKind(v:unknown):v is BuildingKind{return v==='fence'||v==='lamp'||v==='bench';}
