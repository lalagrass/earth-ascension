// 武俠小鎮 A2（#575，元素 id `a2-master`）：招式表、熟練度、四條傳承管道的純函式與型別。
// 引擎、前端、工具共用；不碰世界狀態以外的東西，不 import 其他元素的 index（避免循環 import）。
import taijiJson from '../../../data/wuxia/arts/taiji.json';
import laohuaiJson from '../../../data/wuxia/arts/laohuai.json';
import masterJson from '../../../data/wuxia/master.json';
import townsfolkJson from '../../../data/wuxia/townsfolk.json';
import type { WuxiaState } from '../state';
import type { ScheduleBlock } from '../w03_life/data';
import { A6, a6On, minTeacherProf } from '../a6_spread/data';

export const A2_MASTER = 'a2-master';

export type BodyNeed = { stance?: number; power?: number };
export type MoveDef = {
  id: string;
  name: string;
  /** 屬於哪一門武學（art id） */
  family: string;
  difficulty: number;
  prereq: string[];
  bodyNeed: BodyNeed;
  originProf: number;
};
export type ArtDef = { id: string; name: string; origin: string; moves: MoveDef[] };

function loadArt(j: any): ArtDef {
  return {
    id: j.id,
    name: j.name,
    origin: j.origin,
    moves: j.moves.map((m: any) => ({
      id: m.id,
      name: m.name,
      family: j.id,
      difficulty: m.difficulty,
      prereq: [...m.prereq],
      bodyNeed: { ...(m.bodyNeed ?? {}) },
      originProf: m.originProf,
    })),
  };
}

export const ARTS: ArtDef[] = [loadArt(taijiJson), loadArt(laohuaiJson)];
export const ART_BY_ID: Record<string, ArtDef> = Object.fromEntries(ARTS.map((a) => [a.id, a]));
export const MOVES: MoveDef[] = ARTS.flatMap((a) => a.moves);
export const MOVE_BY_ID: Record<string, MoveDef> = Object.fromEntries(MOVES.map((m) => [m.id, m]));

export type Policy = 'open' | 'selective' | 'hidden';
export const MASTER = masterJson as unknown as {
  master: string;
  arriveDay: number;
  arriveMinute: number;
  policy: Policy;
  teach: { minutes: number; minTeacherProf: number; startProf: number; capFactor: number; maxStudents: number; reteachMargin: number; radius: number; reteachClose: number };
  watch: { radius: number; count: number; maxDifficulty: number; prof: number; cap: number; segmentMinutes: number };
  practice: { base: number; exponent: number; teacherBonus: number; decayAfterDays: number; decayFloor: number; decayRate: number; acts: Record<string, number> };
  fist: { bodyFactor: number; flawedFactor: number; weights: Record<string, number>; max: number };
  interest: { arrival: number; sawForm: number; sawWin: number; watchMin: number; askMin: number; reputeWeight: number };
  blocks: { form: [number, number]; ask: [number, number] };
  selective: { close: number; maxDisciples: number };
  coach: { calm: number; respect: number; maxDifficultyOpen: number };
  switch: { respectGap: number; respectMin: number };
  hintSize: number;
  recordSize: number;
};
export const MASTER_CID = MASTER.master;
export const COACH_CID = 'zhou-jiaotou';

export type Profile = {
  id: string;
  name: string;
  sprite: string;
  role: string;
  home: string;
  workplace: string;
  age: number;
  haowu: number;
  skills: Record<string, number>;
  traits: { calm: number; brave: number; curious: number; kind: number };
  identity: string;
  plan: string;
  voice: string;
  taboo: string;
  schedule: { worker: boolean; blocks: ScheduleBlock[] };
};
const TF = townsfolkJson as unknown as { draw: number; pool: Profile[]; master: Profile };
export const POOL: Profile[] = TF.pool;
export const MASTER_PROFILE: Profile = TF.master;
export const DRAW_COUNT = TF.draw;
const TFB = townsfolkJson as unknown as { baseHaowu: Record<string, number>; baseCalm: Record<string, number> };
/** 原本 6 位的好武（townsfolk.json baseHaowu）。 */
export const BASE_HAOWU: Record<string, number> = TFB.baseHaowu;
export const BASE_CALM: Record<string, number> = TFB.baseCalm;

export function haowuOf(cid: string): number {
  if (cid in BASE_HAOWU) return BASE_HAOWU[cid];
  if (cid === MASTER_CID) return MASTER_PROFILE.haowu;
  return POOL.find((p) => p.id === cid)?.haowu ?? 0;
}

// ---------- 狀態 ----------

