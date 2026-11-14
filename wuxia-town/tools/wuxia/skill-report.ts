// 武俠小鎮 W4（#556 驗收）：技能報告——每人每 5 天的技能值、阿青每日練功、教頭在場／不在分開列。
// 用法：npm run wuxia:skill-report -- /tmp/d30.json [--who a-qing] [--json out.json]
// 輸入是 `wuxia:headless -- --days N --out x.json` 的輸出（summary.dojo）。不需要 Convex、LLM。
// 驗收（任一 FAIL 就 exit 1）：
//   1. 阿青第 30 日（或最後一日）的拳腳在 120–180（顯示 12.0–18.0）
//   2. 周教頭在場時增長明顯較高：同等級折算後，教頭在場的每分鐘練功量 ÷ 不在場 ≥ 1.3
import { readFileSync, writeFileSync } from 'node:fs';
import { FOLK_CHARACTERS } from '../../convex/wuxia/w02_folk';
import { SKILL_KEYS, SKILL_LABELS, TRAINING, showSkill, tierOf } from '../../convex/wuxia/w04_dojo/data';
import { parseArgs } from './sim';
import type { DojoTrace } from './dojo-trace';

export const SKILL_RULES = {
  day: 30,
  fistRange: [120, 180] as [number, number],
  coachRatioMin: 1.3,
  /** 教頭在場的日子：當日練功分鐘中教頭在場 ≥ 90% */
  coachDayFraction: 0.9,
};

const nameOf = (cid: string) => FOLK_CHARACTERS.find((c) => c.id === cid)?.name ?? cid;
const f2 = (v: number) => v.toFixed(2);

