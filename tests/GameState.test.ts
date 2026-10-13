import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/domain/GameState';

describe('preview session state', () => {
  it('starts independent new sessions at the farm spawn', () => {
    const first = createGameState({ x: 300, y: 250 });
    first.player.x = 999;
    const next = createGameState({ x: 300, y: 250 });
    expect(next.player).toEqual({ x: 300, y: 250 });
    expect(JSON.parse(JSON.stringify(next))).toEqual(next);
  });

  // Movement, obstacle, diagonal, boundary and invalid-time assertions now live
  // in playerPhysics.test.ts, exercising the actual Arcade solver.
});
