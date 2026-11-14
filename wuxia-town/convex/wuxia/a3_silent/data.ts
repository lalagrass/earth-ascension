// 武俠小鎮 A3（#574，元素 id `a3-silent`）：無言互動的資料表、狀態與純函式。
// 互動表 data/wuxia/interactions.json、人格 data/wuxia/personality.json；句型在 ./grammar.ts。
// 本檔不 import a2_master（a2_master 會讀這裡的指點時段），避免循環。
import interactionsJson from '../../../data/wuxia/interactions.json';
import personalityJson from '../../../data/wuxia/personality.json';
import type { WuxiaState } from '../state';
import type { Memory } from '../w05_mind/data';

export const A3_SILENT = 'a3-silent';

export type Axis3 = 'close' | 'respect' | 'rival';
export type Traits = { ext: number; calm: number; disc: number; caut: number };
export type FxDef = {
  a?: Partial<Record<Axis3, number>>;
  b?: Partial<Record<Axis3, number>>;
  moodA?: [number, number];
  moodB?: [number, number];
  rumor?: 'ab' | 'ba';
  teach?: 'ask' | 'session';
};
export type InteractionDef = {
  id: string;
  label: string;
  icon: string;
  minutes: number;
  topic: string;
  will: Record<string, number>;
  ok: Record<string, number>;
  okFx: FxDef;
  failFx: FxDef;
};

type Rules = {
  startChance: number;
  extravertBoost: number;
  noise: number;
  personCooldown: number;
  pairCooldown: number;
  logSize: number;
  pMin: number;
  pMax: number;
  sessionMinutes: number;
  maxStudents: number;
  askedDays: number;
  recentDays: number;
  sadMood: number;
  moodletCap: number;
  needWeight: number;
  memoryMood: Record<string, [number, number]>;
};

export const RULES = interactionsJson.rules as unknown as Rules;
export const INTERACTIONS = interactionsJson.interactions as unknown as InteractionDef[];
export const INTERACTION_BY_ID: Record<string, InteractionDef> = Object.fromEntries(INTERACTIONS.map((i) => [i.id, i]));
export const PERSONALITY = personalityJson.people as unknown as Record<string, Traits>;
export const TOPICS = ['art', 'food', 'money', 'beast', 'bandit', 'love', 'home', 'person', 'rumor'] as const;
export type Topic = (typeof TOPICS)[number];
export const REACTIONS = ['happy', 'angry', 'sad', 'shy', 'surprised'] as const;
export type Reaction = (typeof REACTIONS)[number];

/** 一筆效果（每筆三軸變化都對應一筆 W5 記憶 mem，W7 由記憶重算關係，因此可追到互動 id）。 */
export type Fx =
  | { k: 'bond'; who: string; to: string; axis: Axis3; d: number; mem?: number }
  | { k: 'mood'; who: string; d: number; days: number }
  | { k: 'rumor'; who: string; from: string; rid: number }
  | { k: 'teach'; session: number; teacher: string; students: string[] };

/** wuxia.social.log 的一筆（#574 第 4 節 `{t,a,b,kind,topic,ok,effects}`；另加 id、p＝成功機率、react＝回應表情）。 */
export type SocialEntry = {
  id: number;
  t: number;
  a: string;
  b: string;
  kind: string;
  topic: Topic;
  ok: boolean;
  p: number;
  react: Reaction;
  effects: Fx[];
  /** 多人互動：其他一起的人（指點的其他學生） */
  with?: string[];
  /** 由哪一筆互動引起（請教 → 指點） */
  cause?: number;
  /** 玩家發起 */
  player?: 1;
  minutes: number;
};

export type Session = { id: number; iid: number; teacher: string; students: string[]; start: number; until: number };
export type Moodlet = { k: string; v: number; until: number };
export type KindStat = { n: number; ok: number; pSum: number; pVar: number };

export type A3State = {
  v: 1;
  minute: number;
  traits: Record<string, Traits>;
  moodlets: Record<string, Moodlet[]>;
  /** 互動佔用到哪一分鐘（cid → 遊戲分鐘） */
  busy: Record<string, number>;
  /** 上次發起互動的分鐘（cid） */
  lastStart: Record<string, number>;
  /** 一對人上次互動的分鐘（"a|b"，字典序） */
  pairLast: Record<string, number>;
  log: SocialEntry[];
  sessions: Session[];
  seq: number;
  stats: Record<string, KindStat>;
  /** 每人發起次數（C 類報告：外向 → 互動多） */
  started: Record<string, number>;
};

export function initA3State(): A3State {
  const traits: Record<string, Traits> = {};
  for (const [cid, t] of Object.entries(PERSONALITY)) traits[cid] = { ext: t.ext, calm: t.calm, disc: t.disc, caut: t.caut };
  return {
    v: 1,
    minute: -1,
    traits,
    moodlets: {},
    busy: {},
    lastStart: {},
    pairLast: {},
    log: [],
    sessions: [],
    seq: 1,
    stats: {},
    started: {},
  };
}

export function a3Of(w: WuxiaState | undefined): A3State | undefined {
  if (!w || !w.enabled[A3_SILENT]) return undefined;
  return w.elements[A3_SILENT] as A3State | undefined;
}

export function traitsOf(st: A3State | undefined, cid: string): Traits {
  return st?.traits[cid] ?? PERSONALITY[cid] ?? { ext: 0, calm: 0, disc: 0, caut: 0 };
}

/** 有效的指點時段裡，teacher 與 student 是否一組（A2 的教只在這種組合之間累計）。 */
export function inSession(st: A3State | undefined, teacher: string, student: string, gm: number): boolean {
  return !!st?.sessions.some((s) => s.teacher === teacher && s.until > gm && s.start <= gm && s.students.includes(student));
}

export const logistic = (x: number) => 1 / (1 + Math.exp(-x));
export const round4 = (v: number) => Math.round(v * 1e4) / 1e4;

/** 意願或成功率的線性分數：bias＋Σ 權重×特徵。 */
export function linear(weights: Record<string, number>, f: Record<string, number>): number {
  let s = weights.bias ?? 0;
  for (const [k, w] of Object.entries(weights)) if (k !== 'bias') s += w * (f[k] ?? 0);
  return s;
}

export function successP(def: InteractionDef, f: Record<string, number>): number {
  return round4(Math.max(RULES.pMin, Math.min(RULES.pMax, logistic(linear(def.ok, f)))));
}

/** 難度標籤（玩家選單）：容易 ≥0.65、難 <0.4。 */
export function difficulty(p: number): '容易' | '普通' | '難' {
  return p >= 0.65 ? '容易' : p < 0.4 ? '難' : '普通';
}

/** W7：social 記憶（what＝互動.ok|fail.a|b）對三軸的貢獻；不是 social 記憶回 undefined。 */
export function socialEffect(m: Memory): Partial<Record<Axis3, number>> | undefined {
  if (m.kind !== 'social' || !m.what) return undefined;
  const [kind, res, role] = m.what.split('.');
  const def = INTERACTION_BY_ID[kind];
  if (!def) return undefined;
  const fx = res === 'ok' ? def.okFx : def.failFx;
  return role === 'a' ? fx.a : fx.b;
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
