export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export function getIntegerScale(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return 1;
  return Math.max(1, Math.floor(Math.min(width / GAME_WIDTH, height / GAME_HEIGHT)));
}
