// 武俠小鎮 A4（#576，元素 id `a4-play`）：玩家的位置——緣分點、五個干預、劇本與目標、結算卡。
// 本檔是資料表、狀態型別與純函式（目標判定、故事挑選）；引擎、前端、工具共用。
// 不 import a2_master／a3_silent 的 index（a2_master/hooks.ts 會讀這裡的「hidden 破例」），避免循環。
import playJson from '../../../data/wuxia/play.json';
import s1 from '../../../data/wuxia/scenarios/s1-open.json';
import s2 from '../../../data/wuxia/scenarios/s2-hidden.json';
import s3 from '../../../data/wuxia/scenarios/s3-two.json';
import type { WuxiaState } from '../state';
import type { ScheduleBlock } from '../w03_life/data';
import { A2_MASTER, MASTER_CID, MOVE_BY_ID } from '../a2_master/data';
import type { A2State } from '../a2_master/data';
import { formalGenerations, generations } from '../a2_master/lineage';
import { a6On } from '../a6_spread/data';
import { a7Of, a7On } from '../a7_tuition/data';
import type { BondState } from '../w07_bond/data';
import type { SparState } from '../w06_spar/data';

export const A4_PLAY = 'a4-play';

export type InterventionKind = 'guide' | 'intro' | 'whisper' | 'feed' | 'plead';
export const INTERVENTIONS: InterventionKind[] = ['guide', 'intro', 'whisper', 'feed', 'plead'];
export const INTERVENTION_LABEL: Record<InterventionKind, string> = { guide: '指路', intro: '引薦', whisper: '傳話', feed: '接濟', plead: '說情' };
/** 選單上的「可能的結果」（不保證） */
export const INTERVENTION_HINT: Record<InterventionKind, string> = {
  guide: '他明早會剛好路過那裡；去了會不會心動，看他自己',
  intro: '兩人今天會在茶館碰面，由他開口；說什麼、成不成，照規矩來',
  whisper: '那條傳聞會進他耳裡，之後可能走樣、傳開',
  feed: '三天不必為吃飯操心，空出來的時間他自己決定怎麼用（束脩開著時也可以改成替他付這個月束脩，他就成了學生）',
  plead: '師父對他親近一些（同一對人只能一次）；收不收徒還是師父的事',
};

export const PLAY = playJson as unknown as {
  yuan: { start: number; perDay: number; max: number };
  costs: Record<InterventionKind, number>;
  guide: { from: number; to: number; places: Record<string, string[]> };
  intro: { minutes: number; latest: number; nextMorning: number };
  feed: { days: number; hunger: number };
  plead: { perPair: number };
  hiddenException: { close: number; max: number };
  eventsSize: number;
  story: { min: number; max: number; weights: Record<string, number>; caps: Record<string, number> };
  consequenceDays: number;
  rivalMax: number;
  tutorial: string[];
  defaultSpeed: number;
};

export type Cond =
  | { k: 'knowers'; family: string; via: string[]; min: number }
  | { k: 'generation'; family: string; min: number; formal?: boolean }
  | { k: 'townShare'; family: string; min: number; formal?: boolean }
  | { k: 'flawedShare'; family: string; max: number }
  | { k: 'disciples'; master: string; min: number }
  | { k: 'discipleTaught'; master: string; family: string; min: number }
  | { k: 'crossSpar'; a: string; b: string; min: number }
  | { k: 'bothArts'; arts: string[]; min: number; moves?: number }
  /** A7（#584）：有人靠以工代學正式學會（師父教）這門的一招，並把那一招練到 prof ≥ prof（小成 120）；min 人 */
  | { k: 'workLearned'; family: string; prof: number; min: number };
export type Tier = 'bronze' | 'silver' | 'gold';
export const TIERS: Tier[] = ['bronze', 'silver', 'gold'];
export const TIER_LABEL: Record<Tier, string> = { bronze: '銅', silver: '銀', gold: '金' };
/** after＝A6（#581）：這一級要等 after 那一級達成後才算 */
export type Goal = { label: string; all: Cond[]; after?: Tier };
export type Scenario = {
  id: string;
  name: string;
  policy: 'open' | 'selective' | 'hidden';
  seeds: [number, number];
  arriveDay: number;
  days: number;
  intro: string;
  goals: Record<Tier, Goal>;
  /** A6（#581）：a6-spread 開著時用的目標（依序、靠正式傳承） */
  goalsA6?: Record<Tier, Goal>;
  /** A7（#584）：a7-tuition 開著時用的目標（不用代數；沒寫的劇本沿用 goalsA6） */
  goalsA7?: Record<Tier, Goal>;
};

