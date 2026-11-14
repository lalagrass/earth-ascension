// 武俠小鎮 A7（#584）`npm run wuxia:a7-report -- [--seeds 7,8,9,10,11] [--days 90] [--jobs 4] [--out /tmp/a7.json]`
// 預設設定（大師第 5 日進鎮、open）各 seed 跑 N 日，10／30／60／90 日取樣，報告：
//   B1 每個 seed 60 日內至少一人以工代學（做滿過一天雜務）  B2 60 日內沒有人錢袋長期為負（錢不能為負；另列歸零的人數）
//   C  S 曲線、付束脩／以工代學／只看各幾人、錢帳守恆（逐日誤差）、水缸柴堆見底的日數——只報告，不為它調數值
// 單一 seed：--seed 7 --out x.json（內部用，每個 seed 一個子行程）。三劇本 × 不干預／照腳本用 wuxia:scenario-report。
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs, quietConsole } from './sim';
import { runHeadless } from './headless';
import { Snap, snap } from './a6-report';
import type { A2State } from '../../convex/wuxia/a2_master/data';
import type { A7State } from '../../convex/wuxia/a7_tuition/data';
import { COACH_CID, MASTER_CID, MOVE_BY_ID } from '../../convex/wuxia/a2_master/data';
import { choreDone, paidTeachers, totalPurse } from '../../convex/wuxia/a7_tuition';
import type { LifeState } from '../../convex/wuxia/w03_life';

type A7Snap = {
  day: number;
  /** 今天還在效期內的付束脩學生（不含兩位師父） */
  paidNow: number;
  /** 今天做滿雜務的人 */
  workNow: number;
  /** 學會至少一招（非開山）的人裡：付束脩學的／以工代學學的／只有看來的（沒正式學過） */
  learnPaid: number;
  learnWork: number;
  learnLook: number;
  /** 累計付束脩次數、累計以工代學的人日（做滿雜務）、接濟 */
  payCount: number;
  workDays: number;
  aidCount: number;
  stock: { water: number; wood: number };
  purseTotal: number;
  minPurse: number;
  zeroPurse: number;
  masterPurse: number;
  coachPurse: number;
  err: number;
};

function a7Snap(game: any, day: number): A7Snap | undefined {
  const w = game.world.wuxia;
  const st = w.elements['a7-tuition'] as A7State | undefined;
  const a2 = w.elements['a2-master'] as A2State | undefined;
  const life = w.elements['w03-life'] as LifeState | undefined;
  if (!st || !a2 || !life) return undefined;
  const ppl = Object.keys(st.purse).filter((c) => c !== MASTER_CID && c !== COACH_CID);
  let learnPaid = 0;
  let learnWork = 0;
  let learnLook = 0;
  for (const cid of Object.keys(a2.know)) {
    const ks = Object.entries(a2.know[cid]).filter(([id, k]) => MOVE_BY_ID[id]?.family === 'taiji' && k.via !== 'origin');
    if (!ks.length) continue;
    const how = ks.map(([id]) => st.learned[`${cid}|${id}`]);
    const paid = how.includes('paid');
    const work = how.includes('work');
    if (paid) learnPaid++;
    if (work) learnWork++;
    if (!paid && !work) learnLook++;
  }
  const vals = Object.values(st.purse);
  const stock = life.stock.dojo ?? { water: 0, wood: 0 };
  return {
    day,
    paidNow: ppl.filter((c) => paidTeachers(st, c, day).length > 0).length,
    workNow: ppl.filter((c) => choreDone(st, c, day)).length,
    learnPaid,
    learnWork,
    learnLook,
    payCount: st.log.filter((l) => l.kind === 'pay').length,
    workDays: st.log.filter((l) => l.kind === 'work').length,
    aidCount: st.log.filter((l) => l.kind === 'aid').length,
    stock: { water: stock.water, wood: stock.wood },
    purseTotal: totalPurse(st),
    minPurse: Math.min(...vals),
    zeroPurse: ppl.filter((c) => st.purse[c] === 0).length,
    masterPurse: st.purse[MASTER_CID] ?? 0,
    coachPurse: st.purse[COACH_CID] ?? 0,
    err: Math.max(0, ...st.ledger.map((l) => Math.abs(l.err))),
  };
}

