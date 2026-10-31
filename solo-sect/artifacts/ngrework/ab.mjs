import { run, ALL_ON } from '/workspace/ss-loop1/solo-sect/test/harness/bot.mjs';
import { power } from '/workspace/ss-loop1/solo-sect/src/jianghu.mjs';
import { qiMax } from '/workspace/ss-loop1/solo-sect/src/neigong.mjs';
const [arm, a, b, days='20'] = process.argv.slice(2);
const spec = { ...ALL_ON }; if (arm !== 'v2') spec.ngshield = false; if (arm === 'off') spec.neigong = false;
for (let seed = +a; seed <= +b; seed++) {
  const snap = {}; const seen = new WeakSet(); let guard = 0, hurtLog = 0;
  const s = run(seed, spec, +days, true, (s) => { for (const l of (s.log || []).slice(0, 5)) { if (seen.has(l)) continue; seen.add(l); if (/護體真氣擋下/.test(l.msg)) guard++; if (/重傷/.test(l.msg)) hurtLog++; } const d = s.day; if ([4,8,12,16,20,30].includes(d) && !snap[d]) snap[d] = { pow: +power(s).toFixed(1), qi: +(s.ds.reduce((x, y) => x + (y.ng ? qiMax(y) : 0), 0) / s.ds.length).toFixed(1), hp: +(s.ds.reduce((x,y)=>x+y.hp,0)/s.ds.length).toFixed(1) }; });
  const X = s.threat || {}; const L = s.lair || {};
  const msgs = (s.log || []).map((l) => l.msg || '');
  console.log(JSON.stringify({ arm, seed, snap, raids: (X.hist || []).map((h) => ({ d: h.day, f: h.fight || (h.pay ? 'pay' : '?'), h: h.hurt ? 1 : 0 })), lair: (L.hist || []).map((h) => ({ d: h.day, w: h.win ? 1 : 0 })), guard, hurtLog, exp: msgs.filter((m)=>/遠行|巡山/.test(m)).length }));
}
