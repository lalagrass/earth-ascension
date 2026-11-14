// 武俠小鎮 A6（#581）`npm run wuxia:a6-report -- [--seeds 7,8,9,10,11] [--days 90] [--jobs 4] [--out /tmp/a6.json]`
// 預設設定（大師第 5 日進鎮、open）各 seed 跑 N 日，在 10／15／30／60／90 日取樣（taps，hash 與單獨跑到那刻相同），報告：
//   B1 第 15 日「看會的人」（有一招是看來的）平均 ≤ 4
//   B2 seed 7–11 至少 3 個在 60 日內出現「第 3 代正式傳人」（大師→甲→乙，每一環都是教）
//   C  會的人數 S 曲線（10／30／60／90 日；正式／看來／走樣各多少、最深正式代數）——只報告，不為它調數值
// 單一 seed：--seed 7 --out x.json（內部用，每個 seed 一個子行程）。
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs, quietConsole } from './sim';
import { runHeadless } from './headless';
import { ARTS, MASTER_CID, MOVE_BY_ID } from '../../convex/wuxia/a2_master/data';
import type { A2State } from '../../convex/wuxia/a2_master/data';
import { formalGenerations, generations } from '../../convex/wuxia/a2_master/lineage';

export const TAP_DAYS = [10, 15, 20, 25, 30, 40, 50, 60, 75, 90];

export type Snap = {
  day: number;
  /** 會（有一招不是開山原有）的人數 */
  learners: number;
  /** 有一招是正式教的 */
  formal: number;
  /** 只有看來的（沒有正式教的招） */
  watchOnly: number;
  /** 有一招是看來的（含後來被正式教過的前提是現在仍是 via watch） */
  anyWatch: number;
  /** 有走樣的招的人 */
  flawedPeople: number;
  /** 走樣的招數／全部學來的招數 */
  flawedMoves: number;
  allMoves: number;
  /** 最深正式代數（開山 0；大師教甲＝1、甲教乙＝2） */
  formalDepth: number;
  /** 最深代數（含看） */
  depth: number;
  /** 非大師的正式再傳紀錄累計（從不是開山的人教出去） */
  reteaches: number;
  /** 能教起勢（起勢熟練 ≥120 且非開山）的人 */
  canTeachQishi: number;
};

export function snap(st: A2State, day: number): Snap {
  const art = 'taiji';
  const people = Object.keys(st.know).filter((c) => Object.entries(st.know[c]).some(([id, k]) => MOVE_BY_ID[id]?.family === art && k.via !== 'origin'));
  let formal = 0;
  let watchOnly = 0;
  let anyWatch = 0;
  let flawedPeople = 0;
  let flawedMoves = 0;
  let allMoves = 0;
  let canTeachQishi = 0;
  for (const c of people) {
    const ks = Object.entries(st.know[c]).filter(([id, k]) => MOVE_BY_ID[id]?.family === art && k.via !== 'origin');
    if (ks.some(([, k]) => k.via === 'teach')) formal++;
    else watchOnly++;
    if (ks.some(([, k]) => k.via === 'watch')) anyWatch++;
    if (ks.some(([, k]) => k.flawed)) flawedPeople++;
    flawedMoves += ks.filter(([, k]) => k.flawed).length;
    allMoves += ks.length;
    if ((st.know[c]['taiji-qishi']?.prof ?? 0) >= 120) canTeachQishi++;
  }
  const fg = Object.values(formalGenerations(st, art));
  const g = Object.values(generations(st, art));
  const reteaches = st.records.filter((r) => r.via === 'teach' && !r.again && r.from !== MASTER_CID && MOVE_BY_ID[r.move]?.family === art).length;
  return { day, learners: people.length, formal, watchOnly, anyWatch, flawedPeople, flawedMoves, allMoves, formalDepth: Math.max(0, ...fg), depth: Math.max(0, ...g), reteaches, canTeachQishi };
}

