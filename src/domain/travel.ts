import type { GameState, Point } from './GameState';
export function travelTo(state: GameState, destination: GameState['mapId'], spawn: Point): void {
  state.mapId = destination;
  state.player = { ...spawn };
}
