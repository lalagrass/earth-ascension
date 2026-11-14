// 武俠小鎮 A3（#574）`npm run wuxia:social-log -- --day 12`：某一日的「鎮上動靜」（文法模板渲染，跟畫面同一個渲染器）。
// 用法：npm run wuxia:social-log -- [run.json] --day 3 [--seed 7] [--raw]（--raw 印原始紀錄）
import { readClock } from '../../convex/wuxia/clock';
import { traitsOf } from '../../convex/wuxia/a3_silent/data';
import { renderSocial } from '../../convex/wuxia/a3_silent/grammar';
import { loadSocialRun, say } from './social-run';

const day = Number(process.argv[process.argv.indexOf('--day') + 1] ?? 1);
const r = loadSocialRun(process.argv.slice(2), Math.max(1, (Number.isFinite(day) ? day : 1)));
if (!r.st) {
  say('a3-silent 沒開（或 run.json 沒有 a3 資料）');
  process.exit(1);
}
const st = r.st;
const all = renderSocial(st.log, r.nameOf, (c) => traitsOf(st, c));
const byId = new Map(st.log.map((e) => [e.id, e]));
say(`# 鎮上動靜 第 ${day} 日：${r.label}`);
let n = 0;
for (const line of all) {
  const c = readClock(line.t);
  if (c.day !== day) continue;
  n++;
  const e = byId.get(line.id)!;
  const hhmm = `${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
  say(r.args.raw ? `${hhmm} #${e.id} ${JSON.stringify(e)}` : `${hhmm} ${line.text}`);
}
if (!n) say('（這一日沒有紀錄；紀錄環只留最近 1000 筆）');
