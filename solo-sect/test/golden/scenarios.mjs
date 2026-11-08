// R0（#388）行為鎖定：固定種子情境矩陣。只讀模擬、不改規則；重構 PR 以這裡的雜湊 0 差異為合格條件。
// 情境與 tools/diag/diag-v24-v25.mjs 的 idle／bot／farm／exp 相同（平衡報告用的 40 局），門派依種子輪替。
// farm／exp 的操作邏輯照抄該檔（T1 #393 再合併成共用模組）。
import crypto from 'node:crypto';
import { createState, tick } from '../../src/sim.mjs';
import { save, load } from '../../src/save.mjs';
import { DAY } from '../../src/data.mjs';

export const hash = (s) => {
  const state = JSON.parse(save(s));
  // R9：5.0 只淘汰舊開局，隱居模擬的舊 golden 仍逐位比較。
  state.rules = '4.9';
  if (state.migSteps) state.migSteps = state.migSteps.filter(step => step !== '5.0');
  return crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16);
};

export function runCase({ seed, days, dt, checkpoints = [days], hermitage = {} }) {
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false,
    hermitage: true, opening: hermitage.opening || hermitage.partner || 'xiaolongnv',
    starterArt: hermitage.starterArt || 'chunyangFist' });
  const per = Math.round(DAY / dt), out = {};
  for (let i = 1; i <= days * per; i++) {
    tick(s, dt); if (s.alert) s.alert = null;
    if (i % per === 0 && checkpoints.includes(i / per)) out[i / per] = hash(s);
  }
  return out;
}

// 舊版存檔回放：讀入（逐版遷移）→ 記遷移後雜湊 → 跑 days 日再記一次。
export function replaySave(text, { days = 5, dt = 1 } = {}) {
  const r = load(text); if (!r.ok) return { ok: false, err: r.err };
  const s = r.state, out = { ok: true, loaded: hash(s) };
  for (let i = 0; i < days * Math.round(DAY / dt); i++) { tick(s, dt); if (s.alert) s.alert = null; }
  out.after = hash(s); return out;
}

// R9：隱居是唯一 golden；原有雙人案例逐位不變，新獨行案例驗證單人路線。
export const TIERS = {
  hermitage: { days: 5, dt: 6, checkpoints: [1, 3, 5], seeds: [42] },
};
export const casesOf = (tier) => {
  if (tier !== 'hermitage') throw new Error(`舊 golden tier 已淘汰：${tier}`);
  const T = TIERS.hermitage;
  return [
    { key: 'xln-chunyang-42', seed: 42, days: T.days, dt: T.dt, checkpoints: T.checkpoints, hermitage: { opening: 'xiaolongnv', starterArt: 'chunyangFist' } },
    { key: 'hr-luohan-42', seed: 42, days: T.days, dt: T.dt, checkpoints: T.checkpoints, hermitage: { opening: 'huangrong', starterArt: 'luohanHands' } },
    { key: 'solo-chunyang-42', seed: 42, days: T.days, dt: T.dt, checkpoints: T.checkpoints, hermitage: { opening: 'solo', starterArt: 'chunyangFist' } },
  ];
};
