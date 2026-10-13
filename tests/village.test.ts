import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/domain/GameState';
import { addItem, countItem } from '../src/domain/inventory';
import { npcs } from '../src/data/npcs';
import { commissionDefinitions } from '../src/data/commissions';
import { ensureDailyCommissions, acceptCommission, deliverCommission, claimCommission,
  commissionProgress, talkToNpc, npcPosition, collectResource } from '../src/domain/village';
import { serializeSave, deserializeSave } from '../src/adapters/storage/saveCodec';
import { advanceDay } from '../src/domain/time';

const setup = () => createGameState({ x: 928, y: 688 });
describe('villagers and daily commissions', () => {
  it('has three original villagers with distinct schedules and daily conversation limits', () => {
    const s = setup(); expect(Object.keys(npcs)).toHaveLength(3);
    expect(npcPosition('lin-seed', 360)).not.toEqual(npcPosition('lin-seed', 840));
    expect(talkToNpc(s, 'lin-seed').ok).toBe(true); expect(s.village.friendship['lin-seed']).toBe(1);
    talkToNpc(s, 'lin-seed'); expect(s.village.friendship['lin-seed']).toBe(1);
    advanceDay(s, 1); talkToNpc(s, 'lin-seed'); expect(s.village.friendship['lin-seed']).toBe(2);
    expect(talkToNpc(s, 'unknown').ok).toBe(false);
  });
  it('daily requests are deterministic, contain crops and resources, and do not reroll', () => {
    const s = setup(); const copy = setup(); ensureDailyCommissions(s); ensureDailyCommissions(copy);
    expect(s.village.commissions).toEqual(copy.village.commissions); expect(s.village.commissions).toHaveLength(2);
    const before = structuredClone(s); ensureDailyCommissions(s); expect(s).toEqual(before);
    const definitions = s.village.commissions.map(q => commissionDefinitions[q.definitionId]);
    expect(definitions.map(q => q.category).sort()).toEqual(['crop', 'resource']);
  });
  it('keeps accepted commissions across days while refreshing unaccepted offers', () => {
    const s = setup(); ensureDailyCommissions(s); const q = s.village.commissions[0]!;
    expect(acceptCommission(s, q.id).ok).toBe(true); expect(acceptCommission(s, q.id).ok).toBe(false);
    advanceDay(s, s.day); expect(s.village.commissions.find(value => value.id === q.id)?.status).toBe('accepted');
    expect(s.village.commissions.filter(value => value.status === 'available')).toHaveLength(2);
  });
  it('delivers complete quantities atomically to the correct villager and rewards once', () => {
    const s = setup(); ensureDailyCommissions(s); const q = s.village.commissions[1]!;
    const definition = commissionDefinitions[q.definitionId]; acceptCommission(s, q.id);
    expect(commissionProgress(s, q.id)).toEqual({ held: 0, required: definition.quantity });
    let before = structuredClone(s); expect(deliverCommission(s, q.id, definition.npcId).ok).toBe(false); expect(s).toEqual(before);
    addItem(s, definition.itemId, definition.quantity);
    before = structuredClone(s); expect(deliverCommission(s, q.id, 'unknown').ok).toBe(false); expect(s).toEqual(before);
    expect(deliverCommission(s, q.id, definition.npcId).ok).toBe(true); expect(q.status).toBe('completed'); expect(countItem(s, definition.itemId)).toBe(0);
    expect(s.coins).toBe(500); expect(claimCommission(s, q.id, definition.npcId).ok).toBe(true);
    expect(s.coins).toBe(500 + definition.rewardCoins); expect(s.village.friendship[definition.npcId]).toBe(definition.rewardFriendship);
    before = structuredClone(s); expect(claimCommission(s, q.id, definition.npcId).ok).toBe(false); expect(s).toEqual(before);
  });
  it('friendship caps at 100 and overflow rewards cannot partly mutate state', () => {
    const s = setup(); ensureDailyCommissions(s); const q = s.village.commissions[1]!; const d = commissionDefinitions[q.definitionId];
    acceptCommission(s, q.id); addItem(s, d.itemId, d.quantity); deliverCommission(s, q.id, d.npcId);
    s.coins = Number.MAX_SAFE_INTEGER; const before = structuredClone(s);
    expect(claimCommission(s, q.id, d.npcId).ok).toBe(false); expect(s).toEqual(before);
    s.coins = 500; s.village.friendship[d.npcId] = 99; claimCommission(s, q.id, d.npcId); expect(s.village.friendship[d.npcId]).toBe(100);
  });
  it('resource nodes replenish daily and full bags do not consume the node', () => {
    const s = setup(); s.inventory.slots = Array.from({ length: 24 }, () => ({ id: 'hoe', quantity: 1, quality: 'normal' }));
    const before = structuredClone(s); expect(collectResource(s, 'town-wood').ok).toBe(false); expect(s).toEqual(before);
    s.inventory.slots[0] = null; expect(collectResource(s, 'town-wood').ok).toBe(true); expect(countItem(s, 'wood')).toBe(2);
    expect(collectResource(s, 'town-wood').ok).toBe(false); advanceDay(s, s.day);
    expect(collectResource(s, 'town-wood').ok).toBe(true); expect(countItem(s, 'wood')).toBe(4);
    expect(collectResource(s, 'unknown').ok).toBe(false);
  });
});
describe('village saves', () => {
  it('roundtrips commission, friendship and resource progress', () => {
    const s = setup(); ensureDailyCommissions(s); acceptCommission(s, s.village.commissions[0]!.id); talkToNpc(s, 'lin-seed'); collectResource(s, 'town-wood');
    expect(deserializeSave(serializeSave(s))).toEqual(s); expect(s.schemaVersion).toBe(6);
  });
  it('migrates a validated schema 4 save without dropping existing farm progress', () => {
    const current = setup(); const { village: _village, ...legacy } = current;
    const raw = { ...legacy, schemaVersion: 4, coins: 321 };
    const restored = deserializeSave(JSON.stringify(raw)); expect(restored.schemaVersion).toBe(6);
    expect(restored.coins).toBe(321); expect(restored.inventory).toEqual(current.inventory); expect(restored.plots).toEqual(current.plots);
    expect(restored.village.friendship['lin-seed']).toBe(0);
    expect(() => deserializeSave(JSON.stringify({ ...raw, coins: -1 }))).toThrow();
  });
  it('rejects corrupt friendship, unknown quests, duplicate quest ids and invalid statuses', () => {
    const s = setup(); ensureDailyCommissions(s);
    expect(() => deserializeSave(JSON.stringify({ ...s, village: { ...s.village, friendship: { ...s.village.friendship, 'lin-seed': 101 } } }))).toThrow();
    expect(() => deserializeSave(JSON.stringify({ ...s, village: { ...s.village, commissions: [s.village.commissions[0], s.village.commissions[0]] } }))).toThrow();
    for (const patch of [{ definitionId: 'unknown' }, { status: 'invented' }, { day: 999 }]) {
      expect(() => deserializeSave(JSON.stringify({ ...s, village: { ...s.village, commissions: [{ ...s.village.commissions[0], ...patch }] } }))).toThrow();
    }
  });
});
