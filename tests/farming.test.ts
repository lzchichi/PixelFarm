import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/domain/GameState';
import { addItem, removeItem, countItem, equipItem } from '../src/domain/inventory';
import { crops } from '../src/data/crops';
import { useFarmTool, advanceDay, getPlot, cropStage, facingTile } from '../src/domain/farming';
import type { FarmingArea } from '../src/domain/farming';

const tile = { x: 2, y: 3 };
const area: FarmingArea = { width: 60, height: 40, cultivable: new Set(['2,3', '3,3']) };
const setup = () => createGameState({ x: 48, y: 112 });
const till = (state: ReturnType<typeof setup>) => { equipItem(state, 'hoe'); return useFarmTool(state, tile, area); };
const sow = (state: ReturnType<typeof setup>) => { equipItem(state, 'seed-turnip'); return useFarmTool(state, tile, area); };
const water = (state: ReturnType<typeof setup>) => { equipItem(state, 'watering-can'); return useFarmTool(state, tile, area); };

describe('farming rules', () => {
  it('starts with independent tools, 10 turnip seeds, 500 coins and day 1', () => {
    const state = setup(); expect(state.coins).toBe(500); expect(state.day).toBe(1);
    expect(countItem(state, 'hoe')).toBe(1); expect(countItem(state, 'watering-can')).toBe(1); expect(countItem(state, 'seed-turnip')).toBe(10);
    removeItem(state, 'seed-turnip', 10); expect(countItem(setup(), 'seed-turnip')).toBe(10);
    expect(getPlot(state, tile)).toEqual({ kind: 'natural' });
  });
  it('tills once and cannot damage planted soil by tilling it again', () => {
    const state = setup(); expect(till(state).ok).toBe(true); expect(till(state).ok).toBe(false);
    sow(state); equipItem(state, 'hoe'); const before = structuredClone(state);
    useFarmTool(state, tile, area); expect(state).toEqual(before);
  });
  it('plants only on tilled soil and deducts one seed atomically', () => {
    const state = setup(); expect(sow(state).ok).toBe(false); expect(countItem(state, 'seed-turnip')).toBe(10);
    till(state); expect(sow(state).ok).toBe(true); expect(countItem(state, 'seed-turnip')).toBe(9);
    expect(getPlot(state, tile)).toMatchObject({ kind: 'tilled', crop: { id: 'turnip', growthDays: 0 } });
    const before = structuredClone(state); expect(sow(state).ok).toBe(false); expect(state).toEqual(before);
  });
  it('rejects missing seed and missing equipment without changing state', () => {
    const state = setup(); till(state); removeItem(state, 'seed-turnip', 10);
    expect(equipItem(state, 'seed-turnip').ok).toBe(false);
    expect(sow(state).ok).toBe(false); expect(getPlot(state, tile)).toMatchObject({ crop: null });
    removeItem(state, 'watering-can', 1); expect(equipItem(state, 'watering-can').ok).toBe(false); expect(water(state).ok).toBe(false);
  });
  it('rejects water on natural soil, allows empty tilled soil, and watering twice is idempotent', () => {
    const state = setup(); expect(water(state).ok).toBe(false); till(state);
    expect(water(state).ok).toBe(true); expect(getPlot(state, tile)).toMatchObject({ wateredOn: 1 });
    const before = structuredClone(state); water(state); expect(state).toEqual(before);
    sow(state); expect(getPlot(state, tile)).toMatchObject({ wateredOn: 1 });
  });
  it('does not grow without water and expires moisture across days', () => {
    const state = setup(); till(state); sow(state); advanceDay(state, 1);
    expect(getPlot(state, tile)).toMatchObject({ wateredOn: null, crop: { growthDays: 0 } });
    water(state); advanceDay(state, 2); expect(getPlot(state, tile)).toMatchObject({ wateredOn: null, crop: { growthDays: 1 } });
    advanceDay(state, 3); expect(getPlot(state, tile)).toMatchObject({ crop: { growthDays: 1 } });
  });
  it('rain grows crops without individual watering, but never grows empty plots', () => {
    const state = setup(); till(state); sow(state); state.weather = 'rain';
    equipItem(state, 'hoe'); useFarmTool(state, { x: 3, y: 3 }, area);
    advanceDay(state, 1); expect(getPlot(state, tile)).toMatchObject({ crop: { growthDays: 1 } });
    expect(getPlot(state, { x: 3, y: 3 })).toMatchObject({ crop: null }); expect(state.weather).toBe('clear');
  });
  it('rejects duplicate or invalid day settlement', () => {
    const state = setup(); expect(advanceDay(state, 1).ok).toBe(true);
    const before = structuredClone(state); expect(advanceDay(state, 1).ok).toBe(false);
    expect(advanceDay(state, NaN).ok).toBe(false); expect(state).toEqual(before);
  });
  it.each(Object.values(crops))('grows $name by watered game days, harvests once and keeps soil', (definition) => {
    const state = setup(); till(state); addItem(state, definition.seedId, 1);
    // Pumpkin now requires summer; keep the growth/harvest assertions unchanged.
    if(definition.id==='pumpkin'){state.day=29;state.lastSettledDay=28;}
    equipItem(state, definition.seedId); useFarmTool(state, tile, area);
    equipItem(state, 'hand'); expect(useFarmTool(state, tile, area).ok).toBe(false);
    for (let day = 1; day <= definition.growthDays; day++) { water(state); advanceDay(state, state.day); }
    const plot = getPlot(state, tile); expect(plot.kind).toBe('tilled');
    if (plot.kind !== 'tilled' || !plot.crop) throw new Error('Expected crop');
    expect(cropStage(plot.crop)).toBe(definition.stages.length - 1);
    // Growth caps at maturity even when more wet days pass.
    water(state); advanceDay(state, state.day); expect(plot.crop.growthDays).toBe(definition.growthDays);
    equipItem(state, 'hand'); expect(useFarmTool(state, tile, area).ok).toBe(true);
    expect(countItem(state, definition.harvestId)).toBe(definition.yield);
    expect(getPlot(state, tile)).toMatchObject({ kind: 'tilled', crop: null });
    expect(useFarmTool(state, tile, area).ok).toBe(false);
  });
  it('retains mature crops if the bag has no space', () => {
    const state = setup(); till(state); sow(state);
    for (let day = 0; day < crops.turnip.growthDays; day++) { water(state); advanceDay(state, state.day); }
    state.inventory.slots = Array.from({ length: 24 }, () => ({ id: 'hoe', quantity: 1, quality: 'normal' })); equipItem(state, 'hand');
    const before = structuredClone(state); expect(useFarmTool(state, tile, area).ok).toBe(false); expect(state).toEqual(before);
  });
  it.each([{ x: -1, y: 3 }, { x: 60, y: 3 }, { x: 1, y: 1 }, { x: 2.5, y: 3 }])('rejects non-cultivable tile $x,$y', (target) => {
    const state = setup(); equipItem(state, 'hoe'); const before = structuredClone(state);
    expect(useFarmTool(state, target, area).ok).toBe(false); expect(state).toEqual(before);
  });
  it('targets exactly the adjacent grid in the facing direction', () => {
    expect(facingTile({ x: 80, y: 112 }, 'left')).toEqual({ x: 1, y: 3 });
    expect(facingTile({ x: 80, y: 112 }, 'up')).toEqual({ x: 2, y: 2 });
    expect(facingTile({ x: 80, y: 112 }, 'down')).toEqual({ x: 2, y: 4 });
    expect(facingTile({ x: 80, y: 112 }, 'right')).toEqual({ x: 3, y: 3 });
  });
});
