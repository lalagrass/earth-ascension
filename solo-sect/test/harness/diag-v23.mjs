/* loop156 v2.3 診斷：逐局 JSON 行（專長三人、門類造詣、御氣、幫工、村舍大院、清修）。用法：SS_DT=0.25 node test/harness/diag-v23.mjs [n=15] [start=1001] [days=30] */
import { run } from './bot.mjs';
import { mastery, qiMax, qiOf, yuqiOn, innerSpecs } from '../../src/arts.mjs';
import { isEliteHermit, facDef } from '../../src/sim.mjs';
import * as EC from '../../src/economy.mjs';
const buyLing = (s, id) => { const f = s.fac[id], nx = f && f.stage >= 2 && facDef(id).stages[f.stage + 1]; let n = 0; /* loop157 P6，同 diag-v225 */
  while (nx?.rare?.lingshi > (s.res.lingshi || 0) && !EC.marketWhy(s, 'lingshi') && s.res.coin - EC.priceOf(s, 'lingshi') >= EC.wageBill(s) + EC.facBill(s) && EC.marketDo(s, 'lingshi').ok) n++; return n; };
const N = +(process.argv[2] || 15), S0 = +(process.argv[3] || 1001), D = +(process.argv[4] || 30);
const X3 = ['chengying', 'azi', 'chenglingsu'];
for (let k = 0; k < N; k++) { const seed = S0 + k, c = { n: 0, yuqi: 0, ngd: 0, spent: 0, hermit: 0, ticks: 0, buyL: 0, day: -1, lspecAct: 0, labAct: 0 }; let i = 0;
  const s = run(seed, { v22: true }, D, true, (s) => { if (s.day !== c.day) { c.day = s.day; for (const id of Object.keys(s.fac)) c.buyL += buyLing(s, id); } if (++i % 40) return; c.ticks++; if (isEliteHermit(s)) c.hermit++;
    for (const d of s.ds) { if (d.away) continue; if (d.role === 'laborer') { if (d.task) { c.labAct++; if (d.task.act === d.lspec) c.lspecAct++; } continue; }
      c.n++; if (d.ng2 && qiMax(d) > 0) { c.ngd++; if (d.path?.length && yuqiOn(d)) c.yuqi++; if ((d.spentUntil ?? -1) > s.t) c.spent++; } } });
  const ds = s.ds.filter((d) => d.role !== 'laborer'), L = s.ds.filter((d) => d.role === 'laborer'), best = (cat) => Math.max(0, ...ds.map((d) => mastery(d, cat)));
  console.log(JSON.stringify({ seed, n: ds.length, labor: L.length, lspec: L.filter((d) => d.lspec).length, shed: s.fac.shed?.stage || 0, coin: s.res.coin,
    joined: X3.filter((id) => s.ds.some((d) => d.id === id)), zhenfa: +best('zhenfa').toFixed(1), dushu: +best('dushu').toFixed(1), yishu: +best('yishu').toFixed(1),
    innerSpec: ds.reduce((a, d) => a + innerSpecs(d).length, 0), yuqiPct: +(100 * c.yuqi / (c.ngd || 1)).toFixed(2), spentPct: +(100 * c.spent / (c.ngd || 1)).toFixed(2),
    lspecPct: +(100 * c.lspecAct / (c.labAct || 1)).toFixed(1), hermitPct: +(100 * c.hermit / (c.ticks || 1)).toFixed(1), hidden: L.filter((d) => d.hidden?.shown).length, lib: s.fac.library?.stage || 0, readwu: s.ds.filter((d) => d.rwDone || d.readwuDone || d.wuRead).length, buyL: c.buyL, t3: Object.entries(s.fac).filter(([id, f]) => !facDef(id)?.v16 && f.stage >= 3).length })); }
