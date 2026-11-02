// R0（#388）行為鎖定：固定種子情境矩陣。只讀模擬、不改規則；重構 PR 以這裡的雜湊 0 差異為合格條件。
// 情境與 test/harness/diag-v24-v25.mjs 的 idle／bot／farm／exp 相同（平衡報告用的 40 局），門派依種子輪替。
// farm／exp 的操作邏輯照抄該檔（T1 #393 再合併成共用模組）。
import crypto from 'node:crypto';
import { createState, tick, startBuild, buildWhy, facDef, startExpedition, canExpedition } from '../../src/sim.mjs';
import { save, load } from '../../src/save.mjs';
import { openExp } from '../../src/world.mjs';
import * as EC from '../../src/economy.mjs';
import { DAY } from '../../src/data.mjs';
import { ALL_ON, botDaily } from '../harness/bot.mjs';

export const hash = (s) => crypto.createHash('sha256').update(save(s)).digest('hex').slice(0, 16);
export const STRATS = ['idle', 'bot', 'farm', 'exp'];
export const SECTS = ['emei', 'wudang', 'taohua', 'gumu', 'xingxiu', null]; // null＝無名（自創，不指定 sect24）
export const sectOfSeed = (seed) => SECTS[((seed - 1001) % SECTS.length + SECTS.length) % SECTS.length];

const UP = ['hall', 'yard', 'kitchen'];
const spare = (s, cost) => s.res.coin - cost >= EC.wageBill(s) + EC.facBill(s);
function farm(s) {
  for (const id of UP) {
    if (!s.fac[id]) continue; let w = buildWhy(s, id);
    for (const item of ['tiemu', 'lingshi']) if (w && w.startsWith(item === 'tiemu' ? '鐵木不足' : '靈石不足') && !EC.marketWhy(s, item) && spare(s, EC.priceOf(s, item))) { const r = EC.marketDo(s, item); if (r.ok) w = buildWhy(s, id); }
    if (!w && !Object.values(s.fac).some((v) => v.site) && spare(s, facDef(id).stages[s.fac[id].stage + 1]?.cost?.coin || 0)) startBuild(s, id);
  }
}
function exp(s) {
  if (s.exp) return;
  const ids = s.ds.filter((d) => d.role !== 'laborer' && !d.away && d.hp > 70 && d.adult !== false).slice(0, 4).map((d) => d.id);
  if (ids.length < 2 || !canExpedition(openExp(s), ids).ok) return; startExpedition(s, ids, { thr: 0.5 });
}
const EXTRA = { farm, exp };

// 新局（v22＋v23＋v24 全開，與玩家從開局畫面開的新局同一套規則）。checkpoints：在這些日數結束時記雜湊。
export function runCase({ strat, seed, days, dt, checkpoints = [days] }) {
  const sect = sectOfSeed(seed);
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, v22: true, ...(sect ? { sect24: sect } : {}) });
  // 呼叫次序與 diag 相同：tick → 換日時 farm／exp（第一個 tick 也算換日）→ 換日時 botDaily（idle 不跑）。
  const per = Math.round(DAY / dt), extra = EXTRA[strat], out = {}; let dayA = 0, dayB = s.day;
  for (let i = 1; i <= days * per; i++) {
    tick(s, dt); if (s.alert) s.alert = null;
    if (s.day !== dayA) { dayA = s.day; extra?.(s); }
    if (strat !== 'idle' && s.day !== dayB) { dayB = s.day; botDaily(s); }
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

// 兩層：quick 進 run.sh quick（每次 commit 都跑）；full 用 tools/golden.mjs 平行跑（重構 PR 必跑）。
export const TIERS = {
  quick: { days: 10, dt: 6, checkpoints: [5, 10], seeds: [1001] },
  full: { days: 30, dt: 0.5, checkpoints: [10, 20, 30], seeds: [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008] },
};
export const casesOf = (tier) => { const T = TIERS[tier]; return T.seeds.flatMap((seed) => STRATS.map((strat) => ({ key: `${strat}-${seed}-${sectOfSeed(seed) || 'wuming'}`, strat, seed, days: T.days, dt: T.dt, checkpoints: T.checkpoints }))); };