/** 這個世界此刻用的三級目標（a6 開著用 goalsA6，否則 A5 的 goals） */
export function goalsOf(w: WuxiaState | undefined, scenario: Scenario): Record<Tier, Goal> {
  if (a7On(w) && scenario.goalsA7) return scenario.goalsA7;
  return a6On(w) && scenario.goalsA6 ? scenario.goalsA6 : scenario.goals;
}
export const SCENARIOS: Scenario[] = [s1, s2, s3] as unknown as Scenario[];
export const SCENARIO_BY_ID: Record<string, Scenario> = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

export type Intervention = {
  id: number;
  gm: number;
  day: number;
  kind: InterventionKind;
  target: string;
  other?: string;
  place?: string;
  rid?: number;
  cost: number;
  /** 寫在被干預的人身上的記憶 id（「因為…」看得到） */
  mem?: number;
  /** 引薦：那次互動的 A3 紀錄 id */
  social?: number;
};
/** a4 自己的關鍵事件（結算卡的故事從這裡挑；ref＝來源元素的紀錄 id） */
export type PlayEvent = {
  id: number;
  day: number;
  gm: number;
  kind: 'goal' | 'disciple' | 'generation' | 'arrive' | 'fate' | 'switch' | 'spar' | 'learn' | 'event';
  who: string[];
  ref?: { src: 'a2' | 'w06' | 'w07' | 'w08' | 'a4'; id: number };
  text: string;
};
export type A4State = {
  v: 1;
  minute: number;
  day: number;
  /** 劇本 id（沒選劇本＝自由玩，沒有目標與結算） */
  scenario?: string;
  daysLimit?: number;
  yuan: number;
  seq: number;
  used: Intervention[];
  /** 說情過的「師父|人」 */
  pleaded: string[];
  /** 指路／引薦排的時段（人物 id → 時段，連同那段是哪一天）；w03-life 的日程讀它 */
  blocks: Record<string, Array<ScheduleBlock & { day: number; iv: number }>>;
  /** 接濟：人物 id → 到哪個遊戲分鐘為止 */
  fed: Record<string, number>;
  /** 引薦等著碰面：[干預 id, A, B, 那段的日] */
  intros: Array<[number, string, string, number]>;
  goals: Partial<Record<Tier, number>>;
  ended?: { day: number; gm: number; reason: 'gold' | 'time' };
  events: PlayEvent[];
  /** 掃描進度（只掃新的）：a2 紀錄、w06 切磋、w08 鎮誌、已記的徒弟／第一次學會 */
  scan: { a2: number; w06: number; w08: number; disciples: string[]; learned: string[]; gen: number; arrived: boolean };
};

export function initA4State(): A4State {
  return {
    v: 1,
    minute: -1,
    day: 0,
    yuan: PLAY.yuan.start,
    seq: 1,
    used: [],
    pleaded: [],
    blocks: {},
    fed: {},
    intros: [],
    goals: {},
    events: [],
    scan: { a2: -1, w06: 0, w08: 0, disciples: [], learned: [], gen: 1, arrived: false },
  };
}

export function a4Of(w: WuxiaState | undefined): A4State | undefined {
  return w?.enabled[A4_PLAY] ? (w.elements[A4_PLAY] as A4State | undefined) : undefined;
}

/** A4 的時段（w03-life lifeSchedCtx 讀；只回今天的）。a4-play 關閉時 undefined。 */
export function a4Blocks(w: WuxiaState | undefined, day: number | undefined): Record<string, ScheduleBlock[]> | undefined {
  const st = a4Of(w);
  if (!st || day === undefined) return undefined;
  let out: Record<string, ScheduleBlock[]> | undefined;
  for (const cid of Object.keys(st.blocks)) {
    const l = st.blocks[cid].filter((b) => b.day === day).map(({ from, to, label, do: d }) => ({ from, to, label, do: d }));
    if (l.length) (out ??= {})[cid] = l;
  }
  return out;
}

