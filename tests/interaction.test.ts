import { describe, expect, it } from 'vitest';
import { findInteraction } from '../src/domain/interaction';
import type { InteractionObject } from '../src/data/farmMap';

const sign: InteractionObject = { id: 'sign', name: '木牌', message: '青芽农场', x: 100, y: 100, width: 16, height: 16 };

describe('facing interaction range', () => {
  it('selects the nearest rectangle in front, not one behind or out of reach', () => {
    expect(findInteraction({ x: 108, y: 135 }, 'up', [sign], [])?.id).toBe('sign');
    expect(findInteraction({ x: 108, y: 135 }, 'down', [sign], [])).toBeUndefined();
    expect(findInteraction({ x: 108, y: 160 }, 'up', [sign], [])).toBeUndefined();
    expect(findInteraction({ x: 160, y: 135 }, 'up', [sign], [])).toBeUndefined();
    const nearer = { ...sign, id: 'nearer', y: 117, height: 4 };
    expect(findInteraction({ x: 108, y: 135 }, 'up', [sign, nearer], [])?.id).toBe('nearer');
  });
  it('handles all four directions and inclusive range boundaries', () => {
    expect(findInteraction({ x: 68, y: 108 }, 'right', [sign], [])?.id).toBe('sign');
    expect(findInteraction({ x: 148, y: 108 }, 'left', [sign], [])?.id).toBe('sign');
    expect(findInteraction({ x: 108, y: 68 }, 'down', [sign], [])?.id).toBe('sign');
  });
  it('does not interact through another obstacle but allows touching the target surface', () => {
    expect(findInteraction({ x: 108, y: 135 }, 'up', [sign], [{ x: 100, y: 124, width: 16, height: 4 }])).toBeUndefined();
    expect(findInteraction({ x: 108, y: 130 }, 'up', [sign], [sign])?.id).toBe('sign');
  });
});
