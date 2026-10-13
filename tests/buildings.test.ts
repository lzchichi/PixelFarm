import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/domain/GameState';
import { addItem, countItem } from '../src/domain/inventory';
import { canPlaceBuilding, placeBuilding, moveBuilding, removeBuilding, buildingTarget } from '../src/domain/buildings';
import { parseFarmMap } from '../src/data/farmMap';
import raw from '../public/assets/maps/farm.json';
import { deserializeSave, serializeSave } from '../src/adapters/storage/saveCodec';
const map={...parseFarmMap(raw),ground:Array<number>(7000).fill(1),collisions:[],objects:[],interactions:[]};
const setup=()=>createGameState({x:928,y:688});
describe('grid building placement',()=>{
  it('places multi-cell buildings entirely in front of the player in all four directions',()=>{
    const s=setup();s.player={x:944,y:688};
    const openMap={...map,spawn:{x:32,y:32}}; // Keep this test away from the separately protected entrance spawn.
    expect(buildingTarget(s.player,'left','fence')).toEqual({x:27,y:21});
    expect(buildingTarget(s.player,'right','fence')).toEqual({x:30,y:21});
    expect(buildingTarget(s.player,'up','fence')).toEqual({x:29,y:20});
    expect(buildingTarget(s.player,'down','fence')).toEqual({x:29,y:22});
    for(const direction of ['left','right','up','down'] as const)expect(canPlaceBuilding(s,openMap,'fence',buildingTarget(s.player,direction,'fence')).ok).toBe(true);
    // The foot box crosses a cell boundary; reserve the next fully empty cell.
    s.player.x=928;expect(buildingTarget(s.player,'left','fence')).toEqual({x:26,y:21});
    expect(canPlaceBuilding(s,openMap,'fence',buildingTarget(s.player,'left','fence')).ok).toBe(true);
  });
  it('consumes one kit and prevents overlapping placements',()=>{
    const s=setup();addItem(s,'kit-fence',2);
    expect(placeBuilding(s,map,'fence',{x:8,y:8}).ok).toBe(true);expect(countItem(s,'kit-fence')).toBe(1);
    const before=structuredClone(s);expect(placeBuilding(s,map,'fence',{x:9,y:8}).ok).toBe(false);expect(s).toEqual(before);
    expect(deserializeSave(serializeSave(s))).toEqual(s);
  });
  it('rejects water, farmland, static scenery, entrances, occupied player cells and edges',()=>{
    const s=setup();const tile={x:8,y:8};
    for(const gid of [3,5]) { const m={...map,ground:[...map.ground]};m.ground[8*map.width+8]=gid;expect(canPlaceBuilding(s,m,'fence',tile).ok).toBe(false); }
    expect(canPlaceBuilding(s,{...map,collisions:[{x:256,y:256,width:10,height:10}]},'fence',tile).ok).toBe(false);
    expect(canPlaceBuilding(s,{...map,interactions:[{id:'door',name:'door',message:'',x:256,y:256,width:16,height:16}]},'fence',tile).ok).toBe(false);
    expect(canPlaceBuilding(s,map,'fence',{x:29,y:21}).ok).toBe(false);
    for(const tile of [{x:-1,y:8},{x:99,y:8},{x:8,y:70},{x:1.5,y:8}]) expect(canPlaceBuilding(s,map,'fence',tile).ok).toBe(false);
    expect(s.expansion.buildings).toEqual([]);
  });
  it('moves atomically and retains the original after rejected destination',()=>{
    const s=setup();addItem(s,'kit-lamp',1);placeBuilding(s,map,'lamp',{x:8,y:8});
    expect(moveBuilding(s,map,1,{x:10,y:9}).ok).toBe(true);expect(s.expansion.buildings[0]).toMatchObject({id:1,x:10,y:9});
    const before=structuredClone(s);expect(moveBuilding(s,map,1,{x:100,y:9}).ok).toBe(false);expect(s).toEqual(before);
    expect(countItem(s,'kit-lamp')).toBe(0);
  });
  it('returns the kit on demolition and rejects full bags and repeat demolition',()=>{
    const s=setup();addItem(s,'kit-bench',1);placeBuilding(s,map,'bench',{x:8,y:8});
    for(let i=0;i<24;i++)s.inventory.slots[i]={id:'hoe',quantity:1,quality:'normal'};
    const before=structuredClone(s);expect(removeBuilding(s,1).ok).toBe(false);expect(s).toEqual(before);
    s.inventory.slots[23]=null;expect(removeBuilding(s,1).ok).toBe(true);expect(countItem(s,'kit-bench')).toBe(1);
    expect(removeBuilding(s,1).ok).toBe(false);
  });
});
