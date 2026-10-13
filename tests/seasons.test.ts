import { describe,expect,it } from 'vitest';
import { createGameState } from '../src/domain/GameState';
import { useFarmTool } from '../src/domain/farming';
import { addItem,equipItem,countItem } from '../src/domain/inventory';
import { advanceDay } from '../src/domain/time';
import { deserializeSave } from '../src/adapters/storage/saveCodec';
const area={width:60,height:40,cultivable:new Set(['2,3'])};const tile={x:2,y:3};
const setup=()=>createGameState({x:928,y:688});
describe('seasonal farming',()=>{
  it('rejects summer-only pumpkin in spring without consuming a seed',()=>{
    const s=setup();useFarmTool(s,tile,area);addItem(s,'seed-pumpkin',1);equipItem(s,'seed-pumpkin');const before=structuredClone(s);
    expect(useFarmTool(s,tile,area).ok).toBe(false);expect(s).toEqual(before);expect(countItem(s,'seed-pumpkin')).toBe(1);
    s.day=29;s.lastSettledDay=28;expect(useFarmTool(s,tile,area).ok).toBe(true);
  });
  it('clears incompatible crops at seasonal boundaries while retaining tilled soil and suitable crops',()=>{
    const s=setup();s.day=28;s.lastSettledDay=27;
    s.plots['2,3']={kind:'tilled',wateredOn:28,crop:{id:'turnip',growthDays:3,plantedOn:20}};
    s.plots['3,3']={kind:'tilled',wateredOn:28,crop:{id:'potato',growthDays:1,plantedOn:20}};
    const result=advanceDay(s,28);expect(result.message).toContain('1');
    expect(s.plots['2,3']).toEqual({kind:'tilled',wateredOn:null,crop:null});expect(s.plots['3,3']).toMatchObject({crop:{id:'potato',growthDays:2}});
    const before=structuredClone(s);expect(advanceDay(s,28).ok).toBe(false);expect(s).toEqual(before);
  });
  it('winter prevents planting and clears summer/autumn crops on its first day',()=>{
    const s=setup();s.day=84;s.lastSettledDay=83;s.plots['2,3']={kind:'tilled',wateredOn:null,crop:{id:'pumpkin',growthDays:4,plantedOn:70}};
    advanceDay(s,84);expect(s.plots['2,3']).toMatchObject({crop:null});equipItem(s,'seed-turnip');expect(useFarmTool(s,tile,area).ok).toBe(false);expect(countItem(s,'seed-turnip')).toBe(10);
  });
  it('does not silently discard legacy progress during load or within the same season',()=>{
    const s=setup();s.plots['2,3']={kind:'tilled',wateredOn:null,crop:{id:'pumpkin',growthDays:4,plantedOn:1}};
    const {expansion:_expansion,...old}=s;const migrated=deserializeSave(JSON.stringify({...old,schemaVersion:5}));
    expect(migrated.plots['2,3']).toMatchObject({crop:{id:'pumpkin',growthDays:4}});advanceDay(migrated,1);expect(migrated.plots['2,3']).toMatchObject({crop:{id:'pumpkin',growthDays:4}});
  });
});
