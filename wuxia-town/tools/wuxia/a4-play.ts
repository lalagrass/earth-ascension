// 武俠小鎮 A4（#576）：劇本腳本玩家。腳本只決定「什麼時候花緣做哪個干預」，干預都是 wuxiaIntervene input，
// 跟 AI 的回應 input 一起進 journal，所以同腳本同 seed 兩次 hash 相同、匯出的 journal 重播相符。
// 腳本格式（docs/wuxia/fixtures/a4-s1-gold.json）：
//   { "scenario": "s1", "days": 90?, "steps": [{ "day": 1, "at": "08:00", "kind": "guide", "target": "a-qing", "place": "plaza" }],
//     "rules": [{ "at": "08:00", "kind": "guide", "pick": "fewestMoves", "family": "taiji", "place": "plaza", "fromDay": 1 }] }
// steps＝指定的干預；rules＝每天照規則挑人（緣夠才做；挑法只讀世界狀態，不用亂數）。policy none＝不干預。
// npm run wuxia:player-script 看到 "scenario" 欄位時轉到這裡。
import { runHeadless, HeadlessOptions } from './headless';
import { DAY_START_MINUTE, gameMinutes, readClock } from '../../convex/wuxia/clock';
import type { LifeState } from '../../convex/wuxia/w03_life';
import { A4_PLAY, A4State, PLAY, SCENARIO_BY_ID, TIERS, evalGoals, pickStory, InterventionKind } from '../../convex/wuxia/a4_play/data';
import { A2_MASTER, MASTER_CID, MOVE_BY_ID } from '../../convex/wuxia/a2_master/data';
import type { A2State } from '../../convex/wuxia/a2_master/data';
import type { BondState } from '../../convex/wuxia/w07_bond/data';
import type { JianghuState } from '../../convex/wuxia/w08_jianghu/data';
import type { JournalInput } from './sim';

export type PlayStep = { day: number; at: string; kind: InterventionKind; target: string; other?: string; place?: string; rid?: number };
export type PlayRule = {
  at: string;
  kind: InterventionKind;
  pick: 'fewestMoves' | 'closestToMaster' | 'disciple' | 'freshRumor';
  family?: string;
  place?: string;
  master?: string;
  fromDay?: number;
  everyDays?: number;
};
export type PlayScript = { scenario: string; days?: number; steps?: PlayStep[]; rules?: PlayRule[] };

const minuteOf = (at: string) => {
  const [h, m] = at.split(':').map(Number);
  return h * 60 + m;
};

type W = NonNullable<ReturnType<typeof runHeadless>['game']['world']['wuxia']>;

function town(w: W): string[] {
  const life = w.elements['w03-life'] as LifeState;
  return Object.values(life.people)
    .filter((p) => !p.player && p.cid !== MASTER_CID)
    .map((p) => p.cid)
    .sort();
}
function movesOf(w: W, cid: string, fam: string): number {
  const a2 = w.elements[A2_MASTER] as A2State | undefined;
  return Object.keys(a2?.know[cid] ?? {}).filter((m) => MOVE_BY_ID[m]?.family === fam).length;
}

/** 規則挑人（只讀狀態；同分照人物 id 排序）。挑不到回 undefined。 */
function pick(w: W, r: PlayRule, st: A4State): Omit<PlayStep, 'day' | 'at'> | undefined {
  const t = town(w);
  const recent = (cid: string) => st.used.some((u) => u.target === cid && u.kind === r.kind && st.day - u.day < 2);
  const bond = w.elements['w07-bond'] as BondState | undefined;
  const fam = r.family ?? 'taiji';
  if (r.pick === 'fewestMoves') {
    const c = t.filter((x) => !recent(x) && !(bond?.disciples[x]?.master && fam === 'taiji' && bond.disciples[x].master !== MASTER_CID && false));
    c.sort((a, b) => movesOf(w, a, fam) - movesOf(w, b, fam) || (a < b ? -1 : 1));
    return c[0] ? { kind: r.kind, target: c[0], place: r.place } : undefined;
  }
  if (r.pick === 'closestToMaster') {
    const m = r.master ?? MASTER_CID;
    const c = t.filter((x) => x !== m && !st.pleaded.includes(`${m}|${x}`) && bond?.disciples[x]?.master !== m);
    c.sort((a, b) => (bond?.bonds[m]?.[b]?.close ?? 0) - (bond?.bonds[m]?.[a]?.close ?? 0) || (a < b ? -1 : 1));
    return c[0] ? { kind: r.kind, target: c[0], other: m } : undefined;
  }
  if (r.pick === 'disciple') {
    const m = r.master ?? MASTER_CID;
    const ds = t.filter((x) => bond?.disciples[x]?.master === m);
    const others = t.filter((x) => !bond?.disciples[x] && !recent(x)).sort((a, b) => movesOf(w, a, fam) - movesOf(w, b, fam) || (a < b ? -1 : 1));
    return ds[0] && others[0] ? { kind: r.kind, target: ds[st.day % ds.length], other: others[0] } : undefined;
  }
  if (r.pick === 'freshRumor') {
    const jh = w.elements['w08-jianghu'] as JianghuState | undefined;
    // 最新、還有人沒聽過的那條
    for (const rumor of [...(jh?.rumors ?? [])].reverse()) {
      const c = t.filter((x) => !(jh!.known[x] ?? []).some((h) => h.rid === rumor.id));
      if (c[0]) return { kind: r.kind, target: c[0], rid: rumor.id };
    }
    return undefined;
  }
  return undefined;
}