export type Via = 'teach' | 'watch' | 'origin';
export type Know = {
  prof: number;
  from: string | null;
  via: Via;
  day: number;
  flawed: boolean;
  cap?: number;
  /** 最後一次練這招的遊戲日（退步用） */
  last?: number;
};
export type TeachRecord = {
  id: number;
  day: number;
  gm: number;
  /** 教的人（看：被看的人） */
  from: string;
  to: string;
  move: string;
  via: Via;
  /** 教的人當時的 prof */
  fromProf: number;
  cap: number;
  flawed: boolean;
  /** 原本就會（重教提高上限／清走樣） */
  again?: boolean;
  /** 這次教學前前置招與身體門檻是否都滿足（A2 驗收直接查） */
  prereqOk: boolean;
  bodyOk: boolean;
};
export type Hint = { id: number; gm: number; kind: 'teach' | 'watch' | 'arrive' | 'switch' | 'bow' | 'rival' | 'ask' | 'skill'; text: string; who?: string; record?: number };
export type DailyCount = { day: number; learners: Record<string, number> };
export type SwitchRecord = { day: number; gm: number; disciple: string; fromMaster: string; toMaster: string; respectNew: number; respectOld: number };

export type A2State = {
  v: 1;
  minute: number;
  policy: Policy;
  /** 進鎮日；null＝這局沒有大師（no-master 劇本） */
  arriveDay: number | null;
  arrivedAt?: number;
  masterPid?: string;
  know: Record<string, Record<string, Know>>;
  watch: Record<string, Record<string, number>>;
  /** 師徒同在一處累計分鐘，鍵 "教的人|學的人"（教完歸零） */
  together: Record<string, number>;
  /** 正在練哪一招：pid → [活動開始的遊戲分鐘, 招 id] */
  practice: Record<string, [number, string]>;
  interest: Record<string, number>;
  artRepute: Record<string, Record<string, number>>;
  /** 「看到大師晨練」每人每日一筆：cid → 最後一次記的日 */
  sawDay: Record<string, number>;
  records: TeachRecord[];
  hints: Hint[];
  daily: DailyCount[];
  switches: SwitchRecord[];
  /** 日程加的時段（cid → 時段），每日重算 */
  blocks: Record<string, ScheduleBlock[]>;
  blocksDay: number;
  dayDone: number;
  sparSeen: number;
  seq: number;
};

export function initA2State(policy: Policy = MASTER.policy, arriveDay: number | null = MASTER.arriveDay): A2State {
  return {
    v: 1,
    minute: -1,
    policy,
    arriveDay,
    know: {},
    watch: {},
    together: {},
    practice: {},
    interest: {},
    artRepute: {},
    sawDay: {},
    records: [],
    hints: [],
    daily: [],
    switches: [],
    blocks: {},
    blocksDay: -1,
    dayDone: 0,
    sparSeen: 0,
    seq: 1,
  };
}

export function a2Of(w: WuxiaState | undefined): A2State | undefined {
  if (!w || !w.enabled[A2_MASTER]) return undefined;
  return w.elements[A2_MASTER] as A2State | undefined;
}

// ---------- 純規則 ----------

const r2 = (v: number) => Math.round(v * 100) / 100;

export function capOf(k: Know): number {
  return k.cap ?? MASTER.fist.max;
}

/** 推導拳腳（#575）：體能分＋Σ(prof × difficulty 權重)，flawed 打七折；上限 1000。 */
export function derivedFist(skills: { power: number; stance: number; stamina: number }, know: Record<string, Know> | undefined): number {
  const F = MASTER.fist;
  let v = (F.bodyFactor * (skills.power + skills.stance + skills.stamina)) / 3;
  for (const [id, k] of Object.entries(know ?? {})) {
    const m = MOVE_BY_ID[id];
    if (!m) continue;
    v += k.prof * (F.weights[String(m.difficulty)] ?? 0) * (k.flawed ? F.flawedFactor : 1);
  }
  return Math.max(0, Math.min(F.max, Math.round(v)));
}

export function prereqOk(know: Record<string, Know> | undefined, m: MoveDef): boolean {
  return m.prereq.every((p) => !!know?.[p]);
}
export function bodyOk(skills: { stance: number; power: number } | undefined, m: MoveDef): boolean {
  const s = skills ?? { stance: 0, power: 0 };
  return (m.bodyNeed.stance ?? 0) <= s.stance && (m.bodyNeed.power ?? 0) <= s.power;
}

/** 這招從 cid 一路往上的來源鏈（含自己），遇到 origin 或斷掉為止；防循環。 */
export function chainOf(know: Record<string, Record<string, Know>>, cid: string, move: string): string[] {
  const out: string[] = [];
  let cur: string | null = cid;
  while (cur && !out.includes(cur)) {
    out.push(cur);
    const k: Know | undefined = know[cur]?.[move];
    if (!k || k.via === 'origin') break;
    cur = k.from;
  }
  return out;
}

/**
 * 「教」與「再傳」（#575）：學的人得到 prof 50、上限＝教的人當時 prof × 0.9；走樣跟著傳下去；
 * 原本只是看來的（flawed）被沒走樣的人正式教過，flawed 消除。回傳紀錄（不寫 id）。
 */
