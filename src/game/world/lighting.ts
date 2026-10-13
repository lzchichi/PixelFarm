import type { GameState } from '../../domain/GameState';
export function lightingAlpha(minute: number, weather: GameState['weather']): number {
  const hour = minute / 60;
  const night = hour < 8 ? (8 - hour) / 2 * 0.12 : hour < 17 ? 0 : Math.min(0.5, (hour - 17) / 5 * 0.5);
  return Math.min(0.58, night + (weather === 'rain' ? 0.16 : weather === 'cloudy' ? 0.1 : 0));
}
