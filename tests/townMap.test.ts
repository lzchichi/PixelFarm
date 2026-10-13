import { describe, it, expect } from 'vitest';
import farmJson from '../public/assets/maps/farm.json';
import townJson from '../public/assets/maps/town.json';
import { parseFarmMap } from '../src/data/farmMap';
import { validateWorldState } from '../src/application/session';
import { createGameState } from '../src/domain/GameState';
import { npcs } from '../src/data/npcs';
import { travelTo } from '../src/domain/travel';
const farm = parseFarmMap(farmJson);
const town = () => parseFarmMap(townJson);
describe('village map and travel', () => {
  it('uses supplied buildings and accessible NPC schedule positions', () => {
    const map = town(); expect(map.objects.filter(o => o.asset.startsWith('town-'))).toHaveLength(4);
    for (const npc of Object.values(npcs)) for (const slot of npc.schedule) {
      const state = createGameState(slot); state.mapId = 'town';
      expect(validateWorldState(state, { farm, town: map })).toBe(true);
    }
  });
  it('retains money, inventory, plots and village progress on both journeys', () => {
    const state = createGameState(farm.spawn); const bag = state.inventory; const village = state.village;
    travelTo(state, 'town', town().spawn); expect(state.mapId).toBe('town'); expect(state.coins).toBe(500);
    expect(state.inventory).toBe(bag); expect(state.village).toBe(village);
    expect(validateWorldState(state, { farm, town: town() })).toBe(true);
    travelTo(state, 'farm', farm.spawn); expect(state.player).toEqual(farm.spawn);
    expect(state.inventory).toBe(bag);
  });
  it('validates farm plots against farm terrain while the player is in town', () => {
    const state = createGameState(town().spawn); state.mapId = 'town';
    state.plots['12,23'] = { kind: 'tilled', wateredOn: null, crop: null };
    expect(validateWorldState(state, { farm, town: town() })).toBe(true);
    state.plots['0,0'] = { kind: 'tilled', wateredOn: null, crop: null };
    expect(validateWorldState(state, { farm, town: town() })).toBe(false);
  });
});
