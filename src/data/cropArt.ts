import manifest from './crop-art-manifest.json';
import type { CropId } from './crops';
export const cropArt = manifest;
export function cropTexture(id: CropId, stage: number | 'harvest'): string { return `crop-${id}-${stage}`; }
