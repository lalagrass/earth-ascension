/* loop93 通用開關對照：同種子、bot 玩家、某開關開／關，看戰鬥與經濟。
   用法：SS_DT=0.25 node test/harness/diag-toggle.mjs <key> [n=160] [start=1001] [days=20]（輸出逐局 JSON 行，另由 diag-toggle-sum 加總） */
import { run } from './bot.mjs';
import { artTier } from '../../src/arts.mjs';
const K = process.argv[2], N = +(process.argv[3] || 160), S0 = +(process.argv[4] || 1001), D = +(process.argv[5] || 20);
const cnt = (s, re) => (s.log || []).filter((l) => re.test(typeof l === 'string' ? l : l.msg || l.text || '')).length;
const one = (seed, on) => { const s = run(seed, { [K]: on }, D, true), ds = s.ds.filter((d) => !d.labor);
  return { seed, on, n: ds.length, xp: +ds.reduce((a, d) => a + Object.values(d.arts || {}).reduce((b, r) => b + r.xp, 0), 0).toFixed(1), da: ds.flatMap((d) => Object.keys(d.arts || {}).map((id) => artTier(d, id))).filter((t) => t >= 2).length,
    coin: s.res.coin, rep: s.rep, hp: +(ds.reduce((a, d) => a + d.hp, 0) / ds.length).toFixed(2), win: cnt(s, /擊退|打退|得勝|勝了|贏/), lose: cnt(s, /敗|落荒|重傷/), yard: s.fac.yard?.stage || 0, wood: s.res.wood, spar: cnt(s, /切磋/) }; };
for (let k = 0; k < N; k++) { const a = one(S0 + k, true), b = one(S0 + k, false); console.log(JSON.stringify(a)); console.log(JSON.stringify(b)); }
