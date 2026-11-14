// 武俠小鎮 A3（#574）`npm run wuxia:social-report`：無言互動統計——各互動次數、成功率對公式（B 類：實測落在 99.9% 信賴區間）、
// 寒暄占比、每人發起次數、拜師人數（C 類只報告）。
// 用法：npm run wuxia:social-report -- [run.json] [--seed 7 --days 9] [--trait lin-sao.ext=-1]
import { INTERACTIONS } from '../../convex/wuxia/a3_silent/data';
import { loadSocialRun, say } from './social-run';

const r = loadSocialRun();
if (!r.st) {
  say('a3-silent 沒開（或 run.json 沒有 a3 資料）');
  process.exit(1);
}
const st = r.st;
say(`# 無言互動報告：${r.label}`);
let total = 0;
for (const k of Object.keys(st.stats)) total += st.stats[k].n;
say(`共 ${total} 次互動\n`);
say('互動      次數   成功  實測率  公式率  z     判定（B：|z|≤3.29＝99.9%）');
let bad = 0;
for (const def of INTERACTIONS) {
  const s = st.stats[def.id] ?? { n: 0, ok: 0, pSum: 0, pVar: 0 };
  const z = s.pVar > 0 ? (s.ok - s.pSum) / Math.sqrt(s.pVar) : 0;
  const pass = Math.abs(z) <= 3.29;
  if (!pass) bad++;
  say(
    `${def.label.padEnd(4, '　')}  ${String(s.n).padStart(5)}  ${String(s.ok).padStart(5)}  ${s.n ? (s.ok / s.n).toFixed(3) : '  -  '}  ${s.n ? (s.pSum / s.n).toFixed(3) : '  -  '}  ${z.toFixed(2).padStart(5)}  ${s.n ? (pass ? 'OK' : '超出') : '—'}`,
  );
}
const appeared = INTERACTIONS.filter((d) => (st.stats[d.id]?.n ?? 0) > 0).length;
const greet = (st.stats.greet?.n ?? 0) / Math.max(1, total);
say(`\nC 類（只報告）：出現 ${appeared}/12 種；寒暄占 ${(greet * 100).toFixed(1)}%（目標 <50%）；拜師 ${r.disciples} 人`);
const started = Object.entries(st.started).sort((a, b) => b[1] - a[1]);
say(`每人發起：${started.map(([c, n]) => `${r.nameOf(c)} ${n}`).join('、')}`);
say(`指點時段：進行中 ${st.sessions.length}；紀錄環 ${st.log.length}/${1000}`);
say(bad ? `B 類：${bad} 種超出 99.9% 區間` : 'B 類：全部在 99.9% 區間內');