export function skillReport(trace: DojoTrace, who = 'a-qing') {
  const lines: string[] = [];
  const say = (s = '') => lines.push(s);
  const verdicts: Array<{ rule: string; ok: boolean; value: string }> = [];
  const days = trace.days.length;
  const lastFull = Math.min(SKILL_RULES.day, days);
  const marks = [1, ...Array.from({ length: Math.floor(lastFull / 5) }, (_, i) => (i + 1) * 5)].filter(
    (d) => d <= days,
  );
  const people = Object.keys(trace.final);
  const endOf = (d: number, cid: string) => trace.days[d - 1]?.[cid]?.end;

  say(`## 每人每 5 天的技能值（當日結束時；顯示 /10，括號是階級）`);
  for (const cid of people) {
    say('');
    say(`### ${nameOf(cid)}（${cid}）`);
    say(`| 技能 | ${marks.map((d) => `第 ${d} 日`).join(' | ')} |`);
    say(`|---|${marks.map(() => '---:').join('|')}|`);
    for (const k of SKILL_KEYS) {
      const cells = marks.map((d) => {
        const e = endOf(d, cid);
        return e ? showSkill(e[k]) + (k === 'fist' ? `（${tierOf(e[k]).name}）` : '') : '-';
      });
      say(`| ${SKILL_LABELS[k]} | ${cells.join(' | ')} |`);
    }
    const trained = trace.days.reduce((n, day) => n + (day[cid]?.trainMinutes ?? 0), 0);
    say(`練功共 ${trained} 遊戲分鐘（${days} 日，平均每日 ${(trained / Math.max(1, lastFull)).toFixed(0)} 分）`);
  }

  say('');
  say(`## ${nameOf(who)} 每日練功（拳腳；教頭在場＝周教頭在武館、醒著、不在對話）`);
  say('| 日 | 練功分 | 教頭在場分 | 拳腳增加 | 其中教頭在場時 | 日終拳腳 | 階級 | 打樁數/分 |');
  say('|---:|---:|---:|---:|---:|---:|---|---:|');
  const coachDays: number[] = [];
  const otherDays: number[] = [];
  let effortCoach = 0;
  let effortSolo = 0;
  let minCoach = 0;
  let minSolo = 0;
  for (let d = 1; d <= lastFull; d++) {
    const r = trace.days[d - 1]?.[who];
    if (!r) continue;
    const fist = r.end.fist;
    say(
      `| ${d} | ${r.trainMinutes} | ${r.coachMinutes} | ${f2(r.gain.fist)} | ${f2(r.coachGain.fist)} | ${showSkill(fist)} | ${tierOf(fist).name} | ${Math.floor(TRAINING.strikes.base + fist / TRAINING.strikes.per)} |`,
    );
    if (r.trainMinutes > 0) {
      if (r.coachMinutes / r.trainMinutes >= SKILL_RULES.coachDayFraction) coachDays.push(d);
      else otherDays.push(d);
    }
    effortCoach += r.effort.coach;
    effortSolo += r.effort.solo;
    minCoach += r.coachMinutes;
    minSolo += r.trainMinutes - r.coachMinutes;
  }

  const dayStats = (ds: number[]) => {
    let min = 0;
    let gain = 0;
    let eff = 0;
    for (const d of ds) {
      const r = trace.days[d - 1][who];
      min += r.trainMinutes;
      gain += r.gain.fist;
      eff += r.effort.coach + r.effort.solo;
    }
    return { n: ds.length, min, gain, perMin: min ? gain / min : 0, effPerMin: min ? eff / min : 0 };
  };
  const cd = dayStats(coachDays);
  const od = dayStats(otherDays);
  say('');
  say(`## 教頭在場 vs 不在（分開列）`);
  say(`### 依日子（教頭在場的日子＝當日練功時間 ≥ ${SKILL_RULES.coachDayFraction * 100}% 有教頭在場）`);
  say('| | 天數 | 練功分 | 拳腳增加 | 每練功分鐘拳腳增加 | 同等級折算每分鐘練功量 |');
  say('|---|---:|---:|---:|---:|---:|');
  say(`| 教頭在場的日子 | ${cd.n} | ${cd.min} | ${f2(cd.gain)} | ${cd.perMin.toFixed(4)} | ${cd.effPerMin.toFixed(5)} |`);
  say(`| 教頭有缺席的日子 | ${od.n} | ${od.min} | ${f2(od.gain)} | ${od.perMin.toFixed(4)} | ${od.effPerMin.toFixed(5)} |`);
  say(`在場的日子：${coachDays.join(', ') || '無'}`);
  say(`有缺席的日子：${otherDays.join(', ') || '無'}`);
  const perCoach = minCoach ? effortCoach / minCoach : 0;
  const perSolo = minSolo ? effortSolo / minSolo : 0;
  const ratio = perSolo ? perCoach / perSolo : Infinity;
  say('');
  say(`### 依分鐘（同等級折算：每分鐘拳腳增加 ÷ (1−拳腳/1000)^2）`);
  say(`- 教頭在場：${minCoach} 分，每分鐘練功量 ${perCoach.toFixed(5)}（理論 base×1.5 = ${(TRAINING.base * TRAINING.coachBonus).toFixed(5)}）`);
  say(`- 教頭不在：${minSolo} 分，每分鐘練功量 ${perSolo.toFixed(5)}（理論 base = ${TRAINING.base.toFixed(5)}）`);
  say(`- 在場 ÷ 不在 = ${Number.isFinite(ratio) ? ratio.toFixed(2) : '∞'}`);

  const end = endOf(lastFull, who);
  const fist = end?.fist ?? 0;
  verdicts.push({
    rule: `${nameOf(who)}第 ${lastFull} 日拳腳在 ${SKILL_RULES.fistRange[0]}–${SKILL_RULES.fistRange[1]}`,
    ok: lastFull === SKILL_RULES.day && fist >= SKILL_RULES.fistRange[0] && fist <= SKILL_RULES.fistRange[1],
    value: `${fist}（顯示 ${showSkill(fist)}，${tierOf(fist).name}）`,
  });
  verdicts.push({
    rule: `周教頭在場時增長明顯較高（同等級折算每分鐘 在場÷不在 ≥ ${SKILL_RULES.coachRatioMin}）`,
    ok: minSolo > 0 && minCoach > 0 && ratio >= SKILL_RULES.coachRatioMin,
    value: `${Number.isFinite(ratio) ? ratio.toFixed(2) : '∞'}（在場 ${minCoach} 分、不在 ${minSolo} 分；依日子 ${cd.n} 天 ${cd.perMin.toFixed(4)}/分 vs ${od.n} 天 ${od.perMin.toFixed(4)}/分）`,
  });
  say('');
  say('## 驗收');
  for (const v of verdicts) say(`${v.ok ? 'PASS' : 'FAIL'} ${v.rule}：${v.value}`);
  return { lines, verdicts, ratio, coachDays, otherDays, fist };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args._[0];
  if (!file) throw new Error('usage: skill-report run.json [--who a-qing]');
  const summary = JSON.parse(readFileSync(file, 'utf8'));
  const trace = summary.dojo as DojoTrace | undefined;
  if (!trace) throw new Error(`${file} 沒有練功紀錄：請用 wuxia:headless -- --days N（w04-dojo 開）產生`);
  const r = skillReport(trace, String(args.who ?? 'a-qing'));
  process.stdout.write(
    `# 技能報告（seed ${summary.seed}，${trace.days.length - (trace.days.length > 30 ? 1 : 0)} 日，hash ${summary.finalHash.slice(0, 16)}…）\n\n`,
  );
  process.stdout.write(r.lines.join('\n') + '\n');
  if (args.json) writeFileSync(String(args.json), JSON.stringify(r, null, 2) + '\n');
  if (r.verdicts.some((v) => !v.ok)) process.exit(1);
}

if (process.argv[1]?.endsWith('skill-report.ts')) main();
