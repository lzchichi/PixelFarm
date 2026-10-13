import { buildings, type BuildingKind } from '../data/buildings';
import type { FarmMapDefinition } from '../data/farmMap';
import { animals } from '../data/animals';
import type { GameState, Point, Rectangle } from './GameState';
import { addItem, removeItem, type InventoryResult } from './inventory';
import type { Direction } from './interaction';
import { artAssets } from '../data/artAssets';
export interface PlacedBuilding extends Point {id:number;kind:BuildingKind}
export type BuildMode={kind:BuildingKind;movingId?:number};
export const overlaps=(a:Rectangle,b:Rectangle):boolean=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
export function buildingTarget(player:Point,direction:Direction,kind:BuildingKind):Point {
  const d=buildings[kind],tile={x:Math.floor(player.x/32),y:Math.floor(player.y/32)};
  // Offset from the leading edge of the actual 24×28 player foot box.
  if(direction==='left')tile.x=Math.floor((player.x-12)/32)-d.width;
  else if(direction==='right')tile.x=Math.ceil((player.x+12)/32);
  else if(direction==='up')tile.y=Math.floor((player.y-14)/32)-d.height;
  else tile.y=Math.ceil((player.y+14)/32);
  return tile;
}
export function buildingBox(kind:BuildingKind,tile:Point):Rectangle {
  const d=buildings[kind];return {x:tile.x*32,y:tile.y*32,width:d.width*32,height:d.height*32};
}
export function canPlaceBuilding(s:GameState,map:FarmMapDefinition,kind:BuildingKind,tile:Point,excludeId?:number):InventoryResult {
  const box=buildingBox(kind,tile),d=buildings[kind];
  const fail=(message:string):InventoryResult=>({ok:false,message});
  if(!Number.isSafeInteger(tile.x)||!Number.isSafeInteger(tile.y)||tile.x<0||tile.y<0||tile.x+d.width>map.width||tile.y+d.height>map.height)return fail('建筑超出地图或没有对齐网格。');
  for(let y=tile.y;y<tile.y+d.height;y++)for(let x=tile.x;x<tile.x+d.width;x++) {
    const gid=map.ground[y*map.width+x]!;
    const terrain=artAssets.tiles[gid-1];
    if(![1,2,4,6].includes(gid)&&(!terrain||terrain.collides||!('terrain' in terrain)||(terrain.terrain!=='grass'&&terrain.terrain!=='dirt')))return fail('这里的地形不能放置建筑。');
  }
  const reserved:Rectangle[]=[...map.collisions,...map.objects,...map.interactions,
    {x:map.spawn.x-48,y:map.spawn.y-48,width:96,height:96},
    ...Object.values(animals).flatMap(a=>a.positions.map(p=>({x:p.x-44,y:p.y-56,width:88,height:72})))];
  if(reserved.some(r=>overlaps(box,r)))return fail('这里有障碍、入口或动物活动区域。');
  if(s.mapId==='farm'&&overlaps(box,{x:s.player.x-12,y:s.player.y-14,width:24,height:28}))return fail('请离开放置位置。');
  if(s.expansion.buildings.some(b=>b.id!==excludeId&&overlaps(box,buildingBox(b.kind,b))))return fail('这里已有建筑。');
  return {ok:true,message:'可以放置。'};
}
export function placeBuilding(s:GameState,map:FarmMapDefinition,kind:BuildingKind,tile:Point):InventoryResult {
  const check=canPlaceBuilding(s,map,kind,tile);if(!check.ok)return check;
  if(!Number.isSafeInteger(s.expansion.nextBuildingId+1))return {ok:false,message:'建筑编号已达上限。'};
  if(!removeItem(s,buildings[kind].kit,1).ok)return {ok:false,message:'背包中没有这个建筑，请先购买或制作。'};
  s.expansion.buildings.push({id:s.expansion.nextBuildingId++,kind,...tile});return {ok:true,message:'建筑已放置。'};
}
export function moveBuilding(s:GameState,map:FarmMapDefinition,id:number,tile:Point):InventoryResult {
  const b=s.expansion.buildings.find(b=>b.id===id);if(!b)return {ok:false,message:'建筑不存在。'};
  const check=canPlaceBuilding(s,map,b.kind,tile,id);if(!check.ok)return check;
  b.x=tile.x;b.y=tile.y;return {ok:true,message:'建筑已移动。'};
}
export function removeBuilding(s:GameState,id:number):InventoryResult {
  const b=s.expansion.buildings.find(b=>b.id===id);if(!b)return {ok:false,message:'建筑不存在。'};
  if(!addItem(s,buildings[b.kind].kit,1).ok)return {ok:false,message:'背包已满，建筑仍保留。'};
  s.expansion.buildings=s.expansion.buildings.filter(b=>b.id!==id);return {ok:true,message:'已拆除，建筑返还背包。'};
}
