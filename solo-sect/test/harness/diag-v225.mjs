/* loop148 v2.25 前後對照：逐局 JSON 行。用法：SS_DT=0.25 node test/harness/diag-v225.mjs [n=20] [start=1001] [days=30]
   除 bot（每日試蓋寢舍、能收就收）外，加一個「種田流」升級政策：每日試升正殿／演武場／膳房；缺鐵木或靈石時，若市集有賣且錢夠付完下次月俸＋維護，就買。
   s.alert 出現即計數並清掉（模擬玩家按「知道了」）。 */
import { run } from './bot.mjs';
import { power } from '../../src/jianghu.mjs';
import { startBuild, buildWhy, facDef } from '../../src/sim.mjs';
import * as EC from '../../src/economy.mjs';
const N = +(process.argv[2] || 20), S0 = +(process.argv[3] || 1001), D = +(process.argv[4] || 30);
const avg = (a, f) => (a.length ? a.reduce((x, d) => x + f(d), 0) / a.length : 0);
const UP = ['hall', 'yard', 'kitchen'];
for (let k = 0; k < N; k++) {
  const seed = S0 + k, c = { alert: 0, alertHj: 0, n: 0, hungry: 0, buyT: 0, buyL: 0, short: 0, shortSmall: 0, bills: 0 }; let i = 0, day = 0, seenLog = null;
  const msgs = [];
  const s = run(seed, { v22: true }, D, true, (s) => {
    if (s.alert) { c.alert++; if (/化境/.test(s.alert.msg)) c.alertHj++; s.alert = null; }
    for (const e of s.log) { if (e === seenLog) break; msgs.push(e.msg); } seenLog = s.log[0];
    if (s.day !== day) { day = s.day; const X = EC.E(s);
      if (X.lastBill && X.lastBill.day === s.day - 0 && !X.lastBill._seen) { X.lastBill._seen = 1; }
      for (const id of UP) { if (!s.fac[id]) continue; let w = buildWhy(s, id);
        for (const [rk, item] of [['tiemu', 'tiemu'], ['lingshi', 'lingshi']]) if (w && w.startsWith(rk === 'tiemu' ? '鐵木不足' : '靈石不足') && EC.MARKET.stock[item] && !EC.marketWhy(s, item) && s.res.coin - EC.priceOf(s, item) >= EC.wageBill(s) + EC.facBill(s)) { const r = EC.marketDo(s, item); if (r.ok) c[rk === 'tiemu' ? 'buyT' : 'buyL']++; w = buildWhy(s, id); }
        if (!w && !Object.values(s.fac).some((v) => v.site) && s.res.coin - (facDef(id).stages[s.fac[id].stage + 1]?.cost?.coin || 0) >= EC.wageBill(s) + EC.facBill(s)) startBuild(s, id); } }
    if (++i % 40) return; for (const d of s.ds) { if (d.labor || d.away) continue; c.n++; if ((d.needs?.hunger ?? 100) < 30) c.hungry++; } });
  const ds = s.ds.filter((d) => !d.labor), X = s.threat || {}, G = s.gen || { couples: [] }, per = {};
  for (const cp of G.couples) for (const id of cp) per[id] = (per[id] || 0) + 1;
  const wed = msgs.filter((m) => m.startsWith('【成親】')), wedNames = {}; for (const m of wed) { const mm = m.match(/【成親】(.+?)與(.+?)在大廳/); if (mm) for (const nm of [mm[1], mm[2]]) wedNames[nm] = (wedNames[nm] || 0) + 1; }
  const tiers = Object.entries(s.fac).filter(([id]) => !facDef(id)?.v16);
  console.log(JSON.stringify({ seed, n: ds.length, coin: s.res.coin, mood: +avg(ds, (d) => d.mood).toFixed(1), hungryPct: +(100 * c.hungry / (c.n || 1)).toFixed(2),
    fought: X.fought || 0, won: X.won || 0, pow: +power(s).toFixed(1),
    lib: s.fac.library?.stage || 0, shed: s.fac.shed?.stage || 0, readwu: s.ds.filter((d) => d.rwDone || d.readwuDone || d.wuRead).length,
    readwuMsg: msgs.filter((m) => /開竅|悟性 \+1|悟性+1/.test(m)).length, stewLib: msgs.filter((m) => /【執事】.*藏經閣/.test(m)).length, stewShed: msgs.filter((m) => /【執事】.*工寮/.test(m)).length,
    buyT: c.buyT, buyL: c.buyL, t2: tiers.filter(([, f]) => f.stage >= 2).length, t3: tiers.filter(([, f]) => f.stage >= 3).length,
    alert: c.alert, alertHj: c.alertHj, hjLog: msgs.filter((m) => /臻至化境/.test(m)).length,
    dfbb: msgs.filter((m) => /^【抉擇】.*東方不敗/.test(m)).length, hy: msgs.filter((m) => /^【抉擇】.*火雲/.test(m)).length,
    wed: wed.length, dblWed: Object.values(wedNames).filter((v) => v > 1).length, dblCouple: Object.values(per).filter((v) => v > 1).length,
    disrepair: msgs.filter((m) => m.startsWith('【失修】')).length, upkeepWarn: msgs.filter((m) => m.startsWith('【維護欠款】')).length, disrepairEnd: !!EC.E(s).disrepair }));
}
