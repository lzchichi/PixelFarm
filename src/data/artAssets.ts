import manifest from './art-manifest.json';

export const artAssets = manifest;
export type ArtObjectKey = keyof typeof manifest.objects;
export const TILE_SIZE = 32;
export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 70;
export function isArtObjectKey(value: unknown): value is ArtObjectKey {
  return typeof value === 'string' && Object.hasOwn(manifest.objects, value);
}
export function artTexture(key: ArtObjectKey): string { return `art-${key}`; }