/** 劇本二「hidden 在親近 ≥ 60 時會破例收一人」（a2_master/hooks.ts 用）。a4-play 關閉時 false。 */
export function hiddenException(w: WuxiaState, close: number, count: number): boolean {
  return !!a4Of(w) && close >= PLAY.hiddenException.close && count < PLAY.hiddenException.max;
}

// ───────────── 目標判定（純函式；只讀 A2／W6／W7 狀態，journal 重播後重算結果相同） ─────────────

export type GoalView = { a2?: A2State; bond?: BondState; spar?: SparState; town: string[] };

export function goalView(w: WuxiaState): GoalView {
  const a2 = w.enabled[A2_MASTER] ? (w.elements[A2_MASTER] as A2State | undefined) : undefined;
  const bond = w.enabled['w07-bond'] ? (w.elements['w07-bond'] as BondState | undefined) : undefined;
  const spar = w.enabled['w06-spar'] ? (w.elements['w06-spar'] as SparState | undefined) : undefined;
  const life = w.elements['w03-life'] as { people: Record<string, { cid: string; player?: boolean }> } | undefined;
  const master = MASTER_CID;
  const town = Object.values(life?.people ?? {})
    .filter((p) => !p.player && p.cid !== master)
    .map((p) => p.cid)
    .sort();
  return { a2, bond, spar, town };
}

function knownMoves(v: GoalView, cid: string, family: string) {
  const k = v.a2?.know[cid] ?? {};
  return Object.keys(k)
    .filter((m) => MOVE_BY_ID[m]?.family === family)
    .map((m) => ({ id: m, ...k[m] }));
}

/** 這人在這門武學是第幾代（開山＝0；沒學＝−1）。照 A2 傳承譜系的算法（a2_master/lineage.ts generations）。 */
export function generationOf(v: GoalView, cid: string, family: string): number {
  if (!v.a2) return -1;
  return generations(v.a2, family)[cid] ?? -1;
}

function disciplesOf(v: GoalView, master: string): string[] {
  return Object.keys(v.bond?.disciples ?? {})
    .filter((c) => v.bond!.disciples[c].master === master)
    .sort();
}

/** 一個條件此刻的值與是否成立（value 給面板顯示進度）。 */
export function evalCond(w: WuxiaState, c: Cond): { ok: boolean; value: number; need: number } {
  const v = goalView(w);
  switch (c.k) {
    case 'knowers': {
      const n = Object.keys(v.a2?.know ?? {}).filter((cid) => knownMoves(v, cid, c.family).some((m) => c.via.includes(m.via))).length;
      return { ok: n >= c.min, value: n, need: c.min };
    }
    case 'generation': {
      let g = 0;
      if (v.a2) for (const x of Object.values((c.formal ? formalGenerations : generations)(v.a2, c.family))) if (x > g) g = x;
      return { ok: g >= c.min, value: g, need: c.min };
    }
    case 'townShare': {
      const n = v.town.filter((cid) => knownMoves(v, cid, c.family).some((m) => (c.formal ? m.via === 'teach' : m.via !== 'origin'))).length;
      const share = v.town.length ? n / v.town.length : 0;
      return { ok: share >= c.min, value: Math.round(share * 100) / 100, need: c.min };
    }
    case 'flawedShare': {
      let all = 0;
      let bad = 0;
      for (const cid of Object.keys(v.a2?.know ?? {}))
        for (const m of knownMoves(v, cid, c.family)) {
          if (m.via === 'origin') continue;
          all++;
          if (m.flawed) bad++;
        }
      const share = all ? bad / all : 0;
      return { ok: all > 0 && share <= c.max, value: Math.round(share * 100) / 100, need: c.max };
    }
    case 'disciples': {
      const n = disciplesOf(v, c.master).length;
      return { ok: n >= c.min, value: n, need: c.min };
    }
    case 'discipleTaught': {
      const ds = new Set(disciplesOf(v, c.master));
      const n = Object.keys(v.a2?.know ?? {}).filter(
        (cid) => cid !== c.master && knownMoves(v, cid, c.family).some((m) => m.via === 'teach' && m.from && ds.has(m.from)),
      ).length;
      return { ok: n >= c.min, value: n, need: c.min };
    }
    case 'crossSpar': {
      const da = new Set(disciplesOf(v, c.a));
      const db = new Set(disciplesOf(v, c.b));
      const rival = (x: string, y: string) => v.bond?.bonds[x]?.[y]?.rival ?? 0;
      const n = (v.spar?.history ?? []).filter(
        (r) =>
          ((da.has(r.a) && db.has(r.b)) || (db.has(r.a) && da.has(r.b))) &&
          rival(r.a, r.b) < PLAY.rivalMax &&
          rival(r.b, r.a) < PLAY.rivalMax,
      ).length;
      return { ok: n >= c.min, value: n, need: c.min };
    }
    case 'workLearned': {
      const st = a7Of(w);
      const n = Object.keys(v.a2?.know ?? {}).filter((cid) =>
        knownMoves(v, cid, c.family).some((m) => m.via === 'teach' && st?.learned[`${cid}|${m.id}`] === 'work' && m.prof >= c.prof),
      ).length;
      return { ok: n >= c.min, value: n, need: c.min };
    }
    case 'bothArts': {
      const n = Object.keys(v.a2?.know ?? {}).filter((cid) =>
        c.arts.every((a) => knownMoves(v, cid, a).filter((m) => m.via === 'teach').length >= (c.moves ?? 1)),
      ).length;
      return { ok: n >= c.min, value: n, need: c.min };
    }
  }
}