export type PlayOutcome = { day: number; at: string; kind: string; target: string; other?: string; ok: boolean; reason: string };

export function runPlay(
  script: PlayScript,
  seed: number,
  opts: { days?: number; policy?: 'none' | 'script'; stepHashes?: boolean; elements?: Record<string, boolean> } = {},
) {
  const sc = SCENARIO_BY_ID[script.scenario];
  if (!sc) throw new Error(`unknown scenario ${script.scenario}`);
  const days = opts.days ?? script.days ?? sc.days;
  const policy = opts.policy ?? 'script';
  const outcomes: PlayOutcome[] = [];
  const pending = new WeakMap<object, PlayOutcome>();
  const firedSteps = new Set<number>();
  const firedRules = new Set<string>();
  const inject: HeadlessOptions['inject'] = (game, now) => {
    const out: Array<{ name: string; args: any }> = [];
    const w = game.world.wuxia!;
    const st = w.elements[A4_PLAY] as A4State | undefined;
    if (policy === 'none' || w.clockEpoch === undefined || !st || st.ended) return out;
    const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
    const c = readClock(gm);
    const send = (s: Omit<PlayStep, 'day' | 'at'>, at: string) => {
      const args: any = { kind: s.kind, target: s.target };
      if (s.other) args.other = s.other;
      if (s.place) args.place = s.place;
      if (s.rid !== undefined) args.rid = s.rid;
      const o: PlayOutcome = { day: c.day, at, kind: s.kind, target: s.target, other: s.other, ok: false, reason: '（沒處理）' };
      outcomes.push(o);
      pending.set(args, o);
      out.push({ name: 'wuxiaIntervene', args });
    };
    (script.steps ?? []).forEach((s, i) => {
      if (firedSteps.has(i) || s.day !== c.day || c.minuteOfDay < minuteOf(s.at)) return;
      firedSteps.add(i);
      send(s, s.at);
    });
    let budget = st.yuan;
    (script.rules ?? []).forEach((r, i) => {
      const key = `${i}|${c.day}`;
      if (firedRules.has(key) || c.minuteOfDay < minuteOf(r.at) || c.day < (r.fromDay ?? 1)) return;
      if (r.everyDays && (c.day - (r.fromDay ?? 1)) % r.everyDays !== 0) return;
      if (budget < PLAY.costs[r.kind]) return; // 緣不夠：今天先不做，晚點再看
      firedRules.add(key);
      const s = pick(w, r, st);
      if (!s) return;
      budget -= PLAY.costs[r.kind];
      send(s, r.at);
    });
    return out;
  };
  const run = runHeadless({
    seed,
    minutes: 1,
    // 跑到第 days+1 日 01:00（結算在第 days 日過完的那一刻）
    untilGameMinute: days * 1440 - DAY_START_MINUTE + 60,
    play: script.scenario,
    playDays: days,
    stepHashes: opts.stepHashes,
    elements: opts.elements,
    inject,
    onInputResult: (input: JournalInput, r) => {
      const o = pending.get(input.args);
      if (!o) return;
      if (r.kind === 'ok') {
        o.ok = !!r.value?.ok;
        o.reason = r.value?.reason ?? '';
      } else o.reason = r.message;
    },
  });
  const w = run.game.world.wuxia!;
  const st = w.elements[A4_PLAY] as A4State;
  const g = evalGoals(w, sc);
  return {
    run,
    report: {
      scenario: sc.id,
      name: sc.name,
      seed,
      days,
      policy,
      goals: st.goals,
      ended: st.ended,
      now: Object.fromEntries(TIERS.map((t) => [t, g[t].conds.map((x) => `${x.value}/${x.need}${x.ok ? '✓' : ''}`).join(' ')])),
      used: st.used.length,
      outcomes,
      story: pickStory(st).map((e) => ({ id: e.id, day: e.day, kind: e.kind, text: e.text, ref: e.ref })),
      hash: run.finalHash,
    },
  };
}
