import type { GameState, Rectangle } from '../../domain/GameState';
import { items, isItemId } from '../../data/items';
import { crops } from '../../data/crops';
import { npcIds } from '../../data/npcs';
import { commissionDefinitions, resourceNodes } from '../../data/commissions';
import { createVillageProgress } from '../../domain/village';
import { animals, isAnimalKind } from '../../data/animals';
import { isBuildingKind, buildings } from '../../data/buildings';
import { buildingBox, overlaps } from '../../domain/buildings';
import { isFarmResourceId } from '../../data/farmResources';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../../data/artAssets';

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const integer = (v: unknown, min: number, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
type LegacySave = Omit<GameState, 'schemaVersion' | 'expansion' | 'village'> & { schemaVersion: 4 | 5; village?:GameState['village'] };
function assertState(value: unknown): asserts value is GameState | LegacySave {
  function invalid(): never { throw new Error('存档字段缺失或数据不合法，已保留原存档。'); }
  if (!record(value)) invalid();
  if (value.schemaVersion !== 4 && value.schemaVersion !== 5 && value.schemaVersion !== 6) throw new Error('存档版本不兼容，已保留原存档。');
  if ((value.mapId !== 'farm' && !(value.schemaVersion !== 4 && value.mapId === 'town')) || !integer(value.day, 1) || !integer(value.lastSettledDay, 0) || value.lastSettledDay !== value.day - 1 ||
    !integer(value.coins, 0) || !integer(value.weatherSeed, 0, 4294967295) || !integer(value.nextTradeId, 1) ||
    typeof value.minute !== 'number' || !Number.isFinite(value.minute) || value.minute < 360 || value.minute >= 1560 ||
    typeof value.weather !== 'string' || !['clear', 'cloudy', 'rain'].includes(value.weather) || !record(value.player)) invalid();
  const { x, y } = value.player;
  const width = value.mapId === 'town' ? 60 : MAP_WIDTH, height = value.mapId === 'town' ? 40 : MAP_HEIGHT;
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 12 || x > width * TILE_SIZE - 12 || typeof y !== 'number' || !Number.isFinite(y) || y < 14 || y > height * TILE_SIZE - 14) invalid();
  if (!record(value.inventory) || !integer(value.inventory.revision, 0) || !Array.isArray(value.inventory.slots) || value.inventory.slots.length !== 24) invalid();
  for (const slot of value.inventory.slots) {
    if (slot === null) continue;
    if (!record(slot) || !isItemId(slot.id) || !integer(slot.quantity, 1, items[slot.id].maxStack) || slot.quality !== 'normal') invalid();
  }
  if (!Array.isArray(value.hotbar) || value.hotbar.length !== 8 || !value.hotbar.every(slot => slot === null || integer(slot, 0, 23)) || !integer(value.activeHotbar, 0, 7) || !record(value.plots)) invalid();
  for (const [key, plot] of Object.entries(value.plots)) {
    if (!/^\d+,\d+$/.test(key)) invalid();
    const [col, row] = key.split(',').map(Number);
    if (!integer(col, 0, MAP_WIDTH - 1) || !integer(row, 0, MAP_HEIGHT - 1) || key !== `${col},${row}` || !record(plot)) invalid();
    if (plot.kind === 'natural') { if ('crop' in plot || 'wateredOn' in plot) invalid(); continue; }
    if (plot.kind !== 'tilled' || !(plot.wateredOn === null || integer(plot.wateredOn, 1, value.day))) invalid();
    if (plot.crop === null) continue;
    if (!record(plot.crop) || typeof plot.crop.id !== 'string' || !Object.hasOwn(crops, plot.crop.id)) invalid();
    const cropId = plot.crop.id;
    const definition = Object.values(crops).find(crop => crop.id === cropId);
    if (!definition || !integer(plot.crop.growthDays, 0, definition.growthDays) || !integer(plot.crop.plantedOn, 1, value.day)) invalid();
  }
  if (value.schemaVersion === 4) return;
  const social = value.village;
  if (!record(social) || !record(social.friendship) || !record(social.talkedOn) || !record(social.gatheredOn) || !integer(social.generatedOn, 0, value.day) || !Array.isArray(social.commissions)) invalid();
  if (Object.keys(social.friendship).length !== npcIds.length || Object.keys(social.talkedOn).length !== npcIds.length) invalid();
  for (const id of npcIds) if (!integer(social.friendship[id], 0, 100) || !integer(social.talkedOn[id], 0, value.day)) invalid();
  for (const [id, day] of Object.entries(social.gatheredOn)) if (!Object.hasOwn(resourceNodes, id) || !integer(day, 1, value.day)) invalid();
  const seen = new Set<string>();
  for (const q of social.commissions) {
    if (!record(q) || typeof q.id !== 'string' || typeof q.definitionId !== 'string' || !Object.hasOwn(commissionDefinitions, q.definitionId) || !integer(q.day, 1, value.day) || q.id !== `${q.day}:${q.definitionId}` || seen.has(q.id) || typeof q.status !== 'string' || !['available', 'accepted', 'completed', 'rewarded'].includes(q.status)) invalid();
    if (q.status === 'available' && q.day !== social.generatedOn) invalid();
    seen.add(q.id);
  }
  if(value.schemaVersion===5) return;
  const e=value.expansion;
  if(!record(e) || !integer(e.nextAnimalId,1) || !Array.isArray(e.animals)) invalid();
  const ids=new Set<number>();const counts={chicken:0,cow:0};
  for(const a of e.animals) {
    if(!record(a) || !integer(a.id,1,e.nextAnimalId-1) || ids.has(a.id) || !isAnimalKind(a.kind) || !integer(a.hunger,0,100) || !integer(a.friendship,0,100) || !integer(a.fedOn,0,value.day) || typeof a.productReady!=='boolean') invalid();
    ids.add(a.id); if(++counts[a.kind]>animals[a.kind].capacity) invalid();
  }
  if(!integer(e.nextBuildingId,1)||!Array.isArray(e.buildings)) invalid();
  const buildingIds=new Set<number>();const boxes:Rectangle[]=[];
  for(const b of e.buildings) {
    if(!record(b)||!integer(b.id,1,e.nextBuildingId-1)||buildingIds.has(b.id)||!isBuildingKind(b.kind)||!integer(b.x,0,MAP_WIDTH-buildings[b.kind].width)||!integer(b.y,0,MAP_HEIGHT-buildings[b.kind].height))invalid();
    const box=buildingBox(b.kind,{x:b.x,y:b.y});if(boxes.some(other=>overlaps(box,other)))invalid();
    buildingIds.add(b.id);boxes.push(box);
  }
  if(!record(e.gatheredOn))invalid();
  for(const [id,day] of Object.entries(e.gatheredOn))if(!isFarmResourceId(id)||!integer(day,1,value.day))invalid();
}
export function serializeSave(state: GameState): string { assertState(state); return JSON.stringify(state); }
export function deserializeSave(text: string): GameState {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('存档 JSON 已损坏，已保留原存档。'); }
  assertState(parsed);
  // assertState validates the entire historical schema before defaults are added.
  if (parsed.schemaVersion === 4 || parsed.schemaVersion === 5) {
    const migrated: unknown = { ...parsed, schemaVersion: 6, village:parsed.schemaVersion===4?createVillageProgress():parsed.village, expansion:{nextAnimalId:1,animals:[],nextBuildingId:1,buildings:[],gatheredOn:{}} };
    assertState(migrated); if (migrated.schemaVersion !== 6) throw new Error('存档迁移失败'); return migrated;
  }
  if(parsed.schemaVersion!==6) throw new Error('存档迁移失败');
  return parsed;
}
