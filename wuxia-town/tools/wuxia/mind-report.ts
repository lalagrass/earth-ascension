// 武俠小鎮 W5（#557 驗收）：心念報告。
// 用法：npm run wuxia:mind-report -- /tmp/on.json --who 阿青,周教頭 [--off /tmp/off.json] [--json out.json]
//   - 每人每個心念：出現、增強、減弱、消失的日子（寅正評估），強度，以及「因為」的記憶 id 與內容
//   - 武館重開的日子與周教頭「想重開武館」的觸發記憶
//   - 給 --off（同 seed、--off w05-mind 的 run）時：第 7–14 日阿青練功總分鐘 開 vs 關（#557「多 30% 以上」）
// 有 --off 且比較不過 → exit 1。
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from './sim';
import { MindTrace, cidOf, memoryText, nameOf } from './mind-trace';
import type { DojoTrace } from './dojo-trace';

export const MIND_RULES = { compareDays: [7, 14] as [number, number], trainMoreMin: 0.3 };

type Row = { day: number; kind: string; s: number; causes: number[] };

export function thoughtTimeline(trace: MindTrace, cid: string): Record<string, Row[]> {
  const out: Record<string, Row[]> = {};
  let prev: Record<string, number> = {};
  for (const e of trace.evals) {
    const now: Record<string, number> = {};
    for (const t of e.people[cid] ?? []) {
      now[t.name] = t.s;
      const before = prev[t.name];
      const kind = before === undefined ? '出現' : t.s > before ? '增強' : t.s < before ? '減弱' : '持平';
      if (kind !== '持平') (out[t.name] ??= []).push({ day: e.day, kind, s: t.s, causes: t.causes });
    }
    for (const name of Object.keys(prev))
      if (now[name] === undefined) (out[name] ??= []).push({ day: e.day, kind: '消失', s: 0, causes: [] });
    prev = now;
  }
  return out;
}

export function trainMinutes(dojo: DojoTrace | undefined, cid: string, [from, to]: [number, number]): number {
  let t = 0;
  for (let d = from; d <= to; d++) t += dojo?.days[d - 1]?.[cid]?.trainMinutes ?? 0;
  return t;
}

export function mindReport(on: any, who: string[], off?: any) {
  const trace = on.mind as MindTrace;
  const lines: string[] = [];
  const say = (s = '') => lines.push(s);
  const verdicts: Array<{ rule: string; ok: boolean; value: string }> = [];
  const cite = (ids: number[]) =>
    ids.map((id) => `#${id} ${trace.memories[id] ? memoryText(trace.memories[id]) : '(不在紀錄)'}`).join('；');
  say(`武館重開：${trace.dojoOpenedDay === null ? '沒有重開' : `第 ${trace.dojoOpenedDay} 日寅正（遊戲分鐘 ${trace.dojoOpenedAt}）`}`);
  for (const cid of who) {
    say('');
    say(`## ${nameOf(cid)}`);
    const tl = thoughtTimeline(trace, cid);
    if (Object.keys(tl).length === 0) say('（這段期間沒有心念）');
    for (const [name, rows] of Object.entries(tl)) {
      say(`### ${name}`);
      say('| 日 | 變化 | 強度 | 因為（記憶 id） |');
      say('|---|---|---|---|');
      for (const r of rows) say(`| ${r.day} | ${r.kind} | ${r.s} | ${r.kind === '出現' || r.kind === '增強' ? cite(r.causes) : '—'} |`);
    }
    const counts: Record<string, number> = {};
    for (const row of trace.memoryCounts) for (const [k, n] of Object.entries(row[cid] ?? {})) counts[k] = (counts[k] ?? 0) + n;
    say(`記憶（全程新寫入）：${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join('、') || '無'}；結束時環形裡 ${trace.finalMemories[cid] ?? 0} 筆`);
  }
  if (trace.dojoOpenedDay !== null) {
    const coach = thoughtTimeline(trace, 'zhou-jiaotou')['想重開武館']?.[0];
    verdicts.push({
      rule: '周教頭重開武館的日子由事件決定（「想重開武館」出現當天重開）',
      ok: !!coach && coach.day === trace.dojoOpenedDay && coach.causes.length > 0,
      value: coach ? `第 ${trace.dojoOpenedDay} 日；因為 ${cite(coach.causes)}` : '沒有「想重開武館」',
    });
  }
  if (off) {
    const [a, b] = MIND_RULES.compareDays;
    const tOn = trainMinutes(on.dojo, 'a-qing', [a, b]);
    const tOff = trainMinutes(off.dojo, 'a-qing', [a, b]);
    const ratio = tOff > 0 ? tOn / tOff - 1 : Infinity;
    verdicts.push({
      rule: `第 ${a}–${b} 日阿青練功總時數 開比關多 ${MIND_RULES.trainMoreMin * 100}% 以上`,
      ok: ratio >= MIND_RULES.trainMoreMin,
      value: `開 ${tOn} 分（${(tOn / 60).toFixed(1)} 小時）vs 關 ${tOff} 分（${(tOff / 60).toFixed(1)} 小時），多 ${(ratio * 100).toFixed(1)}%`,
    });
  }
  if (verdicts.length) {
    say('');
    say('## 驗收');
    for (const v of verdicts) say(`${v.ok ? 'PASS' : 'FAIL'} ${v.rule}：${v.value}`);
  }
  return { lines, verdicts };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args._[0];
  if (!file) throw new Error('usage: mind-report run.json --who 阿青,周教頭 [--off off.json]');
  const on = JSON.parse(readFileSync(file, 'utf8'));
  if (!on.mind?.on) throw new Error(`${file} 沒有心念紀錄：請用 wuxia:headless -- --days N（w05-mind 開）產生`);
  const off = args.off ? JSON.parse(readFileSync(String(args.off), 'utf8')) : undefined;
  const who = String(args.who ?? '阿青,周教頭').split(',').filter(Boolean).map(cidOf);
  const r = mindReport(on, who, off);
  process.stdout.write(`# 心念報告（seed ${on.seed}，${on.mind.evals.length} 次寅正評估，hash ${String(on.finalHash).slice(0, 16)}…）\n\n`);
  process.stdout.write(r.lines.join('\n') + '\n');
  if (args.json) writeFileSync(String(args.json), JSON.stringify(r, null, 2) + '\n');
  if (r.verdicts.some((v) => !v.ok)) process.exit(1);
}

if (process.argv[1]?.endsWith('mind-report.ts')) main();
