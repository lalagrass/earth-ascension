// 武俠小鎮 A7（#584，元素 id `a7-tuition`）：束脩與以工代學。
// - 錢：單一貨幣「文」，每人一個錢袋。收入＝做自己本業的活動每遊戲小時得「工價」；支出＝每吃一頓飯付飯錢。
//   常數只有 a7.json 的 wage 一個旋鈕，其餘由它推導（./econ.ts）。守恆：全鎮錢總和 ＝ 開局錢袋＋收入＋接濟−飯錢（束脩轉手不增不減），每日核對誤差 0。
// - 束脩：張三丰與周教頭收學生要束脩，每 30 日一付；付了就是學生，不限人數（A2 的「一堂課 ≤3 人」維持，那是課堂容量）。
// - 以工代學：想學卻付不起的人，每天替武館做 1 時辰雜務（挑水到武館水缸、砍柴到武館柴堆），做滿當天算學生；沒付也沒做工的只能「看」（A6 規則）。
//   武館水缸、柴堆每天被大師與學生用掉；見底的那天所有學生都要先去挑水砍柴才上課。
// - 玩家的「接濟」可以選「替他付這個月束脩」（a4_play intervene）。
// 規則本身不耗 game.rng()；元素關閉時跟 A6 逐位元組相同（quick q3：--off a7-tuition）。
import type { Game } from '../../aiTown/game';
import type { WuxiaElement } from '../registry';
import type { WuxiaState } from '../state';
import { gameMinutes, readClock } from '../clock';
import { W03_LIFE } from '../w03_life';
import type { LifeState } from '../w03_life';
import { NEEDS_CONFIG } from '../w03_life/data';
import { currentBlock, lifeSchedCtx } from '../w03_life/data';
import type { ScheduleBlock } from '../w03_life/data';
import { A2_MASTER, COACH_CID, MASTER_CID } from '../a2_master/data';
import type { A2State } from '../a2_master/data';
import type { BondState } from '../w07_bond/data';
import { profileById } from '../w02_folk';
import { A7, A7_TUITION, A7State, CHORE_ACTS, TEACHERS, a7On, choreDone, choreMinutesToday, initA7State, paidTeachers, pushLog, studentKind } from './data';
import { MEAL_PRICE, TUITION_PRICE, choreYield, dojoUse, endowment, jobActsOf } from './econ';

export * from './data';
export { MEAL_PRICE, TUITION_PRICE } from './econ';

export const a7TuitionElement: WuxiaElement = {
  id: A7_TUITION,
  requires: ['a6-spread', 'w03-life'],
  init: (state: WuxiaState) => {
    state.elements[A7_TUITION] = initA7State();
    const life = state.elements[W03_LIFE] as LifeState | undefined;
    if (life) life.ev = [];
  },
  tick: (game, now) => tickA7(game, now),
};

const jobMemo = new Map<string, Set<string>>();
function jobActsMemo(cid: string): Set<string> {
  let s = jobMemo.get(cid);
  if (!s) jobMemo.set(cid, (s = jobActsOf(cid)));
  return s;
}
const nameOf = (cid: string) => profileById(cid)?.name ?? cid;

export function a7State(w: WuxiaState): A7State | undefined {
  return w.elements[A7_TUITION] as A7State | undefined;
}

/** 全鎮錢袋總和 */
export function totalPurse(st: A7State): number {
  let t = 0;
  for (const v of Object.values(st.purse)) t += v;
  return t;
}

/** 雜務時段：07:00–16:40 之間找一段不碰吃飯、睡覺、晨練、請教的 150 分鐘；找不到＝今天做不了（回 undefined） */
function choreWindow(w: WuxiaState, cid: string, day: number): ScheduleBlock | undefined {
  const C = A7.chore;
  const ctx = lifeSchedCtx(w, day);
  const PROTECT = new Set(['eat', 'sleep', 'cook', 'practice_form', 'watch_form', 'instruct', 'taiji_form', 'meditate']);
  for (let s = C.from; s + C.block <= C.to; s += 30) {
    let ok = true;
    for (let m = s; m < s + C.block && ok; m += 10) {
      const b = currentBlock(cid, m, ctx);
      if (b && (b.do.some((a) => PROTECT.has(a)) || b.label.startsWith('有人指路') || b.label.startsWith('經人引薦'))) ok = false;
    }
    if (ok) return { from: s, to: s + C.block, label: '替武館做雜務（以工代學）', do: [...CHORE_ACTS] };
  }
  return undefined;
}

