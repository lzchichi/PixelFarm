import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/domain/GameState';
import { buyAnimal, feedAnimal, collectAnimal } from '../src/domain/animals';
import { addItem, countItem } from '../src/domain/inventory';
import { advanceDay } from '../src/domain/time';
import { deserializeSave, serializeSave } from '../src/adapters/storage/saveCodec';
import { quoteTrade, trade } from '../src/domain/economy';
const setup = () => createGameState({ x: 928, y: 688 });
describe('livestock business', () => {
  it('buys both species, validates money and rejects duplicate purchase tokens', () => {
    const s = setup(); expect(buyAnimal(s, 'chicken', 1).ok).toBe(true);
    const before = structuredClone(s); expect(buyAnimal(s, 'chicken', 1).ok).toBe(false); expect(s).toEqual(before);
    expect(buyAnimal(s, 'cow', 2).ok).toBe(true); expect(s.coins).toBe(50);
    expect(s.expansion.animals.map(a => a.kind)).toEqual(['chicken', 'cow']);
    const poor = structuredClone(s); expect(buyAnimal(s, 'cow', 3).ok).toBe(false); expect(s).toEqual(poor);
  });
  it('limits housing capacity without deducting money', () => {
    const s = setup(); s.coins = 3000;
    for(let i=0;i<4;i++) expect(buyAnimal(s,'chicken',s.nextTradeId).ok).toBe(true);
    const before = structuredClone(s); expect(buyAnimal(s,'chicken',s.nextTradeId).ok).toBe(false); expect(s).toEqual(before);
  });
  it('requires feed, consumes once daily and produces exactly once across days', () => {
    const s = setup(); buyAnimal(s,'chicken',1); const id = s.expansion.animals[0]!.id;
    const before = structuredClone(s); expect(feedAnimal(s,id).ok).toBe(false); expect(s).toEqual(before);
    addItem(s,'feed',2); expect(feedAnimal(s,id).ok).toBe(true);
    expect(feedAnimal(s,id).ok).toBe(false); expect(countItem(s,'feed')).toBe(1);
    advanceDay(s,1); expect(s.expansion.animals[0]).toMatchObject({ productReady:true, friendship:2 });
    const next = structuredClone(s); expect(advanceDay(s,1).ok).toBe(false); expect(s).toEqual(next);
    expect(collectAnimal(s,id).ok).toBe(true); expect(collectAnimal(s,id).ok).toBe(false); expect(countItem(s,'egg')).toBe(1);
    advanceDay(s,2); expect(s.expansion.animals[0]!.productReady).toBe(false);
    expect(s.expansion.animals[0]!.hunger).toBeGreaterThan(0);
  });
  it('keeps an uncollected product when hungry and a full bag prevents collecting', () => {
    const s = setup(); buyAnimal(s,'cow',1); const a = s.expansion.animals[0]!;
    addItem(s,'feed',1); feedAnimal(s,a.id); advanceDay(s,1); advanceDay(s,2);
    expect(a.productReady).toBe(true);
    s.inventory.slots.fill(null); for(let i=0;i<24;i++) s.inventory.slots[i]={id:'hoe',quantity:1,quality:'normal'};
    const before=structuredClone(s); expect(collectAnimal(s,a.id).ok).toBe(false); expect(s).toEqual(before);
    s.inventory.slots[23]=null; expect(collectAnimal(s,a.id).ok).toBe(true); expect(countItem(s,'milk')).toBe(1);
    expect(trade(s,quoteTrade(s,'farm-shop','sell','milk',1)).ok).toBe(true); expect(s.coins).toBe(300);
  });
  it('roundtrips animals and migrates historical versions without changing progress', () => {
    const s=setup(); buyAnimal(s,'chicken',1); addItem(s,'feed',1); feedAnimal(s,1); advanceDay(s,1);
    expect(deserializeSave(serializeSave(s))).toEqual(s);
    const { expansion: _expansion, ...old } = s;
    const restored=deserializeSave(JSON.stringify({...old,schemaVersion:5}));
    expect(restored.coins).toBe(350); expect(restored.day).toBe(2); expect(restored.expansion.animals).toEqual([]);
    expect(()=>deserializeSave(JSON.stringify({...s,expansion:undefined}))).toThrow();
    expect(()=>deserializeSave(JSON.stringify({...s,expansion:{...s.expansion,animals:[{...s.expansion.animals[0],hunger:-1}]}}))).toThrow();
  });
});
