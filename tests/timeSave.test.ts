import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/domain/GameState';
import { calendar, clockText, tickTime, advanceDay } from '../src/domain/time';
import { serializeSave, deserializeSave } from '../src/adapters/storage/saveCodec';
import { SaveRepository } from '../src/adapters/storage/SaveRepository';
import { equipItem } from '../src/domain/inventory';
import { useFarmTool } from '../src/domain/farming';
import farmMap from '../public/assets/maps/farm.json';
import { parseFarmMap } from '../src/data/farmMap';
import { validateWorldState, saveGame } from '../src/application/session';
import { isWet } from '../src/domain/farming';

const setup = () => createGameState({ x: 928, y: 688 });
describe('time and calendar', () => {
  it('rain wets natural soil and weather is deterministic across save reload', () => {
    const s = setup(); s.weather = 'rain'; expect(isWet(s, { kind: 'natural' })).toBe(true);
    const copy = deserializeSave(serializeSave(s)); const seen = new Set<string>();
    for (let i = 0; i < 40; i++) { advanceDay(s, s.day); advanceDay(copy, copy.day); expect(copy.weather).toBe(s.weather); seen.add(s.weather); }
    expect([...seen].sort()).toEqual(['clear', 'cloudy', 'rain']);
  });
  it('starts spring day 1 Monday at 06:00 and converts boundaries', () => {
    const s = setup(); expect(clockText(s.minute)).toBe('06:00');
    expect(calendar(1)).toEqual({ year: 1, season: 'spring', day: 1, weekday: 0 });
    expect(calendar(28)).toMatchObject({ season: 'spring', day: 28, weekday: 6 });
    expect(calendar(29)).toMatchObject({ season: 'summer', day: 1, weekday: 0 });
    expect(calendar(113)).toMatchObject({ year: 2, season: 'spring', day: 1 });
    expect(clockText(1500)).toBe('01:00');
  });
  it('runs one day in 15 real minutes and preserves overflow', () => {
    const s = setup(); tickTime(s, 450000, false); expect(s.minute).toBe(960); expect(s.day).toBe(1);
    expect(tickTime(s, 450750, false).daysAdvanced).toBe(1); expect(s.day).toBe(2); expect(s.minute).toBe(361);
  });
  it('pause and invalid deltas leave state unchanged', () => {
    const s = setup(); const before = structuredClone(s);
    tickTime(s, 900000, true);
    for (const delta of [-1, NaN, Infinity]) tickTime(s, delta, false);
    expect(s).toEqual(before);
  });
  it('sleep and duplicate day requests settle crops exactly once', () => {
    const s = setup(); const tile = { x: 2, y: 3 }; const area = { width: 60, height: 40, cultivable: new Set(['2,3']) };
    useFarmTool(s, tile, area); equipItem(s, 'seed-turnip'); useFarmTool(s, tile, area); s.weather = 'rain';
    expect(advanceDay(s, 1).ok).toBe(true); expect(s.minute).toBe(360); expect(s.lastSettledDay).toBe(1);
    expect(s.plots['2,3']).toMatchObject({ crop: { growthDays: 1 }, wateredOn: null });
    const before = structuredClone(s); expect(advanceDay(s, 1).ok).toBe(false); expect(s).toEqual(before);
  });
  it('the 02:00 transition also settles watered crops once', () => {
    const s = setup(); s.minute = 1559;
    s.plots['2,3'] = { kind: 'tilled', wateredOn: 1, crop: { id: 'turnip', growthDays: 0, plantedOn: 1 } };
    expect(tickTime(s, 750, false).daysAdvanced).toBe(1);
    expect(s.plots['2,3']).toMatchObject({ crop: { growthDays: 1 }, wateredOn: null });
    tickTime(s, 750, false); expect(s.plots['2,3']).toMatchObject({ crop: { growthDays: 1 } });
  });
});
describe('validated JSON saves', () => {
  it('rejects array weather instead of coercing it to a valid label', () => {
    expect(() => deserializeSave(JSON.stringify({ ...setup(), weather: ['rain'] }))).toThrow();
  });
  it('preserves schema-valid old saves incompatible with the current map', () => {
    const map = parseFarmMap(farmMap); const old = setup(); old.player = { x: 1200, y: 940 };
    let raw = serializeSave(old); const before = raw;
    const repo = new SaveRepository(() => ({ getItem: () => raw, setItem: (_key, value) => { raw = value; } }));
    expect(saveGame(setup(), map, repo).ok).toBe(false); expect(raw).toBe(before);
  });
  it('rejects restores in scenery, ponds and non-cultivable planted areas', () => {
    const map = parseFarmMap(farmMap);
    const s = setup(); expect(validateWorldState(s, map)).toBe(true);
    s.player = { x: 1200, y: 940 }; expect(validateWorldState(s, map)).toBe(false);
    const wall = map.collisions[0]!; s.player = { x: wall.x + wall.width / 2, y: wall.y + wall.height / 2 }; expect(validateWorldState(s, map)).toBe(false);
    s.player = { ...map.spawn }; s.plots['0,0'] = { kind: 'tilled', wateredOn: null, crop: null }; expect(validateWorldState(s, map)).toBe(false);
  });
  it('roundtrips full progress without shared references', () => {
    const s = setup(); s.coins = 321; s.minute = 875.25; s.weather = 'cloudy'; s.day = 5; s.lastSettledDay = 4;
    s.plots['2,3'] = { kind: 'tilled', wateredOn: 5, crop: { id: 'pumpkin', growthDays: 3, plantedOn: 1 } };
    const decoded = deserializeSave(serializeSave(s)); expect(decoded).toEqual(s);
    decoded.player.x++; expect(s.player.x).toBe(928);
    expect(JSON.parse(serializeSave(s)).schemaVersion).toBe(6);
  });
  it('rejects broken JSON, missing fields and incompatible versions', () => {
    expect(() => deserializeSave('{bad')).toThrow();
    for (const value of [{}, { schemaVersion: 999 }, { ...setup(), inventory: undefined }]) {
      expect(() => deserializeSave(JSON.stringify(value))).toThrow();
    }
  });
  it('rejects invalid money, slots, dates, coordinates and crop fields', () => {
    for (const mutate of [
      (s: ReturnType<typeof setup>) => { s.coins = -1; },
      (s: ReturnType<typeof setup>) => { s.inventory.slots[2]!.quantity = 100; },
      (s: ReturnType<typeof setup>) => { s.day = 0; },
      (s: ReturnType<typeof setup>) => { s.player.x = 3200; },
      (s: ReturnType<typeof setup>) => { s.minute = 1560; },
      (s: ReturnType<typeof setup>) => { s.plots['100,0'] = { kind: 'natural' }; },
      (s: ReturnType<typeof setup>) => { s.plots['2,3'] = { kind: 'tilled', wateredOn: 99, crop: null }; },
    ]) { const s = setup(); mutate(s); expect(() => serializeSave(s)).toThrow(); }
  });
  it('refuses overwriting damaged existing saves and preserves their raw text', () => {
    let raw: string | null = '{damaged';
    const repo = new SaveRepository(() => ({ getItem: () => raw, setItem: (_key, value) => { raw = value; } }));
    expect(repo.save(setup()).ok).toBe(false); expect(raw).toBe('{damaged'); expect(repo.load().ok).toBe(false);
  });
  it('saves valid progress, reloads it, and handles unavailable storage', () => {
    let raw: string | null = null;
    const repo = new SaveRepository(() => ({ getItem: () => raw, setItem: (_key, value) => { raw = value; } }));
    expect(repo.save(setup()).ok).toBe(true); expect(repo.load()).toMatchObject({ ok: true, state: { coins: 500 } });
    const broken = new SaveRepository(() => { throw new Error('blocked'); });
    expect(broken.save(setup()).ok).toBe(false); expect(broken.load().ok).toBe(false);
  });
  it('retains the valid old save when the storage write is rejected', () => {
    const raw = serializeSave(setup());
    const repo = new SaveRepository(() => ({ getItem: () => raw, setItem: () => { throw new Error('QuotaExceeded'); } }));
    const newer = setup(); newer.coins = 300;
    expect(repo.save(newer)).toMatchObject({ ok: false });
    expect(repo.load()).toMatchObject({ ok: true, state: { coins: 500 } });
  });
});
