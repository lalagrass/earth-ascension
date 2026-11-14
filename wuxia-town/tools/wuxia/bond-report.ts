// 武俠小鎮 W7（#559 驗收）：關係與拜師報告。
// 用法：npm run wuxia:headless -- --seed 7 --days 45 --out /tmp/b.json && npm run wuxia:bond-report -- /tmp/b.json --day 45
//        [--json out.json]
//   - 武館：名號、掛匾日、師父、弟子名單、入門日
//   - 拜師紀錄：哪一天、誰拜誰、同意與否（規則理由）、心念「想拜師」的觸發記憶（全文）、當時的敬重／親近
//   - 練功：拜師前後，同樣多的「師父在場練功分鐘」裡拳腳增加多少（拜師前取最後 N 分、拜師後取最前 N 分，N＝兩邊較少的）
//   - 門規違規、第 --day 日（寅初重算後）的關係表
// 判定不過 exit 1。
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from './sim';
import { nameOf, memoryText } from './mind-trace';
import { readClock } from '../../convex/wuxia/clock';
import { AXES, AXIS_LABELS, RULE_BY_ID, type BowRecord } from '../../convex/wuxia/w07_bond/data';
import type { BondTrace } from './bond-tracer';

const hhmm = (gm: number) => {
  const c = readClock(gm);
  return `第 ${c.day} 日 ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
};

export type Verdict = { rule: string; ok: boolean; value: string };

/** 拜師前後同樣多的師父在場練功分鐘裡，拳腳增加多少。 */
/** 相鄰窗：拜師前最後 N 分 vs 拜師後最前 N 分（N 再被兩邊較少的截短）。三個都要後 > 前。 */
export const ADJACENT_WINDOWS = [300, 600, 1200];

export function trainCompare(trace: BondTrace, ev: BowRecord, cap?: number) {
  const rows = (trace.train[ev.disciple] ?? []).filter((r) => r[3].includes(ev.master));
  const before = rows.filter((r) => r[0] < ev.gm);
  const after = rows.filter((r) => r[0] > ev.gm);
  const n = Math.min(before.length, after.length, cap ?? Infinity);
  const b = before.slice(before.length - n);
  const a = after.slice(0, n);
  const sum = (xs: typeof rows, i: 1 | 2) => Math.round(xs.reduce((s, r) => s + r[i], 0) * 1000) / 1000;
  return {
    n,
    beforeAll: before.length,
    afterAll: after.length,
    beforeGain: sum(b, 1),
    afterGain: sum(a, 1),
    beforeEffort: sum(b, 2),
    afterEffort: sum(a, 2),
    beforeDays: b.length ? [readClock(b[0][0]).day, readClock(b[b.length - 1][0]).day] : [],
    afterDays: a.length ? [readClock(a[0][0]).day, readClock(a[a.length - 1][0]).day] : [],
  };
}

export function bondReport(run: any, day?: number) {
  const lines: string[] = [];
  const say = (s = '') => lines.push(s);
  const verdicts: Verdict[] = [];
  const trace = run.bond as BondTrace | undefined;
  const days = run.life?.days ?? Math.ceil((run.clock?.gameMinute ?? 0) / 1440);
  say(`# 關係與拜師報告（seed ${run.seed}，${days} 日，hash ${String(run.finalHash).slice(0, 16)}…）`);
  if (!trace?.final) {
    say('w07-bond 沒開（或沒有 --days），沒有資料。');
    verdicts.push({ rule: `${days} 日內發生拜師`, ok: false, value: '沒有 w07-bond 資料' });
    return { lines, verdicts, events: [] as BowRecord[] };
  }
  const st = trace.final.state;
  const events = st.events;
  const accepted = events.filter((e) => e.accepted);
  say();
  say('## 武館');
  if (st.dojoName) say(`- 名號：${st.dojoName}（${hhmm(st.plaqueAt!)} 掛匾）`);
  else say('- 還沒掛匾（周教頭還沒收徒）');
  const masters = [...new Set(Object.values(st.disciples).map((d) => d.master))].sort();
  for (const m of masters) {
    const ds = Object.entries(st.disciples)
      .filter(([, d]) => d.master === m)
      .sort((a, b) => a[1].order - b[1].order);
    say(`- 師父 ${nameOf(m)}：弟子 ${ds.map(([c, d]) => `${nameOf(c)}（第 ${d.day} 日入門，第 ${d.order} 個）`).join('、')}`);
  }
  say();
  say('## 拜師紀錄');
  if (events.length === 0) say('（沒有）');
  for (const e of events) {
    say(`- ${hhmm(e.gm)} ${nameOf(e.disciple)} 拜 ${nameOf(e.master)} 為師：${e.accepted ? '收下' : '拒絕'}（${e.reason}）`);
    say(`  當時 ${nameOf(e.disciple)} 對 ${nameOf(e.master)} 敬重 ${e.respect}、${nameOf(e.master)} 對 ${nameOf(e.disciple)} 親近 ${e.close}；寫入記憶 ${Object.entries(e.memories).map(([c, id]) => `${nameOf(c)} #${id}`).join('、')}`);
    const causes = trace.causes[e.id] ?? [];
    say(`  觸發記憶（心念「想拜師」的因為）：${causes.length ? causes.map((m) => `#${m.id} ${memoryText(m)}`).join('；') : '（無）'}`);
  }
  verdicts.push({
    rule: `${days} 日內發生拜師`,
    ok: accepted.length > 0,
    value: accepted.length ? accepted.map((e) => `第 ${e.day} 日 ${nameOf(e.disciple)} → ${nameOf(e.master)}`).join('、') : '沒有',
  });
  verdicts.push({
    rule: '報告列出拜師日與觸發記憶',
    ok: accepted.length > 0 && accepted.every((e) => (trace.causes[e.id] ?? []).length > 0),
    value: accepted.map((e) => `第 ${e.day} 日：${(trace.causes[e.id] ?? []).map((m) => `#${m.id}`).join(' ')}`).join('；') || '沒有',
  });
  say();
  say('## 拜師前後練功（同樣多的師父在場練功分鐘）');
  const cmp = accepted.map((e) => ({ e, c: trainCompare(trace, e) }));
  for (const { e, c } of cmp) {
    say(
      `- ${nameOf(e.disciple)}（師父 ${nameOf(e.master)}）：師父在場練功 拜師前 ${c.beforeAll} 分、拜師後 ${c.afterAll} 分，各取 N=${c.n} 分比較`,
    );
    if (c.n > 0) {
      say(
        `  拜師前（第 ${c.beforeDays.join('–')} 日最後 ${c.n} 分）拳腳 +${c.beforeGain}（每分 ${(c.beforeGain / c.n).toFixed(4)}；同等級折算 ${(c.beforeEffort / c.n).toFixed(4)}）`,
      );
      say(
        `  拜師後（第 ${c.afterDays.join('–')} 日最前 ${c.n} 分）拳腳 +${c.afterGain}（每分 ${(c.afterGain / c.n).toFixed(4)}；同等級折算 ${(c.afterEffort / c.n).toFixed(4)}）`,
      );
    }
  }
  // W7-9（D8）：拳腳增長是 (1 − L/1000)^2 遞減，全期（N 動輒 2500 分、跨 2–3 週）的原始增長會被「拜師後等級較高」吃掉，
  // 量不出拜師的效果。判定改成兩件都要過：
  //   (1) 相鄰窗：拜師前最後 N 分 vs 拜師後最前 N 分，N＝300／600／1200 三個都要後 > 前（原始拳腳增長）；
  //   (2) 全期 N＝兩邊較少的：同等級折算（每分增長 ÷ (1 − L/1000)^2）後 > 前。
  // 全期原始增長照樣列出（資訊），不隱藏。
  for (const { e } of cmp) {
    const parts = ADJACENT_WINDOWS.map((w) => {
      const c = trainCompare(trace, e, w);
      return `N=${c.n}：前 +${c.beforeGain} → 後 +${c.afterGain}`;
    });
    say(`  相鄰窗（原始增長）${parts.join('；')}`);
  }
  const evaluable = cmp.filter((x) => x.c.n >= 60);
  verdicts.push({
    rule: '拜師後弟子練功增長高於拜師前（同師父在場時數下比較；相鄰窗 N=300／600／1200 原始增長）',
    ok:
      evaluable.length > 0 &&
      evaluable.every((x) =>
        ADJACENT_WINDOWS.every((w) => {
          const c = trainCompare(trace, x.e, w);
          return c.n >= 60 && c.afterGain > c.beforeGain;
        }),
      ),
    value:
      evaluable
        .map(
          (x) =>
            `${nameOf(x.e.disciple)} ` +
            ADJACENT_WINDOWS.map((w) => {
              const c = trainCompare(trace, x.e, w);
              return `N=${c.n}：+${c.beforeGain}→+${c.afterGain}`;
            }).join('；'),
        )
        .join('；') || '沒有可比較的拜師（N < 60 分）',
  });
  verdicts.push({
    rule: '拜師後弟子練功增長高於拜師前（全期同等級折算）',
    ok: evaluable.length > 0 && evaluable.every((x) => x.c.afterEffort > x.c.beforeEffort),
    value:
      evaluable
        .map(
          (x) =>
            `${nameOf(x.e.disciple)} N=${x.c.n} 分：每分 ${(x.c.beforeEffort / x.c.n).toFixed(4)} → ${(x.c.afterEffort / x.c.n).toFixed(4)}（資訊：全期原始 +${x.c.beforeGain} → +${x.c.afterGain}）`,
        )
        .join('；') || '沒有可比較的拜師（N < 60 分）',
  });
  say();
  say('## 門規違規');
  if (st.violations.length === 0) say('（沒有）');
  for (const v of st.violations)
    say(`- ${hhmm(v.gm)} ${nameOf(v.disciple)} 犯「${RULE_BY_ID[v.rule]?.name ?? v.rule}」（師父 ${nameOf(v.master)}）記憶 ${Object.entries(v.memories).map(([c, id]) => `${nameOf(c)} #${id}`).join('、')}`);
  const d = Math.min(day ?? trace.days.length, trace.days.length);
  let snap = trace.days[d - 1];
  let at = d;
  while (!snap && at > 1) snap = trace.days[--at - 1];
  say();
  say(`## 第 ${at} 日關係（寅初重算；A 對 B：${AXES.map((a) => AXIS_LABELS[a]).join('／')}，只列有一軸不是 0 的）`);
  if (snap) {
    for (const a of Object.keys(snap).sort()) {
      for (const b of Object.keys(snap[a]).sort()) {
        const v = snap[a][b];
        if (AXES.every((x) => v[x] === 0)) continue;
        say(`- ${nameOf(a)} → ${nameOf(b)}：${AXES.map((x) => `${AXIS_LABELS[x]} ${v[x]}`).join('、')}`);
      }
    }
  }
  return { lines, verdicts, events };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = String(args._?.[0] ?? args.in ?? '/tmp/b.json');
  const run = JSON.parse(readFileSync(file, 'utf8'));
  const r = bondReport(run, args.day === undefined ? undefined : Number(args.day));
  for (const l of r.lines) process.stdout.write(l + '\n');
  process.stdout.write('\n## 判定\n');
  for (const v of r.verdicts) process.stdout.write(`${v.ok ? 'PASS' : 'FAIL'} ${v.rule}：${v.value}\n`);
  if (args.json) writeFileSync(String(args.json), JSON.stringify(r, null, 2) + '\n');
  if (r.verdicts.some((v) => !v.ok)) process.exit(1);
}

if (process.argv[1] && /bond-report\.ts$/.test(process.argv[1])) main();
