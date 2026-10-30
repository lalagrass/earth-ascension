// loop48 診斷：任一需求低落（預設 social<25「寂寞」）。用法：node test/harness/diag-need.mjs [count] [days] [start] [idle|bot] [need=social] [thr=25]
// 只看 ≥8 人階段（bot）或全程（idle）：低落比例、依身分、一日十段分佈、低落時在做什麼、個性分佈。
import { run, seedRange } from './bot.mjs';
const [n = 160, days = 60, start = 1001] = process.argv.slice(2, 5).map(Number), bot = process.argv[5] !== 'idle', need = process.argv[6] || 'social', thr = +(process.argv[7] || 25);
const A = { pt: 0, low: 0, role: {}, roleN: {}, hr: Array(10).fill(0), hrN: Array(10).fill(0), act: {}, tr: {}, trN: {} }; let tk = 0;
for (const seed of seedRange(n, start)) run(seed, {}, days, bot, (s) => { if (++tk % 5 || (bot && s.ds.length < 8)) return; const ph = Math.floor((s.t % 600) / 60);
  for (const d of s.ds) { if (d.away) continue; A.pt++; A.roleN[d.role] = (A.roleN[d.role] || 0) + 1; A.hrN[ph]++; for (const p of d.personality || []) A.trN[p] = (A.trN[p] || 0) + 1;
    if ((d.needs[need] ?? 100) < thr) { A.low++; A.role[d.role] = (A.role[d.role] || 0) + 1; A.hr[ph]++; const a = d.task?.act || '待命'; A.act[a] = (A.act[a] || 0) + 1; for (const p of d.personality || []) A.tr[p] = (A.tr[p] || 0) + 1; } } });
const pc = (a, b) => (100 * a / (b || 1)).toFixed(0) + '%';
console.log(`${bot ? 'bot≥8' : 'idle'} ${need}<${thr} 低落 ${pc(A.low, A.pt)}`);
console.log(' 身分：' + Object.keys(A.roleN).map((r) => `${r} ${pc(A.role[r] || 0, A.roleN[r])}`).join(' | '));
console.log(' 十段：' + A.hr.map((h, i) => pc(h, A.hrN[i])).join('/'));
console.log(' 在做：' + Object.entries(A.act).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${pc(v, A.low)}`).join(' | '));
console.log(' 個性：' + Object.keys(A.trN).map((t) => [t, (A.tr[t] || 0) / A.trN[t]]).sort((a, b) => b[1] - a[1]).map(([t, v]) => `${t} ${(100 * v).toFixed(0)}%`).join(' | '));