function dojoStock(life: LifeState) {
  return (life.stock[A7.dojo.home] ??= { ...NEEDS_CONFIG.stock.initial });
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** 一個人能不能由玩家「接濟」付這個月束脩；成功就付（錢從外面來）。回傳 ok／原因。a4_play 的 feed 用。 */
export function aidTuition(w: WuxiaState, target: string, teacher: string, gm: number): { ok: boolean; reason: string } {
  const st = a7State(w);
  if (!st || !a7On(w)) return { ok: false, reason: '束脩沒開' };
  if (!TEACHERS.includes(teacher)) return { ok: false, reason: '只有兩位師父收束脩' };
  if (st.purse[teacher] === undefined) return { ok: false, reason: '師父還沒到' };
  if (st.purse[target] === undefined) return { ok: false, reason: '找不到這個人' };
  const day = readClock(gm).day;
  if ((st.paidUntil[target]?.[teacher] ?? -1) >= day) return { ok: false, reason: '這個月的束脩已經付過了' };
  st.aid += TUITION_PRICE;
  st.purse[teacher] += TUITION_PRICE;
  (st.paidUntil[target] ??= {})[teacher] = day + A7.tuition.days - 1;
  pushLog(st, { day, gm, kind: 'aid', who: target, teacher, amount: TUITION_PRICE, text: `有人替${nameOf(target)}付了${nameOf(teacher)}這個月的束脩（${TUITION_PRICE} 文）` });
  return { ok: true, reason: `替${nameOf(target)}付了${nameOf(teacher)}這個月的束脩` };
}

function daily(w: WuxiaState, st: A7State, life: LifeState, gm: number, day: number) {
  const a2 = w.elements[A2_MASTER] as A2State | undefined;
  const bond = w.enabled['w07-bond'] ? (w.elements['w07-bond'] as BondState | undefined) : undefined;
  const cids = Object.keys(life.people)
    .sort()
    .map((pid) => life.people[pid])
    .filter((p) => !p.player && st.purse[p.cid] !== undefined)
    .map((p) => p.cid);
  const present = (t: string) => cids.includes(t);

  // 昨天的錢帳核對（守恆）：全鎮總和 ＝ 開局＋收入＋接濟−飯錢，束脩轉手不增不減
  const total = totalPurse(st);
  const expect = st.endow + st.income + st.aid - st.spent;
  st.ledger.push({ day: day - 1, total, endow: st.endow, income: st.income, aid: st.aid, spent: st.spent, moved: st.moved, err: total - expect });
  if (st.ledger.length > A7.ledgerSize) st.ledger.splice(0, st.ledger.length - A7.ledgerSize);

  // 武館水缸、柴堆：昨天用掉（每人三餐的份：大師、周教頭、昨天的學生）
  const stock = dojoStock(life);
  const yesterday = day - 1;
  const students = cids.filter((c) => !TEACHERS.includes(c) && (paidTeachers(st, c, yesterday).length > 0 || choreMinutesToday(st, c, yesterday) >= A7.chore.minutes));
  const users = students.length + TEACHERS.filter(present).length;
  const use = dojoUse();
  stock.water = Math.max(0, round2(stock.water - use.water * users));
  stock.wood = Math.max(0, round2(stock.wood - use.wood * users));
  if (stock.water < 1 || stock.wood < 1) {
    st.fetchDay = day;
    pushLog(st, { day, gm, kind: 'empty', who: COACH_CID, text: `武館的${stock.water < 1 ? '水缸' : '柴堆'}見底了，今天的課先去挑水砍柴` });
  }

  // 想學的人：付束脩（付得起）或以工代學（付不起）
  const needChore: string[] = [];
  for (const cid of cids) {
    if (TEACHERS.includes(cid)) continue;
    let unpaid = false;
    for (const t of TEACHERS) {
      if (!present(t) || !a2 || !wantsFromTeacher(w, a2, bond, cid, t, day)) continue;
      if ((st.paidUntil[cid]?.[t] ?? -1) >= day) continue;
      if (st.purse[cid] >= TUITION_PRICE) {
        st.purse[cid] -= TUITION_PRICE;
        st.purse[t] += TUITION_PRICE;
        st.moved += TUITION_PRICE;
        (st.paidUntil[cid] ??= {})[t] = day + A7.tuition.days - 1;
        pushLog(st, { day, gm, kind: 'pay', who: cid, teacher: t, amount: TUITION_PRICE, text: `${nameOf(cid)}付了${nameOf(t)}這個月的束脩（${TUITION_PRICE} 文）` });
      } else unpaid = true;
    }
    const isStudent = paidTeachers(st, cid, day).length > 0;
    if (unpaid) needChore.push(cid);
    else if (isStudent && st.fetchDay === day) needChore.push(cid);
  }

  // 今天的雜務時段（先清掉昨天的，才不會算進 choreWindow 看到的日程）
  st.blocks = {};
  st.blocksDay = day;
  const out: Record<string, ScheduleBlock[]> = {};
  for (const cid of needChore) {
    const b = choreWindow(w, cid, day);
    if (b) out[cid] = [b];
  }
  st.blocks = out;
}

/** 這人今天想不想跟這位師父學：師父的徒弟；大師＝今天有「向大師請教」時段；周教頭＝今天日程排到武館練功 */
function wantsFromTeacher(w: WuxiaState, a2: A2State, bond: BondState | undefined, cid: string, teacher: string, day: number): boolean {
  if (bond?.disciples[cid]?.master === teacher) return true;
  if (teacher === MASTER_CID) return a2.arrivedAt !== undefined && !!a2.blocks[cid]?.some((b) => b.label.startsWith('向'));
  const ctx = lifeSchedCtx(w, day);
  for (let m = 420; m < 720; m += 30) {
    const b = currentBlock(cid, m, ctx);
    if (b?.do.some((a) => ['hit_dummy', 'hit_sandbag', 'stand_post', 'lift_stone'].includes(a))) return true;
  }
  return false;
}

export function tickA7(game: Game, now: number) {
  const w = game.world.wuxia!;
  if (w.clockEpoch === undefined || !a7On(w)) return;
  const life = w.elements[W03_LIFE] as LifeState | undefined;
  if (!life) return;
  let st = a7State(w);
  if (!st) {
    st = initA7State();
    w.elements[A7_TUITION] = st;
  }
  life.ev ??= [];
  const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
  if (gm <= st.minute) return;
  st.minute = gm;
  const day = readClock(gm).day;

  // 1. 新來的人（含玩家以外的大師）拿到初始錢袋
  for (const pid of Object.keys(life.people).sort()) {
    const p = life.people[pid];
    if (p.player || st.purse[p.cid] !== undefined) continue;
    const e = endowment(p.cid);
    st.purse[p.cid] = e;
    st.endow += e;
  }

  // 2. 排空事件佇列：做完本業 → 工價；開始吃飯 → 飯錢；做完雜務 → 武館水缸／柴堆
  const evs = life.ev.splice(0, life.ev.length);
  const jobs: Record<string, Set<string>> = {};
  for (const [cid, kind, act, egm, minutes] of evs) {
    if (st.purse[cid] === undefined) continue;
    const eday = readClock(egm).day;
    if (kind === 's') {
      if (act === 'eat') {
        const pay = Math.min(st.purse[cid], MEAL_PRICE);
        st.purse[cid] -= pay;
        st.spent += pay;
      }
      continue;
    }
    if (CHORE_ACTS.includes(act)) {
      const c = st.chore[cid];
      st.chore[cid] = c && c[0] === eday ? [eday, c[1] + minutes] : [eday, minutes];
      if (minutes >= 1) {
        const y = choreYield(act);
        const stock = dojoStock(life);
        if (minutes >= 60) {
          if (y.water) stock.water = Math.min(NEEDS_CONFIG.stock.max.water, round2(stock.water + y.water));
          if (y.wood) stock.wood = Math.min(NEEDS_CONFIG.stock.max.wood, round2(stock.wood + y.wood));
        }
      }
      if (choreDone(st, cid, eday) && (st.chore[cid][1] - minutes) < A7.chore.minutes)
        pushLog(st, { day: eday, gm: egm, kind: 'work', who: cid, text: `${nameOf(cid)}替武館挑水砍柴，做滿了今天的雜務` });
      continue;
    }
    const acts = (jobs[cid] ??= jobActsMemo(cid));
    if (acts.has(act) && minutes > 0) {
      const m = (st.workMin[cid] ?? 0) + minutes;
      const pay = Math.floor(m / 60) * A7.wage;
      st.workMin[cid] = m % 60;
      st.purse[cid] += pay;
      st.income += pay;
    }
  }

  // 3. 換日：核對錢帳、武館用量、收束脩、排雜務
  if (day > st.day) {
    if (st.day > 0) daily(w, st, life, gm, day);
    else st.blocksDay = day;
    st.day = day;
  }
}

export { studentKind };
