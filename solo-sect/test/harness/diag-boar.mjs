// loop66 診斷：野豬下山、哨崗嚇回、菜被拱；qshare 生效比例。用法：SS_DT=0.25 node test/harness/diag-boar.mjs [count] [days] [start] [bot|idle] [spec-json]
// 只在 ≥8 人階段計數；每 10 tick 取樣 shareOn 與外門比例。輸出 JSON 一行給合併。
import { run, seedRange } from './bot.mjs';
import { shareOn, outers } from '../../src/sim.mjs';
const [n = 5, days = 60, start = 1001] = process.argv.slice(2, 5).map(Number), bot = process.argv[5] !== 'idle', SPEC = JSON.parse(process.argv[6] || '{}');
const A = { seeds: 0, days8: 0, raid: 0, scared: 0, lost: 0, empty: 0, watchBuilt: 0, watchDay: 0, smp: 0, share: 0, outFrac: 0 };
for (const seed of seedRange(n, start)) { let tk = 0, top = null, d8 = null, w0 = 0, wd = null; A.seeds++;
  const s = run(seed, SPEC, days, bot, (s) => { const big = s.ds.length >= 8; if (big && d8 == null) { d8 = s.day; w0 = s.watched || 0; }
    if (wd == null && (s.fac.watch?.stage || 0) > 0) wd = s.day;
    const k = top ? s.log.indexOf(top) : 0; if (big) for (const l of s.log.slice(0, k < 0 ? s.log.length : k)) { const m = l.msg; if (/循山路下來/.test(m)) A.raid++; else if (/拱壞了一畦菜/.test(m)) A.lost++; else if (/沒找到吃的/.test(m)) A.empty++; }
    top = s.log[0]; if (++tk % 10 || !big) return; A.smp++; if (shareOn(s)) A.share++; A.outFrac += outers(s).length / s.ds.length; });
  if (d8 != null) { A.days8 += days - d8; A.scared += (s.watched || 0) - w0; } if (wd != null) { A.watchBuilt++; A.watchDay += wd; } }
console.log('JSON ' + JSON.stringify(A));
