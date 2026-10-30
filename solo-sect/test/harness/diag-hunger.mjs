// loop46 診斷：肚子餓（只診斷）。用法：node test/harness/diag-hunger.mjs [count] [days] [start] [idle|bot]
// 每 tick 統計「餓（飽足<20）」的人次，依人數分桶，並拆：當下有無飯（food>0）、有無菜（veg>0）、在做什麼、是否排隊用飯；另記每日煮飯／用飯次數與膳房階段。
import { run, seedRange } from './bot.mjs';
import { facStage } from '../../src/sim.mjs';
import { moodParts } from '../../src/mind.mjs';
const [n = 160, days = 60, start = 1001] = process.argv.slice(2, 5).map(Number), bot = process.argv[5] !== 'idle';
const B = {}; const bk = (k) => (k <= 4 ? '≤4' : k <= 7 ? '5-7' : '≥8');
for (const seed of seedRange(n, start)) {
  run(seed, {}, days, bot, (s) => { const b = (B[bk(s.ds.length)] ||= { pt: 0, hungry: 0, noFood: 0, noAny: 0, act: {}, eatTasks: 0, cookTasks: 0, food: 0, veg: 0, ticks: 0, kst: {}, neg: {}, np: 0, hourH: Array(10).fill(0), hourN: Array(10).fill(0) }); b.ticks++; const ph = Math.floor((s.t % 600) / 60); b.food += s.res.food; b.veg += s.res.veg || 0;
    const st = facStage(s, 'kitchen')?.name || '?'; b.kst[st] = (b.kst[st] || 0) + 1;
    for (const d of s.ds) { if (d.away) continue; b.pt++; const a = d.task?.act || '待命'; if (a === 'eat') b.eatTasks++; if (a === 'cook') b.cookTasks++;
      b.hourN[ph]++; if (d.needs.hunger < 20) b.hourH[ph]++; if (b.ticks % 10 === 0) { b.np++; for (const [lab, v] of moodParts(d, s)) if (v < 0) { const key = String(lab).replace(/[0-9×]+/g, '#').slice(0, 10); b.neg[key] = (b.neg[key] || 0) + v; } }
      if (d.needs.hunger < 20) { b.hungry++; if (s.res.food <= 0) b.noFood++; if (s.res.food <= 0 && !(s.res.veg > 0)) b.noAny++; b.act[a] = (b.act[a] || 0) + 1; } } });
}
console.log(`${bot ? 'bot' : 'idle'} ${start}..${start + n - 1}`);
for (const k of ['≤4', '5-7', '≥8']) { const b = B[k]; if (!b) continue;
  console.log(`[${k}] 人tick ${b.pt} 餓 ${(100 * b.hungry / b.pt).toFixed(1)}%｜餓時無飯 ${(100 * b.noFood / (b.hungry || 1)).toFixed(0)}% 無飯無菜 ${(100 * b.noAny / (b.hungry || 1)).toFixed(0)}%｜平均存飯 ${(b.food / b.ticks).toFixed(1)} 菜 ${(b.veg / b.ticks).toFixed(1)}｜用飯中 ${(100 * b.eatTasks / b.pt).toFixed(1)}% 煮飯中 ${(100 * b.cookTasks / b.pt).toFixed(1)}%`);
  console.log('   餓時在做：' + Object.entries(b.act).sort((a, c) => c[1] - a[1]).slice(0, 8).map(([a, v]) => `${a} ${(100 * v / b.hungry).toFixed(0)}%`).join(' | ') + '\n   全時段扣分(每人tick)：' + Object.entries(b.neg).sort((a, c) => a[1] - c[1]).slice(0, 6).map(([l, v]) => `${l} ${(v / b.np).toFixed(2)}`).join(' | ') + '\n   一日十分段餓比例：' + b.hourH.map((h, i) => (100 * h / (b.hourN[i] || 1)).toFixed(0)).join('/') + '\n   灶：' + Object.entries(b.kst).map(([a, v]) => `${a} ${(100 * v / b.ticks).toFixed(0)}%`).join(' '));
}
