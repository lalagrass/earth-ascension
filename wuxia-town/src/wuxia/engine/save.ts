// 武俠小鎮 A1：存檔格式（#564 第 3 項）。初始快照＋input journal＋最新快照（世界＋規則替身狀態）。
// 讀檔：規則版本不同就拒絕並說明；相同就從最新快照續跑（Session 的 resume）。
// replaySave＝從初始快照照 journal 重跑到存檔那一步，hash 必須等於最新快照（驗證用，A3「存檔 → 讀檔」測試）。
import { JournalInput, Snapshot, createGame, runOneStep } from '../../../tools/wuxia/sim';
import { HEADLESS_EPOCH, STEP_MS, Session, SessionAux, HeadlessMessage, snapshotOf } from './session';

/**
 * 規則版本：引擎規則或 data/wuxia 的數值改了（同一個存檔續跑結果會不同）就要改這個字串。
 * 格式：步驟-序號。A1 起算。
 */
export const RULE_VERSION = 'a1-1';
export const SAVE_FORMAT = 'wuxia-town-save';

export type SaveFile = {
  format: typeof SAVE_FORMAT;
  version: 1;
  ruleVersion: string;
  seed: number;
  agents?: number;
  /** 存檔時的遊戲分鐘與 step 數（給存檔選單顯示） */
  gameMinute: number;
  steps: number;
  label?: string;
  initial: Snapshot;
  journal: JournalInput[];
  latest: { snapshot: Snapshot; aux: SessionAux; hash: string; messages?: HeadlessMessage[] };
};

export function makeSave(session: Session, initial: Snapshot, opts: { agents?: number; label?: string } = {}): SaveFile {
  return {
    format: SAVE_FORMAT,
    version: 1,
    ruleVersion: RULE_VERSION,
    seed: session.seed,
    agents: opts.agents,
    gameMinute: session.gameMinute(),
    steps: session.k,
    label: opts.label,
    initial: structuredClone(initial),
    journal: structuredClone(session.queue),
    latest: {
      snapshot: snapshotOf(session.game, session.k),
      aux: session.aux(),
      hash: session.game.wuxiaHash(),
      messages: structuredClone(session.messages.slice(-50)),
    },
  };
}

export type LoadResult = { ok: true; session: Session; initial: Snapshot } | { ok: false; reason: string };

/** 讀檔。規則版本不同、格式不對、快照 hash 對不上都拒絕（不丟例外，回傳原因給畫面顯示）。 */
export function loadSave(data: unknown, keepMessages?: number): LoadResult {
  const s = data as Partial<SaveFile> | null;
  if (!s || typeof s !== 'object' || s.format !== SAVE_FORMAT) return { ok: false, reason: '這不是山腳鎮的存檔檔案。' };
  if (s.version !== 1) return { ok: false, reason: `存檔格式版本 ${String(s.version)} 不支援（目前是 1）。` };
  if (s.ruleVersion !== RULE_VERSION)
    return {
      ok: false,
      reason: `這個存檔是用規則版本「${String(s.ruleVersion)}」存的，目前遊戲是「${RULE_VERSION}」。規則不同，續玩結果會跟原本不一樣，所以不讀取。請用相同版本的遊戲開啟，或開新的一局。`,
    };
  if (!s.initial || !s.latest || !Array.isArray(s.journal)) return { ok: false, reason: '存檔內容不完整。' };
  try {
    const session = new Session(s.latest.snapshot, { seed: s.seed!, agents: s.agents, keepMessages }, {
      aux: s.latest.aux,
      queue: s.journal,
      messages: s.latest.messages,
    });
    const h = session.game.wuxiaHash();
    if (h !== s.latest.hash) return { ok: false, reason: `存檔的世界狀態檢查碼不符（檔案可能損壞）：${h.slice(0, 12)} ≠ ${s.latest.hash.slice(0, 12)}` };
    return { ok: true, session, initial: s.initial };
  } catch (e) {
    return { ok: false, reason: `存檔讀取失敗：${(e as Error).message}` };
  }
}

/** 從初始快照照 journal 重跑 steps 步（不經規則替身：替身產生的 input 已在 journal 裡）。回傳最後的 hash。 */
export function replaySave(save: SaveFile): { hash: string; ok: boolean } {
  const game = createGame(save.initial);
  game.wuxiaRecordHistory = false;
  const q = save.journal;
  for (let k = 1; k <= save.steps; k++) {
    const now = HEADLESS_EPOCH + k * STEP_MS;
    const after = game.engine.processedInputNumber ?? -1;
    const inputs: JournalInput[] = [];
    for (let i = after + 1; i < q.length; i++) {
      if (q[i].received > now) break;
      inputs.push(q[i]);
      if (inputs.length >= game.maxInputsPerStep) break;
    }
    runOneStep(game, inputs, now, { hash: false, light: true });
  }
  const hash = game.wuxiaHash();
  return { hash, ok: hash === save.latest.hash };
}
