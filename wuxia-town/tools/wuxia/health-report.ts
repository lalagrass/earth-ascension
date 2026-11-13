// 武俠小鎮 A1（#564 範圍 4）長跑體檢：`npm run wuxia:health -- --seed 7 --days 360 [--agents N] --out /tmp/h.json`
// 無頭跑 days 日（用 src/wuxia/engine/session.ts，跟單機 Worker 同一份程式；只讀狀態，不改規則、不改 hash），
// 每 30 日輸出一段：每人各活動時數佔比、需求超標（> hard 90）時數、互動次數、技能、心念數、關係變化、事件次數、
// 「連續 3 日時間表完全相同」的人數、每 step 計算時間、狀態大小；另外報教頭對徒弟的敬重、林嫂每日活動種類數（#564 第 8 項修補前後）。
// A4 判定（不過 exit 1）：
//   - 沒有人任一需求連續超標（> hard）12 遊戲小時
//   - 沒有人連續 5 日無事可做（那天沒開始任何活動）
//   - 狀態大小有上限：後半段（第 days/2 日之後）的最大值 ≤ 前半段最大值 × 1.5（環形紀錄不無限成長）
import * as fs from 'node:fs';
import { Session, initialSnapshot } from '../../src/wuxia/engine/session';
import { canonicalJson } from '../../convex/wuxia/canonical';
import { readClock } from '../../convex/wuxia/clock';
import { W03_LIFE, type LifeState } from '../../convex/wuxia/w03_life';
import { NEEDS_CONFIG } from '../../convex/wuxia/w03_life/data';
import { W04_DOJO, type DojoState } from '../../convex/wuxia/w04_dojo';
import { W05_MIND, type MindState } from '../../convex/wuxia/w05_mind/data';
import { W06_SPAR } from '../../convex/wuxia/w06_spar/data';
import { W07_BOND, type BondState } from '../../convex/wuxia/w07_bond/data';
import { W08_JIANGHU, type JianghuState } from '../../convex/wuxia/w08_jianghu/data';
import { COACH_ID } from '../../convex/wuxia/w04_dojo/data';
import { parseArgs, quietConsole } from './sim';

const HARD = NEEDS_CONFIG.urgency.hard;
const NEED_KEYS = ['hunger', 'fatigue', 'boredom', 'chore'] as const;
export const OVER_LIMIT_MIN = 12 * 60;
export const IDLE_DAYS_LIMIT = 5;
export const STATE_GROWTH_LIMIT = 1.5;

type Window = {
  fromDay: number;
  toDay: number;
  activityShare: Record<string, Record<string, number>>;
  overHours: Record<string, Record<string, number>>;
  conversations: number;
  spars: number;
  events: Record<string, number>;
  skills: Record<string, number>;
  thoughts: Record<string, number>;
  bondsChanged: number;
  coachRespect: Record<string, number>;
  sameScheduleRuns: number;
  linSao: { kindsPerDay: number; maxRepeat: number; brewPerDay: number };
  msPerStep: number;
  stateBytes: number;
};

