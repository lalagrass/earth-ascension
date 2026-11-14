// 武俠小鎮 A6（#581）：看、教、練的數值與純函式。不 import a2_master／a4_play 的 index（它們會 import 這裡），避免循環。
import a6Json from '../../../data/wuxia/a6.json';
import type { WuxiaState } from '../state';

export const A6_SPREAD = 'a6-spread';
export const A6 = a6Json as unknown as {
  version: string;
  teach: { baseProf: number; perDifficulty: number };
  watch: { days: number; perDayMax: number; decay: number };
  practice: { base: number };
  rank: { small: number; big: number };
  hintSize: number;
};

/** 開關：enabled 旗標＋requires（a2-master、a4-play；a4-play 本身 requires a2-master），跟 registry.isEnabled 結果相同。 */
export function a6On(w: Pick<WuxiaState, 'enabled'> | undefined): boolean {
  return !!w?.enabled[A6_SPREAD] && !!w.enabled['a2-master'] && !!w.enabled['a4-play'];
}

export type A6State = {
  v: 1;
  /** 看：cid → 招 → [[遊戲日, 那天成功次數]]（最多 days 個不同日；學會就刪） */
  watch: Record<string, Record<string, Array<[number, number]>>>;
  /** 已經跳過「能教了」提示的 "cid|招" */
  teachable: string[];
};
export function initA6State(): A6State {
  return { v: 1, watch: {}, teachable: [] };
}

/** 教的門檻（#581）：120＋70×(難度−1)。a6 關閉時呼叫端用 master.json 的 teach.minTeacherProf。 */
export function minTeacherProf(difficulty: number): number {
  return A6.teach.baseProf + A6.teach.perDifficulty * (difficulty - 1);
}

/** 看一次成功的機率（#581）：好武 ×（1 − 0.15×(難度−1)） */
export function watchChance(haowu: number, difficulty: number): number {
  return Math.max(0, Math.min(1, haowu * (1 - A6.watch.decay * (difficulty - 1))));
}

type KnowLike = { via: 'teach' | 'watch' | 'origin' };
/** 只能從正式學會（教）或開山的人身上看；看來的人不能再被看（#581：譜系樹的「看」最多一層） */
export function watchable(know: Record<string, Record<string, KnowLike>> | undefined, performer: string, move: string): boolean {
  const k = know?.[performer]?.[move];
  return !!k && k.via !== 'watch';
}

/** 這一天這招的成功次數還能不能再記（每天最多 perDayMax 次，所以 count 次最少要 ≥3 個不同日） */
export function watchDayFull(st: A6State, cid: string, move: string, day: number): boolean {
  const e = st.watch[cid]?.[move]?.find((x) => x[0] === day);
  return !!e && e[1] >= A6.watch.perDayMax;
}

/**
 * 記一次看成功。累計 ≥ count 次、且分散在 ≥ days 個不同遊戲日才算看會（回傳 true，並清掉這招的紀錄）。
 * 每天最多記 perDayMax 次（超過的忽略）。
 */
export function recordWatch(st: A6State, cid: string, move: string, day: number, count: number): boolean {
  const per = ((st.watch[cid] ??= {})[move] ??= []);
  let e = per.find((x) => x[0] === day);
  if (!e) per.push((e = [day, 0]));
  if (e[1] < A6.watch.perDayMax) e[1]++;
  const total = per.reduce((a, x) => a + x[1], 0);
  if (total < count || per.length < A6.watch.days) return false;
  delete st.watch[cid][move];
  if (!Object.keys(st.watch[cid]).length) delete st.watch[cid];
  return true;
}

export type Rank = '入門' | '小成' | '大成';
/** 熟練段位（#581）：入門 <120、小成 120–400、大成 ≥400 */
export function rankOf(prof: number): Rank {
  return prof >= A6.rank.big ? '大成' : prof >= A6.rank.small ? '小成' : '入門';
}
