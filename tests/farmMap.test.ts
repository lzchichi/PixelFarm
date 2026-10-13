import { describe, expect, it } from 'vitest';
import { parseFarmMap } from '../src/data/farmMap';
import farmMap from '../public/assets/maps/farm.json';

describe('local Tiled farm map', () => {
  it('loads terrain, spawn and original scenery objects', () => {
    const map = parseFarmMap(farmMap);
    expect(map.width).toBe(100);
    expect(map.height).toBe(70);
    expect(map.ground).toHaveLength(7000);
    expect(map.tileSize).toBe(32);
    expect(map.spawn).toEqual({ x: 928, y: 688 });
    expect(map.objects.filter((object) => object.kind === 'tree').length).toBeGreaterThan(80);
    expect(map.objects.some((object) => object.kind === 'cabin')).toBe(true);
    expect(map.collisions.length).toBeGreaterThan(0);
    expect(map.collidingTileIds).toContain(5);
    expect(map.collidingTileIds).toContain(14);
    expect(map.collidingTileIds).not.toContain(6); // Stone paving is walkable.
    expect(map.objects.some((object) => object.kind === 'barn')).toBe(true);
    expect(map.objects.some((object) => object.kind === 'coop')).toBe(true);
    expect(map.objects.some((object) => object.kind === 'rock')).toBe(true);
    expect(map.interactions.some((object) => object.id === 'cabin-door')).toBe(true);
  });

  it('rejects bad tile sizes and missing spawn data', () => {
    expect(() => parseFarmMap({ ...farmMap, tilewidth: 16 })).toThrow(/32/);
    expect(() => parseFarmMap({ ...farmMap, layers: [] })).toThrow();
  });

  it('rejects malformed layer data instead of trusting external JSON', () => {
    expect(() => parseFarmMap(null)).toThrow();
    expect(() => parseFarmMap({ ...farmMap, width: -1 })).toThrow();
    expect(() => parseFarmMap({ ...farmMap, layers: [{ name: 'Ground', type: 'tilelayer', data: [999] }] })).toThrow();
  });

  it('rejects missing collisions, invalid GIDs and a blocked spawn', () => {
    expect(() => parseFarmMap({ ...farmMap, layers: farmMap.layers.filter((layer) => layer.name !== 'Collisions') })).toThrow();
    const ground = farmMap.layers.find((layer) => layer.name === 'Ground');
    expect(ground).toBeDefined();
    const layers = farmMap.layers.map((layer) => layer.name === 'Ground' ? { ...layer, data: Array(farmMap.width * farmMap.height).fill(5) } : layer);
    expect(() => parseFarmMap({ ...farmMap, layers })).toThrow(/出生点/);
  });
  it('rejects unknown asset references and image size mismatches', () => {
    const layers = farmMap.layers.map((layer) => layer.name === 'Scenery' ? { ...layer, objects: layer.objects?.map((entry) =>
      entry.type === 'cabin' ? { ...entry, properties: [{ name: 'asset', type: 'string', value: 'missing-house' }] } : entry) } : layer);
    expect(() => parseFarmMap({ ...farmMap, layers })).toThrow(/素材/);
    const wrongSize = farmMap.layers.map((layer) => layer.name === 'Scenery' ? { ...layer, objects: layer.objects?.map((entry) =>
      entry.type === 'cabin' ? { ...entry, width: 999 } : entry) } : layer);
    expect(() => parseFarmMap({ ...farmMap, layers: wrongSize })).toThrow();
  });
});
