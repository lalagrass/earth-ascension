// 武俠小鎮 A1：存檔放在瀏覽器的 IndexedDB（#564 第 3 項）。自動存檔一格（每遊戲日覆寫）＋手動存檔多格。
import type { SaveFile } from './save';

const DB = 'wuxia-town';
const STORE = 'saves';

export type SaveSlot = { key: string; kind: 'auto' | 'manual'; savedAt: string; day: number; seed: number; ruleVersion: string; save: SaveFile };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'key' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = f(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function putSlot(slot: SaveSlot): Promise<IDBValidKey> {
  return tx('readwrite', (s) => s.put(slot));
}
export function listSlots(): Promise<SaveSlot[]> {
  return tx<SaveSlot[]>('readonly', (s) => s.getAll() as IDBRequest<SaveSlot[]>).then((a) =>
    a.sort((x, y) => (x.savedAt < y.savedAt ? 1 : -1)),
  );
}
export function deleteSlot(key: string): Promise<undefined> {
  return tx('readwrite', (s) => s.delete(key) as IDBRequest<undefined>);
}

export function slotOf(save: SaveFile, kind: 'auto' | 'manual', savedAt: string): SaveSlot {
  return {
    key: kind === 'auto' ? 'auto' : `manual-${savedAt}`,
    kind,
    savedAt,
    day: save.gameMinute < 0 ? 1 : Math.floor(save.gameMinute / 1440) + 1,
    seed: save.seed,
    ruleVersion: save.ruleVersion,
    save,
  };
}