function runOne(seed: number, days: number, out: string) {
  quietConsole(false);
  const snaps: Array<{ a6: Snap; a7?: A7Snap }> = [];
  let gameRef: any;
  let lastDay = 0;
  let negDays = 0;
  let minEver = Infinity;
  let firstWork: number | undefined;
  let emptyDays = 0;
  let lastEmpty = -1;
  const taps = [10, 15, 20, 30, 40, 50, 60, 75, 90].filter((d) => d <= days);
  const run = runHeadless({
    seed,
    minutes: 1,
    untilGameMinute: days * 1440,
    taps: taps.map((d) => d * 1440),
    onStep: (game: any) => {
      gameRef = game;
      const w = game.world.wuxia;
      const st = w.elements['a7-tuition'] as A7State | undefined;
      if (!st || st.day === lastDay) return;
      lastDay = st.day;
      const vals = Object.values(st.purse);
      if (vals.length) {
        const m = Math.min(...vals);
        minEver = Math.min(minEver, m);
        if (m < 0) negDays++;
      }
      if (firstWork === undefined && st.log.some((l) => l.kind === 'work')) firstWork = st.log.find((l) => l.kind === 'work')!.day;
      if (st.fetchDay === st.day && lastEmpty !== st.day) {
        lastEmpty = st.day;
        emptyDays++;
      }
    },
    onTap: (gm: number, t: { summary: any }) => {
      const day = gm / 1440;
      snaps.push({ a6: snap(t.summary.a2 as A2State, day), a7: a7Snap(gameRef, day) });
    },
  } as any);
  const st = gameRef.world.wuxia.elements['a7-tuition'] as A7State;
  writeFileSync(out, JSON.stringify({ seed, days, hash: run.finalHash, snaps, negDays, minEver, firstWork, emptyDays, logTail: st.log.slice(-12), ledgerErr: Math.max(0, ...st.ledger.map((l) => Math.abs(l.err))), ledgerDays: st.ledger.length }));
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const days = Number(args.days ?? 90);
  if (args.seed !== undefined) return runOne(Number(args.seed), days, String(args.out));
  const seeds = String(args.seeds ?? '7,8,9,10,11').split(',').map(Number);
  const jobs = Number(args.jobs ?? 4);
  const dir = mkdtempSync(join(tmpdir(), 'a7-report-'));
  const results: any[] = [];
  const queue = [...seeds];
  const worker = async () => {
    for (let s = queue.shift(); s !== undefined; s = queue.shift()) {
      const out = join(dir, `s${s}.json`);
      await new Promise<void>((res, rej) => {
        const c = spawn(process.execPath, [join(process.cwd(), 'node_modules/.bin/tsx'), 'tools/wuxia/a7-report.ts', '--seed', String(s), '--days', String(days), '--out', out], { stdio: 'ignore' });
        c.on('close', (code) => (code === 0 ? res() : rej(new Error(`seed ${s} exit ${code}`))));
      });
      results.push(JSON.parse(readFileSync(out, 'utf8')));
    }
  };
  await Promise.all(Array.from({ length: jobs }, worker));
  results.sort((a, b) => a.seed - b.seed);
  const say = (s: string) => process.stdout.write(s + '\n');
  const at = (r: any, d: number) => r.snaps.find((x: any) => x.a6.day === d) as { a6: Snap; a7?: A7Snap } | undefined;
  say(`A7 報告（預設設定：大師第 5 日進鎮、open；seeds ${seeds.join(',')}；${days} 日）`);
  say('');
  say('| seed | 日 | 會的人 | 正式 | 只看來 | 付束脩中 | 做滿雜務(今日) | 學會：付／工／只看 | 付束脩累計 | 以工人日累計 | 水缸／柴堆 | 錢袋總和 | 最少 | 歸零人數 | 大師錢袋 | 教頭錢袋 |');
  say('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results)
    for (const s of r.snaps as Array<{ a6: Snap; a7?: A7Snap }>) {
      const a = s.a7;
      say(`| ${r.seed} | ${s.a6.day} | ${s.a6.learners} | ${s.a6.formal} | ${s.a6.watchOnly} | ${a?.paidNow ?? '-'} | ${a?.workNow ?? '-'} | ${a ? `${a.learnPaid}／${a.learnWork}／${a.learnLook}` : '-'} | ${a?.payCount ?? '-'} | ${a?.workDays ?? '-'} | ${a ? `${a.stock.water}／${a.stock.wood}` : '-'} | ${a?.purseTotal ?? '-'} | ${a?.minPurse ?? '-'} | ${a?.zeroPurse ?? '-'} | ${a?.masterPurse ?? '-'} | ${a?.coachPurse ?? '-'} |`);
    }
  say('');
  say('S 曲線（平均）：');
  for (const d of [10, 30, 60, 90].filter((x) => x <= days)) {
    const ss = results.map((r) => at(r, d)).filter(Boolean) as Array<{ a6: Snap; a7?: A7Snap }>;
    say(
      `  第 ${d} 日：會 ${mean(ss.map((s) => s.a6.learners)).toFixed(1)} 人（正式 ${mean(ss.map((s) => s.a6.formal)).toFixed(1)}、只看來 ${mean(ss.map((s) => s.a6.watchOnly)).toFixed(1)}）；學會的人裡付束脩 ${mean(ss.map((s) => s.a7?.learnPaid ?? 0)).toFixed(1)}、以工代學 ${mean(ss.map((s) => s.a7?.learnWork ?? 0)).toFixed(1)}、只看 ${mean(ss.map((s) => s.a7?.learnLook ?? 0)).toFixed(1)}；付束脩中 ${mean(ss.map((s) => s.a7?.paidNow ?? 0)).toFixed(1)} 人、今日做滿雜務 ${mean(ss.map((s) => s.a7?.workNow ?? 0)).toFixed(1)} 人`,
    );
  }
  say('  （參考目標：10 日 2–4 人，30 日 4–7 人，60 日 7–10 人，90 日 9–12 人）');
  say('');
  const b1 = results.map((r) => r.firstWork as number | undefined);
  const n1 = b1.filter((d) => d !== undefined && d <= 60).length;
  say(`B1 每個 seed 60 日內至少一人以工代學（做滿一天雜務）：${results.map((r, i) => `seed ${r.seed}＝${b1[i] === undefined ? '無' : `第 ${b1[i]} 日`}`).join('、')}；${n1}/${results.length} ${n1 === results.length ? 'PASS' : 'FAIL'}`);
  const negs = results.map((r) => r.negDays as number);
  const mins = results.map((r) => r.minEver as number);
  const zero60 = results.map((r) => at(r, 60)?.a7?.zeroPurse ?? NaN);
  say(`B2 60 日內沒有人錢袋長期為負：${results.map((r, i) => `seed ${r.seed}＝為負 ${negs[i]} 日（最低 ${mins[i]}）`).join('、')}；${negs.every((n) => n === 0) ? 'PASS' : 'FAIL'}（錢不能為負：付不起就不付；第 60 日歸零的人數 ${zero60.join('、')}）`);
  say(`錢帳守恆（逐日核對，最大誤差）：${results.map((r) => `seed ${r.seed}＝${r.ledgerErr}（${r.ledgerDays} 日）`).join('、')}`);
  say(`水缸或柴堆見底、全員先去挑水砍柴的日數：${results.map((r) => `seed ${r.seed}＝${r.emptyDays}`).join('、')}`);
  if (args.out) writeFileSync(String(args.out), JSON.stringify(results, null, 2));
}

main().catch((e) => {
  process.stderr.write(String(e) + '\n');
  process.exit(1);
});
