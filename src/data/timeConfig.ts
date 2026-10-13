export const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season=typeof seasons[number];
export function seasonForDay(day:number):Season{return seasons[Math.floor((day-1)/28)%4]!;}
export const seasonalColors:Record<Season,{ground:number;trees:number}>={spring:{ground:0xffffff,trees:0xffffff},summer:{ground:0xecf5cc,trees:0xf2ffdd},autumn:{ground:0xe4bd80,trees:0xffebc9},winter:{ground:0xb7cedc,trees:0xa5c0d4}};
export const seasonNames = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' };
export const weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
export const weatherNames = { clear: '晴天', rain: '雨天', cloudy: '阴天' };
export const timeConfig = { daysPerSeason: 28, startMinute: 360, endMinute: 1560, millisecondsPerMinute: 750,
  clearChance: 0.5, cloudyChance: 0.25 } as const;
