// loop50 診斷：過路高人傳功頻率。用法：node test/harness/diag-master.mjs [count] [days] [start] [idle|bot]
// 每局：來訪次數 m、傳武學 t（其中本路數 ts）、提前點撥招式 mv；另統計來訪當下「可傳武學」候選數（不擲亂數，只檢查）。
import { run, seedRange } from './bot.mjs';
import { ARTS } from '../../src/data.mjs';
import { reqMissing, fits } from '../../src/arts.mjs';
const [n = 160, days = 60, start = 1001] = process.argv.slice(2, 5).map(Number), bot = process.argv[5] !== 'idle', SPEC = JSON.parse(process.argv[6] || '{}'); /* loop55：第 6 參數覆寫規則 */
const A = { m: 0, t: 0, ts: 0, mv: 0, pg: 0, arts: 0, visits: 0, cand0: 0, why: { known: 0, req: 0, fit: 0, secret: 0 } };
for (const seed of seedRange(n, start)) { let pm = 0;
  const s = run(seed, SPEC, days, bot, (s) => { const E = s.jhev; if (!E || typeof E !== 'object' || (E.m || 0) === pm) return; pm = E.m; A.visits++;
    const d = s.ds.find((x) => s.log[0]?.msg.includes(x.name)) || s.ds[0]; let c = 0;
    for (const x of ARTS) { if (x.secret) { A.why.secret++; continue; } if (d.arts[x.id]) { A.why.known++; continue; } if (reqMissing(d, x).length) { A.why.req++; continue; } if (!fits(d, x)) { A.why.fit++; continue; } c++; }
    if (!c) A.cand0++; });
  const E = s.jhev || {}; A.m += E.m || 0; A.t += E.t || 0; A.ts += E.ts || 0; A.mv += E.mv || 0; A.pg += E.pg || 0; A.arts += s.ds.reduce((z, d) => z + Object.keys(d.arts || {}).length, 0) / s.ds.length; }
const per = (v) => (v / n).toFixed(2);
console.log(`${bot ? 'bot' : 'idle'} ${start}..${start + n - 1}: 來訪 ${per(A.m)}/局、傳武學 ${per(A.t)}（本路數 ${per(A.ts)}）、點撥招式 ${per(A.mv)}、殘譜 ${per(A.pg)}；人均武學 ${per(A.arts)} 套；來訪時無可傳武學 ${(100 * A.cand0 / (A.visits || 1)).toFixed(0)}%`);
console.log('  不可傳原因（每次來訪×每套武學）：' + Object.entries(A.why).map(([k, v]) => `${k} ${(v / (A.visits || 1)).toFixed(1)}`).join(' | '));