/**
 * 劇本三級目標此刻各自成立嗎（純函式；遊戲內每日判一次並記達成日，journal 重播後用同一個函式重算）。
 * A6（#581）：目標有 after 時，那一級要先達成（done 裡有達成日，或這次一起判到）才算——銅沒達成前銀不算、銀沒達成前金不算。
 */
export function evalGoals(
  w: WuxiaState,
  scenario: Scenario,
  done: Partial<Record<Tier, number>> = {},
): Record<Tier, { ok: boolean; conds: Array<{ ok: boolean; value: number; need: number }> }> {
  const out = {} as Record<Tier, { ok: boolean; conds: Array<{ ok: boolean; value: number; need: number }> }>;
  const goals = goalsOf(w, scenario);
  for (const t of TIERS) {
    const conds = goals[t].all.map((c) => evalCond(w, c));
    const prev = goals[t].after;
    const unlocked = !prev || done[prev] !== undefined || out[prev]?.ok === true;
    out[t] = { ok: unlocked && conds.every((c) => c.ok), conds };
  }
  return out;
}

// ───────────── 結算卡的故事 ─────────────

/** 從 a4 事件環挑 5–8 條最關鍵的（權重高→新），再依時間排；每條都帶事件 id。 */
export function pickStory(st: A4State): PlayEvent[] {
  const W = PLAY.story.weights;
  const ranked = [...st.events].sort((a, b) => (W[b.kind] ?? 0) - (W[a.kind] ?? 0) || a.gm - b.gm || a.id - b.id);
  const picked: PlayEvent[] = [];
  const seenText = new Set<string>();
  const perKind: Record<string, number> = {};
  for (const e of ranked) {
    if (picked.length >= PLAY.story.max) break;
    if (seenText.has(e.text) || (perKind[e.kind] ?? 0) >= (PLAY.story.caps[e.kind] ?? 1)) continue;
    seenText.add(e.text);
    perKind[e.kind] = (perKind[e.kind] ?? 0) + 1;
    picked.push(e);
  }
  return picked.sort((a, b) => a.gm - b.gm || a.id - b.id);
}

const LEADS = ['', '後來，', '沒過多久，', '又過了幾天，', '那之後，', '再後來，', '終於，', '到最後，'];
/** 故事段落（文法模板：時間連接詞＋事件句）。LLM 改寫為選配，不在這裡。 */
export function storyText(events: PlayEvent[]): string {
  return events
    .map((e, i) => `${i === 0 ? `第 ${e.day} 日，` : i === events.length - 1 && events.length > 2 ? LEADS[6] : LEADS[1 + ((i - 1) % 5)]}${e.text}。`)
    .join('');
}

/** 干預的後果鏈：干預後 consequenceDays 日內，跟那個人有關的關鍵事件。 */
export function consequences(st: A4State, iv: Intervention): PlayEvent[] {
  const until = iv.gm + PLAY.consequenceDays * 1440;
  const who = new Set([iv.target, ...(iv.other ? [iv.other] : [])]);
  return st.events.filter((e) => e.kind !== 'fate' && e.gm >= iv.gm && e.gm <= until && e.who.some((c) => who.has(c)));
}
