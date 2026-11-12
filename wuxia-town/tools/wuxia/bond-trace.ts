// 武俠小鎮 W7（#559 驗收「三軸可追溯」）：某人對某人某一軸的值，以及貢獻最大的 5 筆記憶。
// 用法：npm run wuxia:bond-trace -- /tmp/b.json --a 阿青 --b 周教頭 --axis respect [--day 45] [--n 5]
//   用 run 裡最後的記憶，照 convex/wuxia/w07_bond/data.ts 的 contributions() 重算（跟引擎同一支函式），
//   並跟引擎在那天寅初快取的值（summary.bond.days）對照，兩者必須相同（不同 exit 1）。
//   --day 不給＝最後一次重算的那天。
import { readFileSync } from 'node:fs';
import { parseArgs } from './sim';
import { cidOf, nameOf, memoryText } from './mind-trace';
import { DAY_START_MINUTE, readClock } from '../../convex/wuxia/clock';
import { AXES, AXIS_LABELS, Axis, BONDS, contributions, sumBond, topContributions } from '../../convex/wuxia/w07_bond/data';
import type { MindPerson } from '../../convex/wuxia/w05_mind/data';
import type { BondTrace } from './bond-tracer';

export function bondTrace(run: any, a: string, b: string, axis: Axis, day?: number, n = BONDS.trace) {
  const lines: string[] = [];
  const say = (s = '') => lines.push(s);
  const trace = run.bond as BondTrace | undefined;
  if (!trace?.final) throw new Error('run 裡沒有 w07-bond 資料（要用 --days 跑、w07-bond 要開）');
  const st = trace.final.state;
  const d = day ?? st.evalDay;
  // 第 d 日寅初（重算關係的時間）
  const gm = (d - 1) * 1440 + BONDS.evalMinuteOfDay - DAY_START_MINUTE;
  const ca = cidOf(a);
  const cb = cidOf(b);
  const memories = (trace.final.memories[ca] ?? []).filter((m) => m.t <= gm);
  const person: MindPerson = { cid: ca, memories, thoughts: [], places: [], trainMin: 0 };
  // 師兄弟只算當時已入門的
  const disciples = Object.fromEntries(Object.entries(st.disciples).filter(([, x]) => x.since <= gm));
  const cs = contributions(person, ca, cb, gm, { ...st, disciples });
  const bond = sumBond(cs);
  const cached = trace.days[d - 1]?.[ca]?.[cb];
  say(`# ${nameOf(ca)} 對 ${nameOf(cb)} 的${AXIS_LABELS[axis]}（第 ${d} 日寅初重算，seed ${run.seed}，hash ${String(run.finalHash).slice(0, 16)}…）`);
  say(`值：${bond[axis]}（三軸 ${AXES.map((x) => `${AXIS_LABELS[x]} ${bond[x]}`).join('、')}）`);
  say(`引擎快取：${cached ? AXES.map((x) => `${AXIS_LABELS[x]} ${cached[x]}`).join('、') : '（那天沒有快取）'}`);
  const memoryPart = cs.filter((c) => c.memory);
  const total = memoryPart.reduce((s, c) => s + (c.delta[axis] ?? 0), 0);
  say(
    `近 ${BONDS.windowDays} 日裡影響${AXIS_LABELS[axis]}的記憶 ${memoryPart.filter((c) => (c.delta[axis] ?? 0) !== 0).length} 筆，合計 ${total.toFixed(2)}；固定項 ${cs
      .filter((c) => !c.memory)
      .map((c) => `${c.label} ${c.delta[axis] ?? 0}`)
      .join('、') || '無'}`,
  );
  say();
  say(`## 貢獻最大的 ${n} 筆記憶`);
  const top = topContributions(memoryPart, axis, n);
  top.forEach((c, i) => {
    const m = c.memory!;
    const age = ((gm - m.t) / 1440).toFixed(1);
    say(`${i + 1}. #${m.id} ${memoryText(m)}：${AXIS_LABELS[axis]} ${(c.delta[axis]! >= 0 ? '+' : '') + c.delta[axis]!.toFixed(2)}（${age} 日前，衰減 ×${Math.pow(BONDS.decayPerDay, (gm - m.t) / 1440).toFixed(3)}）`);
  });
  const match = !cached || AXES.every((x) => cached[x] === bond[x]);
  return { lines, bond, cached, top, match, ok: top.length > 0 && match };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = String(args._?.[0] ?? '/tmp/b.json');
  const run = JSON.parse(readFileSync(file, 'utf8'));
  const axis = String(args.axis ?? 'respect') as Axis;
  if (!AXES.includes(axis)) throw new Error(`--axis 只能是 ${AXES.join('、')}`);
  const r = bondTrace(run, String(args.a ?? '阿青'), String(args.b ?? '周教頭'), axis, args.day === undefined ? undefined : Number(args.day), Number(args.n ?? BONDS.trace));
  for (const l of r.lines) process.stdout.write(l + '\n');
  process.stdout.write(`\n${r.match ? 'PASS' : 'FAIL'} 重算值與引擎快取相同\n`);
  process.stdout.write(`${r.top.length > 0 ? 'PASS' : 'FAIL'} 列出貢獻最大的記憶（${r.top.length} 筆）\n`);
  if (!r.ok) process.exit(1);
}

if (process.argv[1] && /bond-trace\.ts$/.test(process.argv[1])) main();
void readClock;
