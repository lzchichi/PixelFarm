import type { GameState } from '../../domain/GameState';
import { deserializeSave, serializeSave } from './saveCodec';
interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const SAVE_KEY = 'pixel-farm-story.save';
type Failure = { ok: false; message: string };
export class SaveRepository {
  constructor(private readonly storage: () => StoragePort) {}
  load(): { ok: true; state: GameState; message: string } | Failure {
    try {
      const raw = this.storage().getItem(SAVE_KEY);
      if (raw === null) return { ok: false, message: '暂无可读取的存档。' };
      return { ok: true, state: deserializeSave(raw), message: '已恢复农场进度。' };
    } catch (error) { return { ok: false, message: error instanceof Error ? error.message : '无法读取存档。' }; }
  }
  save(state: GameState, validateWorld: (value: GameState) => boolean = () => true): { ok: true; message: string } | Failure {
    try {
      const raw = serializeSave(state); const storage = this.storage(); const previous = storage.getItem(SAVE_KEY);
      if (previous !== null && !validateWorld(deserializeSave(previous))) throw new Error('旧存档与当前地图不兼容，已保留原存档');
      storage.setItem(SAVE_KEY, raw);
      return { ok: true, message: '农场进度已保存。' };
    } catch (error) { return { ok: false, message: `保存失败：${error instanceof Error ? error.message : '存储不可用'}。当前进度仍保留在游戏中。` }; }
  }
}
