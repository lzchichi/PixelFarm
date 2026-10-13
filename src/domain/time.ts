import type { GameState } from './GameState';
import { settleCropsForDay, clearOutOfSeasonCrops,type FarmResult } from './farming';
import { seasons, timeConfig,seasonForDay } from '../data/timeConfig';
import { ensureDailyCommissions } from './village';
import { settleAnimalsForDay } from './animals';

export function calendar(day: number) {
  const index = day - 1;
  return { year: Math.floor(index / 112) + 1, season: seasons[Math.floor(index / 28) % 4]!, day: index % 28 + 1, weekday: index % 7 };
}
export function clockText(minute: number): string {
  const value = Math.floor(minute) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
export function advanceDay(state: GameState, expectedDay: number): FarmResult {
  if (!Number.isSafeInteger(expectedDay) || expectedDay !== state.day || state.lastSettledDay >= state.day || state.day >= Number.MAX_SAFE_INTEGER) {
    return { ok: false, message: '这一天已经结算，或日期不合法。' };
  }
  const grown = settleCropsForDay(state);
  const previousSeason=seasonForDay(state.day);
  settleAnimalsForDay(state);
  state.lastSettledDay = state.day; state.day++; state.minute = timeConfig.startMinute;
  const cleared=previousSeason!==seasonForDay(state.day)?clearOutOfSeasonCrops(state):0;
  state.weatherSeed = (Math.imul(state.weatherSeed, 1664525) + 1013904223) >>> 0;
  const roll = state.weatherSeed / 4294967296;
  state.weather = roll < timeConfig.clearChance ? 'clear' : roll < timeConfig.clearChance + timeConfig.cloudyChance ? 'cloudy' : 'rain';
  ensureDailyCommissions(state);
  return { ok: true, message: `新的一天开始了：${grown} 株作物生长。${cleared?`换季清理了 ${cleared} 株不适季作物，耕地保留。`:''}` };
}
export function tickTime(state: GameState, deltaMs: number, paused: boolean): { daysAdvanced: number } {
  if (paused || !Number.isFinite(deltaMs) || deltaMs <= 0 || deltaMs > 86400000) return { daysAdvanced: 0 };
  let remaining = deltaMs / timeConfig.millisecondsPerMinute, daysAdvanced = 0;
  while (remaining >= timeConfig.endMinute - state.minute) {
    remaining -= timeConfig.endMinute - state.minute;
    if (!advanceDay(state, state.day).ok) return { daysAdvanced };
    daysAdvanced++;
  }
  state.minute += remaining;
  return { daysAdvanced };
}
