export const npcIds = ['lin-seed', 'xu-carpenter', 'he-villager'] as const;
export type NpcId = typeof npcIds[number];
export interface NpcDefinition {
  id: NpcId; name: string; role: string; personality: string; talkFriendship: number;
  dialogue: readonly string[]; schedule: readonly { minute: number; x: number; y: number; place: string }[];
}
export const npcs: Record<NpcId, NpcDefinition> = {
  'lin-seed': { id: 'lin-seed', name: '艾米', role: '种子商人', personality: '热情细心，喜欢研究种子的生长。', talkFriendship: 1,
    dialogue: ['欢迎来到青芽村！我替大家照顾这家种子铺。', '雨天记得让土地喝饱水，晴天就带着水壶去看看。', '公告栏每天都有新委托。收获多了，可以带来给需要它的人。'],
    schedule: [{ minute: 360, x: 736, y: 704, place: '种子铺门前' }, { minute: 840, x: 960, y: 832, place: '广场' }, { minute: 1080, x: 736, y: 704, place: '种子铺门前' }] },
  'xu-carpenter': { id: 'xu-carpenter', name: '托马斯', role: '木匠', personality: '话不多，喜欢把每件工具修得结结实实。', talkFriendship: 1,
    dialogue: ['我是托马斯，村里的木匠。工坊也替邻居修理工具。', '广场边有些落木和碎石，可以收集起来。每天都能找到一些。', '如果你接了我的委托，带齐材料再来找我。'],
    schedule: [{ minute: 360, x: 1120, y: 704, place: '工坊门前' }, { minute: 780, x: 1056, y: 896, place: '广场' }, { minute: 1020, x: 1120, y: 704, place: '工坊门前' }] },
  'he-villager': { id: 'he-villager', name: '莉娜', role: '村民', personality: '温和健谈，常和邻居分享菜园的故事。', talkFriendship: 1,
    dialogue: ['你就是新来的农场主人吧？叫我莉娜就好。', '我喜欢新鲜的蔬菜，有时候也会在公告栏留张小纸条。', '慢慢来，村庄总有一处地方等你坐坐。'],
    schedule: [{ minute: 360, x: 1440, y: 704, place: '草顶小屋门前' }, { minute: 720, x: 864, y: 896, place: '广场' }, { minute: 1080, x: 1440, y: 704, place: '草顶小屋门前' }] },
};
for (const npc of Object.values(npcs)) {
  if (!npc.dialogue.length || npc.schedule[0]?.minute !== 360 || npc.schedule.some((slot, i) => !Number.isInteger(slot.minute) || slot.minute >= 1560 || (i > 0 && slot.minute <= npc.schedule[i - 1]!.minute))) throw new Error('村民日程配置不合法');
}
export function isNpcId(id: unknown): id is NpcId { return typeof id === 'string' && Object.hasOwn(npcs, id); }
