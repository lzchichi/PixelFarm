import {describe,expect,it} from 'vitest';
import {createGameState} from '../src/domain/GameState';
import {serializeSave,deserializeSave} from '../src/adapters/storage/saveCodec';
import {SaveRepository} from '../src/adapters/storage/SaveRepository';
import {validateWorldState,saveGame} from '../src/application/session';
import {parseFarmMap} from '../src/data/farmMap';
import raw from '../public/assets/maps/farm.json';
const setup=()=>createGameState({x:928,y:688});
describe('expansion persistence validation',()=>{
  it('roundtrips new farm coordinates and buildings but retains the smaller town bounds',()=>{
    const s=setup();s.player={x:2800,y:2000};s.expansion.nextBuildingId=2;
    s.expansion.buildings=[{id:1,kind:'fence',x:88,y:60}];
    expect(deserializeSave(serializeSave(s))).toEqual(s);
    s.mapId='town';expect(()=>serializeSave(s)).toThrow();
  });
  it('rejects duplicate animal ids, future feed dates, unknown resources and invalid building coordinates',()=>{
    const s=setup();s.expansion.nextAnimalId=2;s.expansion.animals=[{id:1,kind:'chicken',hunger:35,friendship:2,fedOn:1,productReady:true}];
    expect(deserializeSave(serializeSave(s))).toEqual(s);
    const invalid=[
      {...s.expansion,animals:[...s.expansion.animals,...s.expansion.animals]},
      {...s.expansion,animals:[{...s.expansion.animals[0],fedOn:2}]},
      {...s.expansion,gatheredOn:{'not-a-node':1}},
      {...s.expansion,nextBuildingId:2,buildings:[{id:1,kind:'fence',x:99,y:1}]},
    ];
    for(const expansion of invalid)expect(()=>deserializeSave(JSON.stringify({...s,expansion}))).toThrow();
  });
  it('rejects scenery/pond placement and keeps a prior valid save untouched',()=>{
    const map=parseFarmMap(raw),s=setup();s.expansion.nextBuildingId=2;s.expansion.buildings=[{id:1,kind:'lamp',x:36,y:29}];
    // Coordinates fit the schema but are inside the actual pond.
    expect(()=>serializeSave(s)).not.toThrow();expect(validateWorldState(s,map)).toBe(false);
    let rawSave=serializeSave(setup());const previous=rawSave;
    const repo=new SaveRepository(()=>({getItem:()=>rawSave,setItem:(_key,value)=>{rawSave=value;}}));
    expect(saveGame(s,map,repo).ok).toBe(false);expect(rawSave).toBe(previous);
  });
  it('rejects loading a player inside a placed collision while permitting the same farm state from town',()=>{
    const map=parseFarmMap(raw),s=setup();s.expansion.nextBuildingId=2;s.expansion.buildings=[{id:1,kind:'fence',x:4,y:4}];
    expect(validateWorldState(s,map)).toBe(true);s.player={x:144,y:144};expect(validateWorldState(s,map)).toBe(false);
    s.mapId='town';expect(validateWorldState(s,{farm:map,town:map})).toBe(true);
  });
});
