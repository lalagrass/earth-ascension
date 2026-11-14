// 武俠小鎮 A1（#564 驗收）：`wuxia:player-script` 的單機引擎腳本（腳本有 "engine": "local" 時走這裡）。
// 用瀏覽器 Worker 同一個 LocalCore（src/wuxia/engine/core.ts），以固定 16 ms 的假畫面更新跑：
//   speed（倍速 1／4／16／64 跑 minutes 遊戲分）、pause（暫停 frames 個畫面）、skip（跳到明早／下一件事）、
//   save（存到記憶體的 slot，經 JSON 來回＝匯出檔）、load（從 slot 讀檔，換一個新的 LocalCore）、run（直接跑 minutes 步）。
// 結果：最後的 hash 必須等於「無頭不中斷跑到同一步」的 hash（倍速、跳躍、存讀檔都不改變結果）；同腳本跑兩次 hash 相同。
import { LocalCore, type Speed } from '../../src/wuxia/engine/core';
import type { SaveFile } from '../../src/wuxia/engine/save';
import { runHeadless } from './headless';

export type LocalStep =
  | { op: 'speed'; speed: Speed; minutes: number }
  | { op: 'pause'; frames: number }
  | { op: 'skip'; kind: 'morning' | 'next-event' }
  | { op: 'save'; slot: string }
  | { op: 'load'; slot: string }
  | { op: 'run'; minutes: number };

export type LocalScript = { engine: 'local'; seed?: number; frameMs?: number; steps: LocalStep[] };

export function runLocalScript(script: LocalScript, seedArg?: number) {
  const seed = seedArg ?? script.seed ?? 7;
  const frameMs = script.frameMs ?? 16;
  let core = new LocalCore();
  core.init({ kind: 'new', world: { seed } });
  core.autoSlow = false;
  const slots = new Map<string, string>();
  const log: string[] = [];
  const at = () => `第 ${core.session.k} 步（遊戲分 ${core.session.gameMinute()}）`;
  for (const s of script.steps) {
    if (s.op === 'speed') {
      const target = core.session.k + s.minutes;
      core.setSpeed(s.speed);
      while (core.session.k < target) {
        if ((frameMs / 1000) * s.speed > target - core.session.k) core.advance(target - core.session.k);
        else core.frame(frameMs);
      }
      core.setSpeed(0);
      log.push(`${s.speed}× 跑 ${s.minutes} 遊戲分 → ${at()}`);
    } else if (s.op === 'pause') {
      const k = core.session.k;
      for (let i = 0; i < s.frames; i++) core.frame(frameMs);
      log.push(`暫停 ${s.frames} 個畫面：步數 ${k} → ${core.session.k}（不動）`);
      if (core.session.k !== k) throw new Error('暫停時步數變了');
    } else if (s.op === 'skip') {
      const from = core.session.gameMinute();
      core.skipTo(s.kind);
      while (core.skipping) core.frame(frameMs);
      log.push(`${s.kind === 'morning' ? '跳到明早' : '跳到下一件事'}：遊戲分 ${from} → ${core.session.gameMinute()}`);
    } else if (s.op === 'save') {
      slots.set(s.slot, JSON.stringify(core.save(s.slot)));
      log.push(`存檔「${s.slot}」 ${at()} hash ${core.hash().slice(0, 16)}…`);
    } else if (s.op === 'load') {
      const data = slots.get(s.slot);
      if (!data) throw new Error(`沒有存檔 ${s.slot}`);
      core = new LocalCore();
      const r = core.init({ kind: 'load', save: JSON.parse(data) as SaveFile });
      if (!r.ok) throw new Error(r.reason);
      core.autoSlow = false;
      log.push(`讀檔「${s.slot}」 → ${at()} hash ${core.hash().slice(0, 16)}…`);
    } else if (s.op === 'run') {
      core.advance(s.minutes);
      log.push(`直接跑 ${s.minutes} 步 → ${at()}`);
    }
  }
  const steps = core.session.k;
  const finalHash = core.hash();
  const reference = runHeadless({ seed, minutes: steps / 60 }).finalHash;
  return { seed, steps, gameMinute: core.session.gameMinute(), finalHash, reference, ok: finalHash === reference, log };
}
