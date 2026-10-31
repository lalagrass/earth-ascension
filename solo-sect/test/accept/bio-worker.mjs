// M1 驗收工作程序：跑指定種子 30 日，輸出每位弟子的「傳記文字」與「實際行為」真值（逐 tick 量測，含走路時間，獨立於遊戲內記帳）
import { run, ALL_ON } from '../harness/bot.mjs';
import { bioLine, ACT_CAT } from '../../src/util.mjs';
const out = [];
for (const seed of process.argv.slice(2).map(Number)) {
  const time = {};
  const s = run(seed, { ...ALL_ON, v22: true }, 30, true, (s) => { for (const d of s.ds) { const c = ACT_CAT[d.task?.act]; if (c && !d.away) { const m = (time[d.id] ||= {}); m[c] = (m[c] || 0) + 1; } } });
  for (const d of s.ds) { const m = time[d.id] || {}, o = (m.social || 0) + (m.combat || 0), i = (m.cult || 0) + (m.craft || 0); out.push({ seed, id: d.id, text: bioLine(d), truth: o > i ? 'out' : 'in', o, i }); }
}
process.stdout.write(JSON.stringify(out));
