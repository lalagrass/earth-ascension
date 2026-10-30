// loop38 診斷：8 人規模平衡。用法：node test/harness/diag-8p.mjs [count=160] [days=60] [start=1001] [idle|bot]
// 每 10 tick 快照（loop46 起；之前為每日換日快照）依人數分桶（≤4、5–7、≥8）：平均心情、低落比例、心情扣分表（各負向項平均值×出現率）、錢、受傷。
import { run, seedRange } from './bot.mjs';
import { moodParts } from '../../src/mind.mjs';
const [n = 160, days = 60, start = 1001] = process.argv.slice(2, 5).map(Number), bot = process.argv[5] !== 'idle', SPEC = JSON.parse(process.argv[6] || '{}'); /* loop47：第 6 參數可覆寫規則，如 '{"cropcare":false}' */
const B = {}, reach = []; const bk = (k) => (k <= 4 ? '≤4' : k <= 7 ? '5-7' : '≥8');
for (const seed of seedRange(n, start)) {
  let day = -1, r8 = null;
  let tk = 0; /* loop46：原本只在換日（深夜）取樣，夜裡人人餓，扣分表嚴重高估「肚子餓」；改為每 10 tick 取樣（全時段平均） */
  const s = run(seed, SPEC, days, bot, (s) => { if (++tk % 10) return; if (s.day !== day) day = s.day; const k = s.ds.length; if (k >= 8 && r8 == null) r8 = s.day;
    const b = (B[bk(k)] ||= { snaps: 0, ds: 0, mood: 0, low: 0, coin: 0, hurt: 0, neg: {} }); b.snaps++; b.coin += s.res.coin;
    for (const d of s.ds) { b.ds++; b.mood += d.mood; if (d.mood < 35) b.low++; if (d.hp < 60) b.hurt++;
      for (const [lab, v] of moodParts(d, s)) if (v < 0) { const key = String(lab).replace(/[0-9×]+/g, '#').slice(0, 14); b.neg[key] = (b.neg[key] || 0) + v; } } });
  reach.push(r8);
}
const got = reach.filter((x) => x != null);
console.log(`${bot ? 'bot' : 'idle'} seeds ${start}..${start + n - 1} days ${days}: 達 8 人 ${got.length}/${n}，平均第 ${(got.reduce((a, b) => a + b, 0) / (got.length || 1)).toFixed(1)} 日`);
for (const k of ['≤4', '5-7', '≥8']) { const b = B[k]; if (!b) continue;
  console.log(`[${k}] 快照 ${b.snaps} 人日 ${b.ds} 心情 ${(b.mood / b.ds).toFixed(1)} 低落 ${(100 * b.low / b.ds).toFixed(1)}% 傷 ${(100 * b.hurt / b.ds).toFixed(1)}% 錢 ${(b.coin / b.snaps).toFixed(0)}`);
  console.log('   扣分(每人日平均)：' + Object.entries(b.neg).sort((a, c) => a[1] - c[1]).slice(0, 8).map(([l, v]) => `${l} ${(v / b.ds).toFixed(2)}`).join(' | ')); }
