// 武俠小鎮 W6（#558 驗收）：只跑判定，不跑小鎮。
// 用法：npm run wuxia:spar-sim -- --a 周教頭 --b 阿青 --n 200 --seed 7
//        [--a-skills fist=150,stance=60,stamina=40]（覆寫起始技能，沒寫的項目用 characters.json）
//        [--sweep]（加跑「相近」掃描：其他技能相同、拳腳差 0–49，每格 --sweep-n 場，雙方各當一次發起人；
//                  以及「強對弱」掃描：拳腳差 300／400／600，強者勝率 > 90%）
//        [--json out.json]
// a 是發起人；先手照引擎一樣用亂數擲（spar.json firstAttacker=coin）。只用 seed 的亂數，同 seed 結果相同。
// 判定：實力差距大（任一方拳腳高 300 以上）時強者勝率 > 90%；--sweep 的每一格 40–60%。不符 exit 1。
import { writeFileSync } from 'node:fs';
import { parseArgs } from './sim';
import { makeRng } from '../../convex/wuxia/rng';
import { Fighter, SPAR, boutOutcome, runBout } from '../../convex/wuxia/w06_spar/duel';
import { initialSkills, SKILL_KEYS } from '../../convex/wuxia/w04_dojo/data';
import { cidOf, nameOf } from './mind-trace';

export const SPAR_SIM_RULES = { strongGap: 300, strongMin: 0.9, closeGap: 50, closeMin: 0.4, closeMax: 0.6 };

export function parseSkills(cid: string, override?: string): Fighter {
  const s = initialSkills(cid) as Fighter;
  if (override) {
    for (const kv of override.split(',')) {
      const [k, v] = kv.split('=');
      if (!(SKILL_KEYS as readonly string[]).includes(k)) throw new Error(`不認得的技能 ${k}`);
      (s as any)[k] = Number(v);
    }
  }
  return s;
}

export type SimResult = { n: number; aWin: number; bWin: number; draw: number; avgRounds: number; firstA: number };

export function simulate(a: Fighter, b: Fighter, n: number, seed: number): SimResult {
  const rng = makeRng(seed);
  let aWin = 0;
  let bWin = 0;
  let draw = 0;
  let rounds = 0;
  let firstA = 0;
  for (let i = 0; i < n; i++) {
    const bout = runBout(a, b, rng);
    const o = boutOutcome(bout);
    if (bout.log[0]?.att === 0) firstA++;
    if (o.winner === 0) aWin++;
    else if (o.winner === 1) bWin++;
    else draw++;
    rounds += o.rounds;
  }
  return { n, aWin, bWin, draw, avgRounds: Math.round((rounds / n) * 100) / 100, firstA };
}

export function sweep(n: number, seed: number) {
  const rows: Array<{ gap: number; lowAsA: number; lowAsB: number; ok: boolean }> = [];
  for (const gap of [0, 10, 20, 30, 40, 49]) {
    const low: Fighter = { fist: 100, power: 50, stance: 50, stamina: 50 };
    const high: Fighter = { ...low, fist: 100 + gap };
    const r1 = simulate(low, high, n, seed + gap);
    const r2 = simulate(high, low, n, seed + 100 + gap);
    const lowAsA = r1.aWin / n;
    const lowAsB = r2.bWin / n;
    const ok = [lowAsA, lowAsB].every((x) => x >= SPAR_SIM_RULES.closeMin && x <= SPAR_SIM_RULES.closeMax);
    rows.push({ gap, lowAsA, lowAsB, ok });
  }
  return rows;
}

