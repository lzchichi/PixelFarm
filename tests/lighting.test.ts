import { expect, it } from 'vitest';
import { lightingAlpha } from '../src/game/world/lighting';
it('keeps daytime clear, dims weather and caps nighttime darkness', () => {
  expect(lightingAlpha(720, 'clear')).toBe(0);
  expect(lightingAlpha(720, 'cloudy')).toBe(0.1);
  expect(lightingAlpha(720, 'rain')).toBe(0.16);
  expect(lightingAlpha(1320, 'clear')).toBe(0.5);
  expect(lightingAlpha(1500, 'rain')).toBe(0.58);
  expect(lightingAlpha(360, 'clear')).toBeGreaterThan(lightingAlpha(480, 'clear'));
});
