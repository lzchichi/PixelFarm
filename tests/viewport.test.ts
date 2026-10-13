import { describe, expect, it } from 'vitest';
import { getIntegerScale } from '../src/game/viewport';

describe('integer viewport scaling', () => {
  it.each([
    [960, 540, 1], [1280, 720, 1], [1366, 768, 1],
    [1920, 1080, 2], [2560, 1440, 2], [2880, 1620, 3],
    [1920, 900, 1], [800, 400, 1], [0, 0, 1],
  ])('keeps %i×%i at integer zoom %i without stretching', (width, height, expected) => {
    expect(getIntegerScale(width, height)).toBe(expected);
  });
});
