import type { Point, Rectangle } from '../domain/GameState';
import { worldToTile } from '../domain/grid';
import { artAssets, isArtObjectKey, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from './artAssets';
import type { ArtObjectKey } from './artAssets';

export interface SceneryObject extends Rectangle {
  kind: 'tree' | 'cabin' | 'sign' | 'barn' | 'coop' | 'well' | 'rock' | 'fence' | 'decoration';
  asset: ArtObjectKey;
  depthAnchor: number;
}
export interface InteractionObject extends Rectangle { id: string; name: string; message: string }
export interface FarmMapDefinition {
  width: number;
  height: number;
  tileSize: number;
  ground: number[];
  spawn: Point;
  objects: SceneryObject[];
  collisions: Rectangle[];
  collidingTileIds: number[];
  interactions: InteractionObject[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function parseFarmMap(input: unknown): FarmMapDefinition {
  if (!record(input)) throw new Error('地图必须是 JSON 对象');
  if (input.tilewidth !== TILE_SIZE || input.tileheight !== TILE_SIZE) throw new Error('地图必须使用 32×32 瓦片');
  if (!finite(input.width) || !finite(input.height) || !Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width < 1 || input.height < 1 || input.width > MAP_WIDTH || input.height > MAP_HEIGHT || input.orientation !== 'orthogonal' || input.infinite !== false) {
    throw new Error('地图必须为有效尺寸的有限正交地图');
  }
  if (!Array.isArray(input.layers)) throw new Error('地图缺少图层');
  const layers: unknown[] = input.layers;
  const layer = (name: string, type: string): Record<string, unknown> => {
    const found = layers.filter((entry) => record(entry) && entry.name === name);
    if (found.length !== 1 || !record(found[0]) || found[0].type !== type) throw new Error(`缺少或重复的 ${name} 图层`);
    const value = found[0];
    if ((value.x !== undefined && value.x !== 0) || (value.y !== undefined && value.y !== 0) ||
        (value.offsetx !== undefined && value.offsetx !== 0) || (value.offsety !== undefined && value.offsety !== 0)) throw new Error('当前不支持图层偏移');
    return value;
  };
  const ground = layer('Ground', 'tilelayer');
  if (ground.width !== input.width || ground.height !== input.height || !Array.isArray(ground.data) || ground.data.length !== input.width * input.height ||
      !ground.data.every((id: unknown) => finite(id) && Number.isInteger(id) && id >= 1 && id <= artAssets.tiles.length)) throw new Error('Ground 图层瓦片数量或编号不合法');
  const objectLayer = (name: string): unknown[] => {
    const value = layer(name, 'objectgroup');
    if (!Array.isArray(value.objects)) throw new Error(`${name} 对象列表不合法`);
    return value.objects;
  };
  if (!Array.isArray(input.tilesets) || input.tilesets.length !== 1) throw new Error('需要一个内嵌 farm-tiles 图集');
  const tileset: unknown = input.tilesets[0];
  if (!record(tileset) || tileset.name !== 'farm-tiles' || tileset.firstgid !== 1 || tileset.tilewidth !== TILE_SIZE || tileset.tileheight !== TILE_SIZE ||
      tileset.tilecount !== artAssets.tiles.length || tileset.columns !== artAssets.tiles.length || tileset.margin !== 0 || tileset.spacing !== 0 ||
      tileset.imagewidth !== TILE_SIZE * artAssets.tiles.length || tileset.imageheight !== TILE_SIZE || !Array.isArray(tileset.tiles)) throw new Error('farm-tiles 图集定义不合法');
  const collidingTileIds: number[] = [];
  const tileDefinitions: unknown[] = tileset.tiles;
  const seenTiles = new Set<number>();
  for (const tile of tileDefinitions) {
    if (!record(tile) || !finite(tile.id) || !Number.isInteger(tile.id) || tile.id < 0 || tile.id >= artAssets.tiles.length || seenTiles.has(tile.id)) throw new Error('图集瓦片定义不合法');
    seenTiles.add(tile.id);
    if (typeof property(tile, 'collides') !== 'boolean') throw new Error('瓦片 collides 必须是布尔属性');
    if (property(tile, 'collides') === true) collidingTileIds.push(tile.id + 1);
  }
  if (seenTiles.size !== artAssets.tiles.length) throw new Error('图集瓦片属性不完整');
  let spawn: Point | undefined;
  const objects: SceneryObject[] = [];
  for (const entry of objectLayer('Scenery')) {
    if (!record(entry)) throw new Error('地图对象不合法');
    if (entry.type === 'spawn') {
      if (spawn || !finite(entry.x) || !finite(entry.y) || entry.x < 12 || entry.y < 14 || entry.x > input.width * TILE_SIZE - 12 || entry.y > input.height * TILE_SIZE - 14) throw new Error('地图出生点不合法');
      spawn = { x: entry.x, y: entry.y };
    } else {
      if (entry.type !== 'tree' && entry.type !== 'cabin' && entry.type !== 'sign' && entry.type !== 'barn' && entry.type !== 'coop' &&
          entry.type !== 'well' && entry.type !== 'rock' && entry.type !== 'fence' && entry.type !== 'decoration') throw new Error('未知装饰对象类型');
      const asset = property(entry, 'asset');
      if (!isArtObjectKey(asset)) throw new Error('地图引用了未知素材');
      const rect = rectangle(entry, input.width, input.height); const expected = artAssets.objects[asset];
      if (rect.width !== expected.width || rect.height !== expected.height) throw new Error('素材显示尺寸与比例不匹配');
      const depthAnchor = property(entry, 'depthAnchor');
      if (!finite(depthAnchor) || depthAnchor < 0 || depthAnchor > rect.height) throw new Error('素材深度锚点不合法');
      objects.push({ kind: entry.type, asset, depthAnchor, ...rect });
    }
  }
  if (!spawn) throw new Error('地图缺少出生点');
  const collisions = objectLayer('Collisions').map(entry => rectangle(entry, input.width as number, input.height as number));
  const interactions: InteractionObject[] = objectLayer('Interactions').map((entry) => {
    if (!record(entry) || typeof entry.name !== 'string' || !entry.name) throw new Error('交互对象缺少稳定 ID');
    const name = property(entry, 'label'); const message = property(entry, 'message');
    if (typeof name !== 'string' || !name || typeof message !== 'string' || !message) throw new Error('交互对象缺少 label / message');
    return { ...rectangle(entry, input.width as number, input.height as number), id: entry.name, name, message };
  });
  if (new Set(interactions.map((entry) => entry.id)).size !== interactions.length) throw new Error('交互对象 ID 重复');
  const spawnBox = { x: spawn.x - 12, y: spawn.y - 14, width: 24, height: 28 };
  const overlap = (rect: Rectangle): boolean => spawnBox.x < rect.x + rect.width && spawnBox.x + spawnBox.width > rect.x && spawnBox.y < rect.y + rect.height && spawnBox.y + spawnBox.height > rect.y;
  if (collisions.some(overlap)) throw new Error('出生点被障碍阻挡');
  const start = worldToTile(spawnBox); const end = worldToTile({ x: spawnBox.x + spawnBox.width - 0.001, y: spawnBox.y + spawnBox.height - 0.001 });
  for (let y = start.y; y <= end.y; y++) for (let x = start.x; x <= end.x; x++) {
    if (collidingTileIds.includes(ground.data[y * input.width + x])) throw new Error('出生点被瓦片阻挡');
  }
  return { width: input.width, height: input.height, tileSize: TILE_SIZE, ground: ground.data.slice(), spawn, objects, collisions, collidingTileIds, interactions };
}

function rectangle(input: unknown, width: number, height: number): Rectangle {
  if (!record(input) || !finite(input.x) || !finite(input.y) || !finite(input.width) || !finite(input.height) ||
      input.width <= 0 || input.height <= 0 || input.x < 0 || input.y < 0 || input.x + input.width > width * TILE_SIZE || input.y + input.height > height * TILE_SIZE ||
      (input.rotation !== undefined && input.rotation !== 0)) throw new Error('地图矩形不合法或超出边界');
  return { x: input.x, y: input.y, width: input.width, height: input.height };
}

function property(input: Record<string, unknown>, name: string): unknown {
  if (!Array.isArray(input.properties)) return undefined;
  const value: unknown = input.properties.find((entry: unknown) => record(entry) && entry.name === name);
  return record(value) ? value.value : undefined;
}