export function health(opts: { seed: number; days: number; agents?: number; onWindow?: (w: Window) => void }) {
  const session = new Session(initialSnapshot({ seed: opts.seed }), { seed: opts.seed, agents: opts.agents, keepMessages: 0 });
  const game = session.game;
  const w = game.world.wuxia!;
  const el = <T,>(id: string) => w.elements[id] as T | undefined;
  const name = (pid: string) => game.playerDescriptions.get(pid as any)?.name ?? pid;
  const end = opts.days * 1440;

  // 全程
  const overRun: Record<string, Record<string, number>> = {};
  const maxOver: Record<string, Record<string, number>> = {};
  const idleRun: Record<string, number> = {};
  const maxIdleDays: Record<string, number> = {};
  const windows: Window[] = [];
  // 這一段
  let act: Record<string, Record<string, number>> = {};
  let over: Record<string, Record<string, number>> = {};
  let conv0 = 0;
  let spar0 = 0;
  let ev0 = 0;
  let bonds0: Record<string, Record<string, any>> = {};
  let stepMs = 0;
  let stepN = 0;
  let sameRuns = 0;
  let lin = { kinds: 0, days: 0, maxRepeat: 0, brew: 0 };
  // 每日
  let dayHour: Record<string, string[]> = {};
  const prevDays: Record<string, string[]> = {};
  const sameStreak: Record<string, number> = {};
  const startedToday = new Set<string>();
  let linKinds = new Set<string>();
  let linRun = { act: '', n: 0 };
  const lastStart: Record<string, number> = {};
  let day = -1;
  let gm = -1;
  const stateSizes: Array<[number, number]> = [];

  const closeDay = () => {
    const life = el<LifeState>(W03_LIFE);
    if (!life) return;
    for (const pid of Object.keys(life.people)) {
      const sig = (dayHour[pid] ?? []).join(',');
      const prev = prevDays[pid] ?? [];
      prev.push(sig);
      if (prev.length > 3) prev.shift();
      prevDays[pid] = prev;
      if (prev.length === 3 && prev[0] === prev[1] && prev[1] === prev[2]) sameStreak[pid] = (sameStreak[pid] ?? 0) + 1;
      if (startedToday.has(pid)) idleRun[pid] = 0;
      else idleRun[pid] = (idleRun[pid] ?? 0) + 1;
      maxIdleDays[pid] = Math.max(maxIdleDays[pid] ?? 0, idleRun[pid]);
    }
    lin.days++;
    lin.kinds += linKinds.size;
    linKinds = new Set();
    startedToday.clear();
    dayHour = {};
  };

  const closeWindow = (toDay: number) => {
    const life = el<LifeState>(W03_LIFE)!;
    const dojo = el<DojoState>(W04_DOJO);
    const mind = el<MindState>(W05_MIND);
    const bond = el<BondState>(W07_BOND);
    const jh = el<JianghuState>(W08_JIANGHU);
    const spar = el<any>(W06_SPAR);
    const share: Window['activityShare'] = {};
    for (const [pid, m] of Object.entries(act)) {
      const tot = Object.values(m).reduce((a, b) => a + b, 0) || 1;
      share[name(pid)] = Object.fromEntries(
        Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round((v / tot) * 1000) / 10]),
      );
    }
    const overH: Window['overHours'] = {};
    for (const [pid, m] of Object.entries(over)) overH[name(pid)] = Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round((v / 60) * 10) / 10]));
    const events: Record<string, number> = {};
    for (const e of jh?.history ?? []) if (e.id > ev0) events[e.kind] = (events[e.kind] ?? 0) + 1;
    ev0 = Math.max(ev0, ...(jh?.history ?? []).map((e) => e.id));
    let spars = 0;
    for (const r of spar?.history ?? []) if (r.id > spar0) spars++;
    spar0 = Math.max(spar0, ...(spar?.history ?? []).map((r: any) => r.id));
    const skills: Record<string, number> = {};
    for (const [cid, s] of Object.entries(dojo?.skills ?? {})) skills[cid] = (s as any).fist;
    const thoughts: Record<string, number> = {};
    for (const p of Object.values(mind?.people ?? {})) thoughts[p.cid] = p.thoughts.length;
    let bondsChanged = 0;
    for (const [a, row] of Object.entries(bond?.bonds ?? {}))
      for (const [b, v] of Object.entries(row)) {
        const o = bonds0[a]?.[b] ?? { close: 0, respect: 0, rival: 0 };
        if (Math.abs(v.close - o.close) >= 10 || Math.abs(v.respect - o.respect) >= 10 || Math.abs(v.rival - o.rival) >= 10) bondsChanged++;
      }
    bonds0 = structuredClone(bond?.bonds ?? {});
    const coachRespect: Record<string, number> = {};
    for (const [cid, d] of Object.entries(bond?.disciples ?? {}))
      if ((d as any).master === COACH_ID) coachRespect[cid] = bond?.bonds[COACH_ID]?.[cid]?.respect ?? 0;
    const bytes = Buffer.byteLength(canonicalJson(game.world.serialize()));
    stateSizes.push([toDay, bytes]);
    const win: Window = {
      fromDay: windows.length ? windows[windows.length - 1].toDay + 1 : 1,
      toDay,
      activityShare: share,
      overHours: overH,
      conversations: session.stats.conversationsEnded - conv0,
      spars,
      events,
      skills,
      thoughts,
      bondsChanged,
      coachRespect,
      sameScheduleRuns: sameRuns + Object.values(sameStreak).filter((n) => n > 0).length,
      linSao: {
        kindsPerDay: lin.days ? Math.round((lin.kinds / lin.days) * 100) / 100 : 0,
        maxRepeat: lin.maxRepeat,
        brewPerDay: lin.days ? Math.round((lin.brew / lin.days) * 100) / 100 : 0,
      },
      msPerStep: stepN ? stepMs / stepN : 0,
      stateBytes: bytes,
    };
    windows.push(win);
    opts.onWindow?.(win);
    conv0 = session.stats.conversationsEnded;
    act = {};
    over = {};
    stepMs = 0;
    stepN = 0;
    for (const k of Object.keys(sameStreak)) sameStreak[k] = 0;
    sameRuns = 0;
    lin = { kinds: 0, days: 0, maxRepeat: 0, brew: 0 };
    void life;
  };

  while (gm < end) {
    const t0 = performance.now();
    session.step();
    stepMs += performance.now() - t0;
    stepN++;
    const g = session.gameMinute();
    if (g < 0 || g === gm) continue;
    gm = g;
    const c = readClock(gm);
    if (day !== -1 && c.day !== day) {
      closeDay();
      if ((c.day - 1) % 30 === 0 && c.day > 1) closeWindow(c.day - 1);
    }
    day = c.day;
    const life = el<LifeState>(W03_LIFE);
    if (!life) continue;
    for (const [pid, p] of Object.entries(life.people)) {
      if (p.player) continue;
      const pl = game.world.players.get(pid as any);
      const inConv = pl && game.world.playerConversation(pl);
      const a = inConv ? 'talk' : p.cur ? (p.cur.phase === 'do' ? p.cur.act : `→${p.cur.act}`) : 'idle';
      const m = (act[pid] ??= {});
      m[a] = (m[a] ?? 0) + 1;
      if (c.minute === 0) (dayHour[pid] ??= []).push(a);
      if (p.cur?.phase === 'do' && lastStart[pid] !== p.cur.since) {
        lastStart[pid] = p.cur.since!;
        startedToday.add(pid);
        if (p.cid === 'lin-sao') {
          linKinds.add(p.cur.act);
          if (p.cur.act === 'brew_tea') lin.brew++;
          linRun = linRun.act === p.cur.act ? { act: p.cur.act, n: linRun.n + 1 } : { act: p.cur.act, n: 1 };
          if (p.cur.act !== 'sleep') lin.maxRepeat = Math.max(lin.maxRepeat, linRun.n);
        }
      }
      for (const k of NEED_KEYS) {
        const o = (overRun[pid] ??= {});
        if (p.needs[k] > HARD) {
          o[k] = (o[k] ?? 0) + 1;
          const ov = (over[pid] ??= {});
          ov[k] = (ov[k] ?? 0) + 1;
          const mx = (maxOver[pid] ??= {});
          mx[k] = Math.max(mx[k] ?? 0, o[k]);
        } else o[k] = 0;
      }
    }
  }
  closeDay();
  if (!windows.length || windows[windows.length - 1].toDay < opts.days) closeWindow(opts.days);

  const half = opts.days / 2;
  const firstMax = Math.max(0, ...stateSizes.filter(([d]) => d <= half).map(([, b]) => b));
  const secondMax = Math.max(0, ...stateSizes.filter(([d]) => d > half).map(([, b]) => b));
  const worstOver = Object.entries(maxOver).flatMap(([pid, m]) => Object.entries(m).map(([k, v]) => ({ who: name(pid), need: k, minutes: v })))
    .sort((a, b) => b.minutes - a.minutes)[0];
  const worstIdle = Object.entries(maxIdleDays).map(([pid, d]) => ({ who: name(pid), days: d })).sort((a, b) => b.days - a.days)[0];
  const verdicts = [
    { rule: `A4 沒有人需求連續超標（> ${HARD}）${OVER_LIMIT_MIN / 60} 遊戲小時`, ok: !worstOver || worstOver.minutes < OVER_LIMIT_MIN,
      value: worstOver ? `最長 ${worstOver.who} ${worstOver.need} ${(worstOver.minutes / 60).toFixed(1)} 小時` : '沒有超標' },
    { rule: `A4 沒有人連續 ${IDLE_DAYS_LIMIT} 日無事可做`, ok: !worstIdle || worstIdle.days < IDLE_DAYS_LIMIT,
      value: worstIdle ? `最長 ${worstIdle.who} ${worstIdle.days} 日` : '—' },
    { rule: `A4 狀態大小有上限（後半最大 ≤ 前半最大 × ${STATE_GROWTH_LIMIT}）`, ok: !firstMax || secondMax <= firstMax * STATE_GROWTH_LIMIT,
      value: `前半 ${(firstMax / 1024).toFixed(0)} KB、後半 ${(secondMax / 1024).toFixed(0)} KB` },
  ];
  return { tool: 'wuxia-town health', seed: opts.seed, days: opts.days, agents: opts.agents ?? null, hash: game.wuxiaHash(), windows, verdicts };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const seed = Number(args.seed ?? 7);
  const days = Number(args.days ?? 360);
  const t0 = performance.now();
  const r = health({
    seed, days, agents: args.agents === undefined ? undefined : Number(args.agents),
    onWindow: (w) => {
      const top = (m: Record<string, number>) => Object.entries(m).slice(0, 3).map(([k, v]) => `${k} ${v}%`).join('、');
      const lines = [`## 第 ${w.fromDay}–${w.toDay} 日`];
      lines.push(`對話 ${w.conversations}、切磋 ${w.spars}、事件 ${JSON.stringify(w.events)}、關係變動 ≥10 的對數 ${w.bondsChanged}、連續 3 日時間表相同 ${w.sameScheduleRuns} 人`);
      lines.push(`拳腳 ${JSON.stringify(w.skills)}、心念數 ${JSON.stringify(w.thoughts)}`);
      lines.push(`教頭對徒弟敬重 ${JSON.stringify(w.coachRespect)}；林嫂每日活動 ${w.linSao.kindsPerDay} 種、煮茶 ${w.linSao.brewPerDay} 次／日、同一活動（睡覺除外）最多連 ${w.linSao.maxRepeat} 次`);
      lines.push(`每 step ${w.msPerStep.toFixed(3)} ms、狀態 ${(w.stateBytes / 1024).toFixed(0)} KB`);
      for (const [who, m] of Object.entries(w.activityShare)) {
        const o = w.overHours[who];
        lines.push(`  ${who}：${top(m)}${o && Object.keys(o).length ? `；超標 ${JSON.stringify(o)} 小時` : ''}`);
      }
      process.stdout.write(lines.join('\n') + '\n');
    },
  });
  for (const v of r.verdicts) process.stdout.write(`${v.ok ? 'ok  ' : 'FAIL'} ${v.rule}：${v.value}\n`);
  process.stdout.write(`hash ${r.hash}（${((performance.now() - t0) / 1000).toFixed(1)} 秒）\n`);
  if (args.out) fs.writeFileSync(String(args.out), JSON.stringify(r, null, 2) + '\n');
  if (r.verdicts.some((v) => !v.ok)) process.exit(1);
}

if (process.argv[1]?.endsWith('health-report.ts')) main();
