import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/domain/GameState';
import { addItem,countItem } from '../src/domain/inventory';
import { gatherFarmResource,resourceAvailable,craftBuilding } from '../src/domain/gathering';
import { advanceDay } from '../src/domain/time';
import { deserializeSave,serializeSave } from '../src/adapters/storage/saveCodec';
import { quoteTrade,trade } from '../src/domain/economy';
const setup=()=>createGameState({x:928,y:688});
describe('farm resource economy',()=>{
  it('collects once and refreshes only after the configured game days including reload',()=>{
    const s=setup();expect(gatherFarmResource(s,'farm-wood').ok).toBe(true);expect(countItem(s,'wood')).toBe(2);
    const before=structuredClone(s);expect(gatherFarmResource(s,'farm-wood').ok).toBe(false);expect(s).toEqual(before);
    advanceDay(s,1);expect(resourceAvailable(s,'farm-wood')).toBe(false);advanceDay(s,2);
    const loaded=deserializeSave(serializeSave(s));expect(resourceAvailable(loaded,'farm-wood')).toBe(true);
    expect(gatherFarmResource(loaded,'farm-wood').ok).toBe(true);expect(countItem(loaded,'wood')).toBe(4);
  });
  it('does not consume a node with a full bag and refuses wrong map',()=>{
    const s=setup();for(let i=0;i<24;i++)s.inventory.slots[i]={id:'hoe',quantity:1,quality:'normal'};
    const before=structuredClone(s);expect(gatherFarmResource(s,'farm-stone').ok).toBe(false);expect(s).toEqual(before);
    s.inventory.slots[23]=null;s.mapId='town';expect(gatherFarmResource(s,'farm-stone').ok).toBe(false);
  });
  it('crafts only with all materials, without spending money or partially consuming ingredients',()=>{
    const s=setup();addItem(s,'wood',3);const before=structuredClone(s);expect(craftBuilding(s,'lamp').ok).toBe(false);expect(s).toEqual(before);
    addItem(s,'stone',2);expect(craftBuilding(s,'lamp').ok).toBe(true);expect(countItem(s,'kit-lamp')).toBe(1);expect(countItem(s,'wood')).toBe(0);expect(countItem(s,'stone')).toBe(0);expect(s.coins).toBe(500);
    expect(craftBuilding(s,'lamp').ok).toBe(false);
  });
  it('rejects a full crafting output bag but permits materials to free their slot',()=>{
    const s=setup();for(let i=0;i<24;i++)s.inventory.slots[i]={id:'wood',quantity:99,quality:'normal'};
    const before=structuredClone(s);expect(craftBuilding(s,'fence').ok).toBe(false);expect(s).toEqual(before);
    s.inventory.slots[0]!.quantity=4;expect(craftBuilding(s,'fence').ok).toBe(true);expect(countItem(s,'kit-fence')).toBe(1);
  });
  it('sells wood, stone and wild plants through the atomic economy',()=>{
    const s=setup();addItem(s,'wood',2);addItem(s,'stone',2);addItem(s,'wild-mushroom',1);
    for(const id of ['wood','stone','wild-mushroom'] as const)expect(trade(s,quoteTrade(s,'farm-shop','sell',id,countItem(s,id))).ok).toBe(true);
    expect(s.coins).toBe(540);expect(countItem(s,'wild-mushroom')).toBe(0);
  });
});