/** 「強對弱」掃描：其他技能相同，拳腳差 300（雙方肯切磋的上限，spar.json agreeFistGap）以上，強者勝率 > 90%。 */
export function strongSweep(n: number, seed: number) {
  const rows: Array<{ gap: number; highAsA: number; highAsB: number; ok: boolean }> = [];
  for (const gap of [300, 400, 600]) {
    const low: Fighter = { fist: 100, power: 50, stance: 50, stamina: 50 };
    const high: Fighter = { ...low, fist: 100 + gap };
    const r1 = simulate(high, low, n, seed + 1000 + gap);
    const r2 = simulate(low, high, n, seed + 2000 + gap);
    const highAsA = r1.aWin / n;
    const highAsB = r2.bWin / n;
    rows.push({ gap, highAsA, highAsB, ok: highAsA > SPAR_SIM_RULES.strongMin && highAsB > SPAR_SIM_RULES.strongMin });
  }
  return rows;
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  const ca = cidOf(String(args.a ?? '周教頭'));
  const cb = cidOf(String(args.b ?? '阿青'));
  const n = Number(args.n ?? 200);
  const seed = Number(args.seed ?? 7);
  const a = parseSkills(ca, args['a-skills'] ? String(args['a-skills']) : undefined);
  const b = parseSkills(cb, args['b-skills'] ? String(args['b-skills']) : undefined);
  const r = simulate(a, b, n, seed);
  let fails = 0;
  const lines: string[] = [];
  const say = (s = '') => lines.push(s);
  say(`spar-sim seed ${seed}，${n} 場（判定 ${SPAR.reaction.div === 600 ? '原式' : `分母 ${SPAR.reaction.div}`}，先手擲亂數）`);
  say(`${nameOf(ca)}（發起）${JSON.stringify(a)}`);
  say(`${nameOf(cb)}　　　　${JSON.stringify(b)}`);
  say(`${nameOf(ca)} 勝 ${r.aWin}（${pct(r.aWin / n)}）／${nameOf(cb)} 勝 ${r.bWin}（${pct(r.bWin / n)}）／平手 ${r.draw}（${pct(r.draw / n)}）`);
  say(`平均回合 ${r.avgRounds}；${nameOf(ca)} 先手 ${r.firstA} 場`);
  const gap = a.fist - b.fist;
  if (Math.abs(gap) >= SPAR_SIM_RULES.strongGap) {
    const strong = gap > 0 ? r.aWin / n : r.bWin / n;
    const ok = strong > SPAR_SIM_RULES.strongMin;
    if (!ok) fails++;
    say(`${ok ? 'PASS' : 'FAIL'} 實力差距大（拳腳差 ${Math.abs(gap)}）：強者勝率 ${pct(strong)} > 90%`);
  } else if (Math.abs(gap) < SPAR_SIM_RULES.closeGap) {
    const rate = r.aWin / n;
    const ok = rate >= SPAR_SIM_RULES.closeMin && rate <= SPAR_SIM_RULES.closeMax;
    say(`${ok ? 'PASS' : 'INFO'} 拳腳差 ${Math.abs(gap)} < 50：${nameOf(ca)} 勝率 ${pct(rate)}（40–60%；其他技能不同時只列出，不判定）`);
  }
  let rows: ReturnType<typeof sweep> | undefined;
  let strong: ReturnType<typeof strongSweep> | undefined;
  if (args.sweep) {
    const sn = Number(args['sweep-n'] ?? 2000);
    rows = sweep(sn, seed);
    say('');
    say(`相近掃描（其他技能相同：力 50、下盤 50、耐力 50；弱方拳腳 100；每格 ${sn} 場 × 2）`);
    say('拳腳差 | 弱方發起的勝率 | 弱方被邀的勝率 | 判定');
    for (const row of rows) {
      if (!row.ok) fails++;
      say(`${String(row.gap).padStart(6)} | ${pct(row.lowAsA).padStart(14)} | ${pct(row.lowAsB).padStart(14)} | ${row.ok ? 'PASS' : 'FAIL'} 40–60%`);
    }
    strong = strongSweep(sn, seed);
    say('');
    say(`強對弱掃描（其他技能相同；弱方拳腳 100；每格 ${sn} 場 × 2）`);
    say('拳腳差 | 強方發起的勝率 | 強方被邀的勝率 | 判定');
    for (const row of strong) {
      if (!row.ok) fails++;
      say(`${String(row.gap).padStart(6)} | ${pct(row.highAsA).padStart(14)} | ${pct(row.highAsB).padStart(14)} | ${row.ok ? 'PASS' : 'FAIL'} > 90%`);
    }
  }
  say(fails ? `spar-sim: ${fails} 項 FAIL` : 'spar-sim: PASS');
  process.stdout.write(lines.join('\n') + '\n');
  if (args.json) writeFileSync(String(args.json), JSON.stringify({ seed, n, a, b, ca, cb, result: r, sweep: rows, strongSweep: strong }, null, 2) + '\n');
  if (fails) process.exit(1);
}

if (process.argv[1]?.endsWith('spar-sim.ts')) main();
