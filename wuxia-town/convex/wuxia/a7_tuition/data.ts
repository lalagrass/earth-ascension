// 武俠小鎮 A7（#584）：束脩與以工代學的狀態型別與純函式（引擎、前端、工具共用）。
// 不 import w03_life（w03_life/data 會 import 這裡讀 a7 排的雜務時段），推導用的資料在 ./econ.ts。
import a7Json from '../../../data/wuxia/a7.json';
import type { WuxiaState } from '../state';
import type { ScheduleBlock } from '../w03_life/data';
import { COACH_CID, MASTER_CID } from '../a2_master/data';

export const A7_TUITION = 'a7-tuition';
export const A7 = a7Json as unknown as {
  version: string;
  wage: number;
  uptime: number;
  mealsPerDay: number;
  endowDays: number;
  tuition: { days: number; share: number };
  chore: { minutes: number; block: number; from: number; to: number };
  dojo: { home: string };
  logSize: number;
  ledgerSize: number;
};
/** 收束脩的人（師父）；其他人再傳不收費 */
export const TEACHERS = [MASTER_CID, COACH_CID];
/** 雜務活動（objects.json 的 dojo-vat、dojo-woodpile；只有日程排到才做） */
export const CHORE_ACTS = ['dojo_haul', 'dojo_chop'];

export type A7Log = {
  id: number;
  day: number;
  gm: number;
  kind: 'pay' | 'work' | 'aid' | 'empty' | 'poor';
  who: string;
  teacher?: string;
  amount?: number;
  text: string;
};
export type A7Ledger = { day: number; total: number; endow: number; income: number; aid: number; spent: number; moved: number; err: number };

export type A7State = {
  v: 1;
  /** 最後處理過的遊戲分鐘／日 */
  minute: number;
  day: number;
  /** 錢袋（文，整數，不能為負）；沒有紀錄＝不在經濟裡（玩家角色） */
  purse: Record<string, number>;
  /** 本業工時累計的分鐘餘數（滿 60 分鐘付一次工價） */
  workMin: Record<string, number>;
  /** 束脩付到哪一日（含）：cid → 師父 → 日 */
  paidUntil: Record<string, Record<string, number>>;
  /** 今天做了幾分鐘雜務：cid → [日, 分鐘] */
  chore: Record<string, [number, number]>;
  /** 每個「正式學會」的招是付束脩還是以工代學學來的："cid|招" → 'paid'|'work' */
  learned: Record<string, 'paid' | 'work'>;
  /** 今日雜務時段（cid → 時段，每日重算；w03-life 的日程讀它） */
  blocks: Record<string, ScheduleBlock[]>;
  blocksDay: number;
  /** 水缸或柴堆見底的那一日（那天所有學生都要先去挑水砍柴才上課） */
  fetchDay: number;
  /** 累計：開局與新人的錢袋、本業收入、接濟（玩家，從外面進來）、飯錢（花到鎮外）、束脩轉手（不增不減） */
  endow: number;
  income: number;
  aid: number;
  spent: number;
  moved: number;
  ledger: A7Ledger[];
  log: A7Log[];
  seq: number;
};

export function initA7State(): A7State {
  return {
    v: 1,
    minute: -1,
    day: 0,
    purse: {},
    workMin: {},
    paidUntil: {},
    chore: {},
    learned: {},
    blocks: {},
    blocksDay: -1,
    fetchDay: -1,
    endow: 0,
    income: 0,
    aid: 0,
    spent: 0,
    moved: 0,
    ledger: [],
    log: [],
    seq: 1,
  };
}

/** 開關：a7-tuition ＋ requires（a6-spread、w03-life） */
export function a7On(w: Pick<WuxiaState, 'enabled'> | undefined): boolean {
  return !!w?.enabled[A7_TUITION] && !!w.enabled['a6-spread'] && !!w.enabled['w03-life'] && !!w.enabled['a2-master'] && !!w.enabled['a4-play'];
}
export function a7Of(w: WuxiaState | undefined): A7State | undefined {
  if (!w || !a7On(w)) return undefined;
  return w.elements[A7_TUITION] as A7State | undefined;
}

/** a7 排的雜務時段（lifeSchedCtx 讀；只回今天的）。a7 關閉時 undefined。 */
export function a7Blocks(w: WuxiaState | undefined, day: number | undefined): Record<string, ScheduleBlock[]> | undefined {
  const st = a7Of(w);
  if (!st || day === undefined || st.blocksDay !== day) return undefined;
  return Object.keys(st.blocks).length ? st.blocks : undefined;
}

export function choreMinutesToday(st: A7State, cid: string, day: number): number {
  const c = st.chore[cid];
  return c && c[0] === day ? c[1] : 0;
}
export function choreDone(st: A7State, cid: string, day: number): boolean {
  return choreMinutesToday(st, cid, day) >= A7.chore.minutes;
}
/** 付過束脩、今天還在效期內的師父（給哪位師父付的） */
export function paidTeachers(st: A7State, cid: string, day: number): string[] {
  return TEACHERS.filter((t) => (st.paidUntil[cid]?.[t] ?? -1) >= day);
}
export type StudentKind = 'paid' | 'work';
/**
 * 今天這人是不是學生（#584）：付了束脩（任一位師父，效期內）＝付束脩；或今天做滿雜務＝以工代學。
 * 水缸／柴堆見底的那天（fetchDay）連付了束脩的人也要先做滿雜務才上課。兩者都有時以付束脩為主。
 */
export function studentKind(st: A7State, cid: string, day: number, teacher?: string): StudentKind | undefined {
  const paid = teacher ? (st.paidUntil[cid]?.[teacher] ?? -1) >= day : paidTeachers(st, cid, day).length > 0;
  const worked = choreDone(st, cid, day);
  if (st.fetchDay === day && !worked) return undefined;
  return paid ? 'paid' : worked ? 'work' : undefined;
}

/**
 * 這位師父今天能不能教這個學生（a2_master pickTeach 用）：不是收束脩的師父、或學生不在經濟裡（玩家）＝不管；
 * 其餘要是學生（付了束脩、或今天做滿雜務），沒付也沒做工的人只能「看」（A6 規則）。
 * a7 關閉時永遠 true（跟 A6 逐位元組相同）。
 */
export function a7CanTeach(w: WuxiaState, teacher: string, student: string): boolean {
  const st = a7Of(w);
  if (!st || !TEACHERS.includes(teacher) || st.purse[student] === undefined) return true;
  return studentKind(st, student, st.day, teacher) !== undefined;
}

export function pushLog(st: A7State, e: Omit<A7Log, 'id'>) {
  st.log.push({ id: st.seq++, ...e });
  if (st.log.length > A7.logSize) st.log.splice(0, st.log.length - A7.logSize);
}

/** 教成了一招：記這招是付束脩還是以工代學學來的（只記兩位師父教的）。回傳 'paid'|'work'|undefined。 */
export function a7NoteTeach(w: WuxiaState, teacher: string, student: string, move: string): StudentKind | undefined {
  const st = a7Of(w);
  if (!st || !TEACHERS.includes(teacher) || st.purse[student] === undefined) return undefined;
  const kind = studentKind(st, student, st.day, teacher) ?? 'work';
  st.learned[`${student}|${move}`] = kind;
  return kind;
}