export function applyTeach(
  know: Record<string, Record<string, Know>>,
  teacher: string,
  student: string,
  moveId: string,
  day: number,
  gm: number,
  studentSkills: { stance: number; power: number } | undefined,
): Omit<TeachRecord, 'id'> {
  const T = MASTER.teach;
  const tk = know[teacher][moveId];
  const m = MOVE_BY_ID[moveId];
  const sk = (know[student] ??= {});
  const pre = prereqOk(sk, m);
  const body = bodyOk(studentSkills, m);
  const cap = Math.floor(tk.prof * T.capFactor);
  const old = sk[moveId];
  const flawed = tk.flawed;
  if (!old) {
    sk[moveId] = { prof: Math.min(T.startProf, cap), from: teacher, via: 'teach', day, flawed, cap };
  } else {
    old.via = 'teach';
    old.from = teacher;
    old.day = day;
    old.flawed = flawed;
    old.cap = cap;
    old.prof = r2(Math.min(cap, Math.max(old.prof, T.startProf)));
  }
  return { day, gm, from: teacher, to: student, move: moveId, via: 'teach', fromProf: tk.prof, cap, flawed, again: !!old, prereqOk: pre, bodyOk: body };
}

/** 「看」（#575）：累計 10 次、只限 difficulty ≤ 2 → prof 30、flawed、上限 150。 */
export function applyWatch(
  know: Record<string, Record<string, Know>>,
  performer: string,
  watcher: string,
  moveId: string,
  day: number,
  gm: number,
): Omit<TeachRecord, 'id'> | undefined {
  const W = MASTER.watch;
  const m = MOVE_BY_ID[moveId];
  if (!m || m.difficulty > W.maxDifficulty) return undefined;
  const sk = (know[watcher] ??= {});
  if (sk[moveId]) return undefined;
  sk[moveId] = { prof: W.prof, from: performer, via: 'watch', day, flawed: true, cap: W.cap };
  return { day, gm, from: performer, to: watcher, move: moveId, via: 'watch', fromProf: know[performer]?.[moveId]?.prof ?? 0, cap: W.cap, flawed: true, prereqOk: true, bodyOk: true };
}

/** 練招成長（每遊戲分鐘；A6 開著時 base 換成 a6.json 的 practice.base，見該檔推導）：base × 權重 × (1 − prof/1000)^2 × 加成，到 cap 為止。回傳新 prof。 */
export function practiceGain(k: Know, actWeight: number, bonus: number, minutes: number, base?: number): number {
  const P = MASTER.practice;
  const cap = capOf(k);
  if (k.prof >= cap) return k.prof;
  const room = Math.max(0, 1 - k.prof / MASTER.fist.max);
  const g = (base ?? P.base) * actWeight * Math.pow(room, P.exponent) * bonus * minutes;
  return Math.min(cap, Math.round((k.prof + g) * 1e4) / 1e4);
}

/** 每日退步：超過 300 的部分，14 日沒練每日退 1%（退到 300 為止）。 */
export function decayed(k: Know, day: number): number {
  const P = MASTER.practice;
  if (k.via === 'origin') return k.prof;
  if (k.prof <= P.decayFloor) return k.prof;
  if (day - (k.last ?? k.day) <= P.decayAfterDays) return k.prof;
  return Math.max(P.decayFloor, Math.round((k.prof - (k.prof - P.decayFloor) * P.decayRate) * 1e4) / 1e4);
}

/** 會 ≥ 1 招這門武學的人數 */
export function learnersOf(st: A2State, art: string): string[] {
  return Object.keys(st.know)
    .filter((cid) => Object.keys(st.know[cid]).some((m) => MOVE_BY_ID[m]?.family === art && st.know[cid][m].via !== 'origin'))
    .sort();
}

/** 這招此刻在打哪一招（大師晨練與示範：每 5 分鐘換一招，依招式表順序循環）。 */
export function formMove(art: ArtDef, since: number, gm: number): MoveDef {
  const seg = Math.floor((gm - since) / MASTER.watch.segmentMinutes);
  return art.moves[((seg % art.moves.length) + art.moves.length) % art.moves.length];
}

/** 教的人要多熟才能教這一招：a6 開著＝120＋70×(難度−1)（#581），關閉＝master.json 的 400（A2）。 */
export function teachThreshold(w: WuxiaState | undefined, m: MoveDef): number {
  return a6On(w) ? minTeacherProf(m.difficulty) : MASTER.teach.minTeacherProf;
}
/** 練招的 base：a6 開著時用自己的曲線（#581），關閉時沿用 master.json（A2）。 */
export function practiceBase(w: WuxiaState | undefined): number {
  return a6On(w) ? A6.practice.base : MASTER.practice.base;
}
