// loop61：diag-8p 並行版。用法：SS_DT=0.25 node test/harness/par-8p.mjs [count=160] [days=60] [start=1001] [idle|bot] [spec-json] [jobs=8]
// 切成 jobs 段並行跑，合併原始累計（加權平均，不是平均的平均）。
import { spawn } from 'node:child_process';
const a = process.argv.slice(2), [n = 160, days = 60, start = 1001] = a.slice(0, 3).map(Number), grp = a[3] || 'bot', spec = a[4] || '{}', jobs = +(a[5] || 8);
const per = Math.ceil(n / jobs), parts = [];
for (let j = 0; j < jobs; j++) { const c = Math.min(per, n - j * per); if (c <= 0) break;
  parts.push(new Promise((ok, no) => { let out = ''; const p = spawn(process.execPath, [new URL('./diag-8p.mjs', import.meta.url).pathname, c, days, start + j * per, grp, spec], { env: { ...process.env, DIAG_JSON: '1' } });
    p.stdout.on('data', (x) => (out += x)); p.stderr.on('data', (x) => process.stderr.write(x)); p.on('close', (code) => (code ? no(new Error('exit ' + code)) : ok(JSON.parse(out.split('\nJSON ').pop() || out.split('JSON ').pop())))); })); }
const R = await Promise.all(parts), B = {}, reach = R.flatMap((r) => r.reach);
for (const r of R) for (const [k, b] of Object.entries(r.B)) { const t = (B[k] ||= { snaps: 0, ds: 0, mood: 0, low: 0, coin: 0, hurt: 0, neg: {} });
  for (const f of ['snaps', 'ds', 'mood', 'low', 'coin', 'hurt']) t[f] += b[f]; for (const [l, v] of Object.entries(b.neg)) t.neg[l] = (t.neg[l] || 0) + v; }
const got = reach.filter((x) => x != null);
console.log(`${grp} seeds ${start}..${start + n - 1} days ${days} spec ${spec}: 達 8 人 ${got.length}/${n}，平均第 ${(got.reduce((x, y) => x + y, 0) / (got.length || 1)).toFixed(1)} 日`);
for (const k of ['≤4', '5-7', '≥8']) { const b = B[k]; if (!b) continue;
  console.log(`[${k}] 人日 ${b.ds} 心情 ${(b.mood / b.ds).toFixed(1)} 低落 ${(100 * b.low / b.ds).toFixed(1)}% 傷 ${(100 * b.hurt / b.ds).toFixed(1)}% 錢 ${(b.coin / b.snaps).toFixed(0)}`);
  console.log('   扣分：' + Object.entries(b.neg).sort((x, y) => x[1] - y[1]).slice(0, 8).map(([l, v]) => `${l} ${(v / b.ds).toFixed(2)}`).join(' | ')); }