function runOne(seed: number, days: number, out: string) {
  quietConsole(true);
  const snaps: Snap[] = [];
  const taps = TAP_DAYS.filter((d) => d <= days);
  const run = runHeadless({
    seed,
    minutes: 1,
    untilGameMinute: days * 1440,
    taps: taps.map((d) => d * 1440),
    onTap: (gm: number, t: { summary: any }) => snaps.push(snap(t.summary.a2 as A2State, gm / 1440)),
  } as any);
  const a2 = run.summary.a2 as A2State;
  // 首次出現第 3 代正式傳人的日子（由紀錄回推：某筆正式教的 from 是正式第 1 代的人，且當時整條鏈都是教）
  writeFileSync(out, JSON.stringify({ seed, days, hash: run.finalHash, snaps, daily: a2.daily.map((d) => [d.day, d.learners.taiji ?? 0]) }));
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const days = Number(args.days ?? 90);
  if (args.seed !== undefined) return runOne(Number(args.seed), days, String(args.out));
  const seeds = String(args.seeds ?? '7,8,9,10,11').split(',').map(Number);
  const jobs = Number(args.jobs ?? 4);
  const dir = mkdtempSync(join(tmpdir(), 'a6-report-'));
  const results: any[] = [];
  const queue = [...seeds];
  const worker = async () => {
    for (let s = queue.shift(); s !== undefined; s = queue.shift()) {
      const out = join(dir, `s${s}.json`);
      await new Promise<void>((res, rej) => {
        const c = spawn(process.execPath, [join(process.cwd(), 'node_modules/.bin/tsx'), 'tools/wuxia/a6-report.ts', '--seed', String(s), '--days', String(days), '--out', out], { stdio: 'ignore' });
        c.on('close', (code) => (code === 0 ? res() : rej(new Error(`seed ${s} exit ${code}`))));
      });
      results.push(JSON.parse(readFileSync(out, 'utf8')));
    }
  };
  await Promise.all(Array.from({ length: jobs }, worker));
  results.sort((a, b) => a.seed - b.seed);
  const say = (s: string) => process.stdout.write(s + '\n');
  const at = (r: any, d: number) => r.snaps.find((x: Snap) => x.day === d) as Snap | undefined;
  say(`A6 報告（預設設定：大師第 5 日進鎮、open；seeds ${seeds.join(',')}；${days} 日）`);
  say('');
  say('| seed | 日 | 會的人 | 正式 | 只看來 | 有看來 | 走樣人 | 走樣招/全部 | 最深正式代 | 最深代 | 非大師再傳 | 能教起勢 |');
  say('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results)
    for (const s of r.snaps as Snap[])
      say(`| ${r.seed} | ${s.day} | ${s.learners} | ${s.formal} | ${s.watchOnly} | ${s.anyWatch} | ${s.flawedPeople} | ${s.flawedMoves}/${s.allMoves} | ${s.formalDepth} | ${s.depth} | ${s.reteaches} | ${s.canTeachQishi} |`);
  say('');
  say('S 曲線（平均）：');
  for (const d of [10, 30, 60, 90].filter((x) => x <= days)) {
    const ss = results.map((r) => at(r, d)!).filter(Boolean);
    say(`  第 ${d} 日：會 ${mean(ss.map((s) => s.learners)).toFixed(1)} 人（正式 ${mean(ss.map((s) => s.formal)).toFixed(1)}、只看來 ${mean(ss.map((s) => s.watchOnly)).toFixed(1)}、走樣招 ${mean(ss.map((s) => s.flawedMoves)).toFixed(1)}/${mean(ss.map((s) => s.allMoves)).toFixed(1)}）、最深正式 ${mean(ss.map((s) => s.formalDepth)).toFixed(1)} 代；能教起勢 ${mean(ss.map((s) => s.canTeachQishi)).toFixed(1)} 人`);
  }
  say('  （參考目標：10 日 2–4 人，30 日 4–7 人，60 日 7–10 人，90 日 9–12 人）');
  const b1 = results.map((r) => at(r, 15)?.anyWatch ?? NaN);
  say('');
  say(`B1 第 15 日看會的人（有一招是看來的）：${results.map((r, i) => `seed ${r.seed}＝${b1[i]}`).join('、')}；平均 ${mean(b1).toFixed(2)}（預期 ≤ 4）${mean(b1) <= 4 ? 'PASS' : 'FAIL'}`);
  const b2 = results.map((r) => {
    const d = (r.snaps as Snap[]).find((s) => s.formalDepth >= 2);
    return d ? d.day : undefined;
  });
  const n60 = b2.filter((d) => d !== undefined && d <= 60).length;
  say(`B2 60 日內出現第 3 代正式傳人（大師→甲→乙）：${results.map((r, i) => `seed ${r.seed}＝${b2[i] === undefined ? '無' : `≤第 ${b2[i]} 日`}`).join('、')}；${n60}/${results.length}（預期 ≥ 3）${n60 >= 3 ? 'PASS' : 'FAIL'}`);
  if (args.out) writeFileSync(String(args.out), JSON.stringify(results, null, 2));
  void ARTS;
}

main().catch((e) => {
  process.stderr.write(String(e) + '\n');
  process.exit(1);
});
