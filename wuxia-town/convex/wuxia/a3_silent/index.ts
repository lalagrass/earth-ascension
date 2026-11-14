// 武俠小鎮 A3（#574，元素 id `a3-silent`）：無言互動。
// 兩人在同一地點、都有空時，發起方用規則（心念 W5＋關係 W7＋人格＋心情＋傳聞 W8）替每種做得到的互動打分，
// 取最高分（加一點 game.rng() 擾動）；成敗＝logistic(加權分數) 再擲 game.rng()。效果只有五種：關係三軸（經 W5 記憶、
// W7 重算）、念頭／心情、事件記憶、傳聞（W8 hear，有走樣）、小額傳授（請教 → 指點時段，A2 的教）。
// 開著本元素時：W3 不再發起 AI Town 對話、W6／W8 不排 LLM 改寫（預設 0 次 LLM，#574 驗收 A）。
import type { Game } from '../../aiTown/game';
import type { WuxiaElement } from '../registry';
import type { WuxiaState } from '../state';
import { gameMinutes, readClock } from '../clock';
import { W03_LIFE, LifeState, Person, personPlace } from '../w03_life';
import { OBJECTS, LEISURE } from '../w03_life/data';
import { W04_DOJO, DojoState } from '../w04_dojo';
import { W05_MIND, remember } from '../w05_mind';
import type { MindState, Memory } from '../w05_mind/data';
import { hasThought } from '../w05_mind/data';
import { W07_BOND, bondBetween, masterOf } from '../w07_bond/data';
import { W08_JIANGHU } from '../w08_jianghu/data';
import type { JianghuState, Rumor } from '../w08_jianghu/data';
import { hear, heardOf, knows } from '../w08_jianghu/common';
import type { Ctx } from '../w08_jianghu/common';
import { A2_MASTER, A2State } from '../a2_master/data';
import { pickTeach } from '../a2_master';
import { SOCIAL_HOOK } from '../w09_player/data';
import {
  A3_SILENT,
  A3State,
  Fx,
  INTERACTIONS,
  INTERACTION_BY_ID,
  InteractionDef,
  RULES,
  Reaction,
  SocialEntry,
  Topic,
  difficulty,
  initA3State,
  linear,
  pairKey,
  round4,
  successP,
  traitsOf,
} from './data';

export * from './data';

// W9 玩家選單送來的互動（kind 'social'）由這裡接；見 w09_player/data.ts SOCIAL_HOOK
SOCIAL_HOOK.act = (game, now, a, b, kind) => playerSocial(game, now, a, b, kind);

export const a3SilentElement: WuxiaElement = {
  id: A3_SILENT,
  requires: [W03_LIFE, W05_MIND, W07_BOND],
  init: (state: WuxiaState) => {
    state.elements[A3_SILENT] = initA3State();
  },
  tick: (game, now) => tickA3(game, now),
};

/** 「有空」的活動：休閒、吃飯，以及茶館／武館／廣場／河邊的事（邊做邊互動）；睡覺不算 */
const SOCIAL_PLACES = new Set(['teahouse', 'dojo', 'plaza', 'river']);
const FREE_ACTS = new Set<string>([...LEISURE, 'eat']);
for (const o of OBJECTS) if (SOCIAL_PLACES.has(o.place)) for (const a of o.activities) FREE_ACTS.add(a.id);
FREE_ACTS.delete('sleep');
/** 互動距離（格） */
const RADIUS = 8;

type P = { pid: string; cid: string; person: Person; x: number; y: number; place: string; free: boolean };

/** 計算特徵時需要的世界片段（純函式；畫面上的玩家選單也用） */
type View = {
  w: WuxiaState;
  st: A3State;
  gm: number;
  life: LifeState;
  mind?: MindState;
  jh?: JianghuState;
  dojo?: DojoState;
  a2?: A2State;
  pidOf: Record<string, string>;
};

function viewOf(w: WuxiaState, gm: number): View | undefined {
  const st = w.elements[A3_SILENT] as A3State | undefined;
  const life = w.elements[W03_LIFE] as LifeState | undefined;
  if (!st || !life || !w.enabled[A3_SILENT]) return undefined;
  const pidOf: Record<string, string> = {};
  for (const pid of Object.keys(life.people).sort()) pidOf[life.people[pid].cid] = pid;
  return {
    w,
    st,
    gm,
    life,
    pidOf,
    mind: w.enabled[W05_MIND] ? (w.elements[W05_MIND] as MindState | undefined) : undefined,
    jh: w.enabled[W08_JIANGHU] ? (w.elements[W08_JIANGHU] as JianghuState | undefined) : undefined,
    dojo: w.enabled[W04_DOJO] ? (w.elements[W04_DOJO] as DojoState | undefined) : undefined,
    a2: w.enabled[A2_MASTER] ? (w.elements[A2_MASTER] as A2State | undefined) : undefined,
  };
}

const clip = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));

function memoriesOf(v: View, cid: string): Memory[] {
  const pid = v.pidOf[cid];
  return (pid && v.mind?.people[pid]?.memories) || [];
}

/** 心情 0–100：50＋念頭（互動留下的、近期記憶）−需求（平均超過 50 的部分×needWeight）。 */
export function moodOf(v: View, cid: string): number {
  let m = 50;
  for (const x of v.st.moodlets[cid] ?? []) if (x.until > v.gm) m += x.v;
  const since = v.gm - 3 * 1440;
  for (const mem of memoriesOf(v, cid)) {
    if (mem.t < since) continue;
    const mm = RULES.memoryMood[mem.kind];
    if (mm && v.gm - mem.t < mm[1] * 1440) m += mm[0];
  }
  const pid = v.pidOf[cid];
  const n = pid ? v.life.people[pid]?.needs : undefined;
  if (n) m -= RULES.needWeight * Math.max(0, (n.hunger + n.fatigue + n.boredom) / 3 - 50);
  return Math.round(clip(m, 0, 100));
}

function freshRumor(v: View, teller: string, listener: string): Rumor | undefined {
  if (!v.jh) return undefined;
  const mine = (v.jh.known[teller] ?? []).filter((h) => !knows(v.jh!, listener, h.rid) && v.gm - h.gm < 7 * 1440);
  const h = mine[mine.length - 1];
  return h ? v.jh.rumors.find((r) => r.id === h.rid) : undefined;
}

function canTeach(v: View, teacher: string, student: string): boolean {
  if (!v.a2) return false;
  return !!pickTeach(v.w, v.a2, v.mind, teacher, student, v.dojo?.skills[student]);
}

function recentSocial(v: View, owner: string, other: string, test: (what: string) => boolean, days: number, after?: (what: string) => boolean): boolean {
  const since = v.gm - days * 1440;
  let hit = false;
  for (const m of memoriesOf(v, owner)) {
    if (m.t < since || m.other !== other || m.kind !== 'social' || !m.what) continue;
    if (test(m.what)) hit = true;
    else if (after?.(m.what)) hit = false;
  }
  return hit;
}

/** a 對 b 的特徵（互動表 will／ok 用的鍵）。 */
export function features(v: View, a: string, b: string): Record<string, number> {
  const ta = traitsOf(v.st, a);
  const tb = traitsOf(v.st, b);
  const ab = bondBetween(v.w, a, b);
  const ba = bondBetween(v.w, b, a);
  const moodA = moodOf(v, a);
  const moodB = moodOf(v, b);
  const since = v.gm - RULES.recentDays * 1440;
  const memA = memoriesOf(v, a).filter((m) => m.t >= since);
  const pidA = v.pidOf[a];
  const fistA = v.dojo?.skills[a]?.fist ?? 0;
  const fistB = v.dojo?.skills[b]?.fist ?? 0;
  const helped =
    recentSocial(v, a, b, (w) => w === 'comfort.ok.b' || w === 'instruct.ok.b', RULES.recentDays, (w) => w.startsWith('thank.')) ||
    (memA.some((m) => m.kind === 'learned_move' && m.other === b && m.n === 1) &&
      !recentSocial(v, a, b, (w) => w.startsWith('thank.'), RULES.recentDays));
  const hurt = recentSocial(v, a, b, (w) => w === 'provoke.ok.a' || w === 'boast.fail.a', RULES.recentDays, (w) => w.startsWith('apologize.'));
  return {
    closeAB: ab.close / 100,
    respectAB: ab.respect / 100,
    rivalAB: ab.rival / 100,
    closeBA: ba.close / 100,
    respectBA: ba.respect / 100,
    rivalBA: ba.rival / 100,
    extA: ta.ext,
    calmA: ta.calm,
    discA: ta.disc,
    cautA: ta.caut,
    extB: tb.ext,
    calmB: tb.calm,
    discB: tb.disc,
    cautB: tb.caut,
    moodA: (moodA - 50) / 50,
    moodB: (moodB - 50) / 50,
    sadA: moodA < RULES.sadMood ? 1 : 0,
    sadB: moodB < RULES.sadMood ? 1 : 0,
    fresh: freshRumor(v, a, b) ? 1 : 0,
    bFresh: freshRumor(v, b, a) ? 1 : 0,
    gap: clip((fistB - fistA) / 300),
    wantsArt: pidA && ['learn', 'stronger', 'ask', 'apprentice'].some((t) => hasThought(v.mind, pidA, t)) ? 1 : 0,
    lostA: memA.some((m) => m.kind === 'spar_lost') ? 1 : 0,
    rivalMem: memA.some((m) => m.kind === 'rival_master' && m.other === b) ? 1 : 0,
    wonA: memA.some((m) => m.kind === 'spar_won' || m.kind === 'learned_move') ? 1 : 0,
    helped: helped ? 1 : 0,
    hurt: hurt ? 1 : 0,
    disciple: masterOf(v.w, b) === a ? 1 : 0,
    asked: recentSocial(v, b, a, (w) => w === 'ask_advice.ok.a', RULES.askedDays) ? 1 : 0,
  };
}

/** 前置條件：這種互動此刻做得到嗎（#574 第 1 節「誰能做」）。 */
function feasible(v: View, def: InteractionDef, a: string, b: string, f: Record<string, number>): boolean {
  switch (def.id) {
    case 'greet':
    case 'chat':
      return true;
    case 'inquire':
      return f.bFresh > 0;
    case 'rumor':
      return f.fresh > 0;
    case 'boast':
      return f.wonA > 0;
    case 'ask_advice':
      return f.wantsArt > 0 && (f.gap >= 0.2 || canTeach(v, b, a));
    case 'instruct':
      return (f.disciple > 0 || f.asked > 0) && canTeach(v, a, b);
    case 'complain':
      return f.sadA > 0 || f.lostA > 0;
    case 'comfort':
      return f.sadB > 0;
    case 'thank':
      return f.helped > 0;
    case 'apologize':
      return f.hurt > 0;
    case 'provoke':
      return f.rivalAB >= 0.08 || f.lostA > 0 || f.rivalMem > 0;
  }
  return false;
}

export type SocialOption = { id: string; label: string; icon: string; p: number; difficulty: '容易' | '普通' | '難'; will: number };

/** a 對 b 此刻做得到的互動（玩家選單與 AI 共用同一套規則）。 */
export function socialOptions(w: WuxiaState | undefined, gm: number, a: string, b: string): SocialOption[] {
  const v = w && viewOf(w, gm);
  if (!v || a === b) return [];
  const f = features(v, a, b);
  const out: SocialOption[] = [];
  for (const def of INTERACTIONS) {
    if (!feasible(v, def, a, b, f)) continue;
    const p = successP(def, f);
    out.push({ id: def.id, label: def.label, icon: def.icon, p, difficulty: difficulty(p), will: round4(linear(def.will, f)) });
  }
  return out;
}

export function tickA3(game: Game, now: number) {
  const w = game.world.wuxia!;
  if (w.clockEpoch === undefined) return;
  let st = w.elements[A3_SILENT] as A3State | undefined;
  if (!st) {
    st = initA3State();
    w.elements[A3_SILENT] = st;
  }
  const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
  if (gm <= st.minute) return;
  st.minute = gm;
  const v = viewOf(w, gm);
  if (!v) return;
  // 過期的指點時段、念頭
  if (st.sessions.some((s) => s.until <= gm)) st.sessions = st.sessions.filter((s) => s.until > gm);
  for (const cid of Object.keys(st.moodlets)) {
    const l = st.moodlets[cid].filter((x) => x.until > gm);
    if (l.length) st.moodlets[cid] = l;
    else delete st.moodlets[cid];
  }
  const ps: P[] = [];
  for (const pid of Object.keys(v.life.people).sort()) {
    const person = v.life.people[pid];
    const player = game.world.players.get(pid as any);
    if (!player) continue;
    const cur = person.cur;
    const free =
      !person.player &&
      cur?.phase === 'do' &&
      FREE_ACTS.has(cur.act) &&
      (st.busy[person.cid] ?? -1) <= gm;
    ps.push({ pid, cid: person.cid, person, x: player.position.x, y: player.position.y, place: personPlace(person, player), free });
  }
  const inConv = new Set<string>();
  for (const c of game.world.conversations.values()) for (const m of c.participants.keys()) inConv.add(m as string);
  const ctx = jhCtx(game, now, v);
  for (const a of ps) {
    if (!a.free || inConv.has(a.pid) || (st.busy[a.cid] ?? -1) > gm) continue;
    if (gm - (st.lastStart[a.cid] ?? -1e9) < RULES.personCooldown) continue;
    const chance = RULES.startChance * (1 + RULES.extravertBoost * traitsOf(st, a.cid).ext);
    if (game.rng() >= chance) continue;
    const partners = ps.filter(
      (b) =>
        b !== a &&
        b.free &&
        !inConv.has(b.pid) &&
        (st!.busy[b.cid] ?? -1) <= gm &&
        b.place === a.place &&
        Math.hypot(a.x - b.x, a.y - b.y) <= RADIUS &&
        gm - (st!.pairLast[pairKey(a.cid, b.cid)] ?? -1e9) >= RULES.pairCooldown,
    );
    if (!partners.length) continue;
    let best: { b: P; def: InteractionDef; s: number } | undefined;
    for (const b of partners) {
      const f = features(v, a.cid, b.cid);
      for (const def of INTERACTIONS) {
        if (!feasible(v, def, a.cid, b.cid, f)) continue;
        const s = linear(def.will, f) + RULES.noise * game.rng();
        if (!best || s > best.s) best = { b, def, s };
      }
    }
    if (!best) continue;
    const others = ps.filter((q) => q !== a && q !== best!.b && q.place === a.place && Math.hypot(a.x - q.x, a.y - q.y) <= RADIUS && q.free);
    perform(game, v, ctx, a.cid, best.b.cid, best.def, { place: a.place, others: others.map((q) => q.cid) });
  }
}

function jhCtx(game: Game, now: number, v: View): Ctx | undefined {
  if (!v.jh) return undefined;
  const c = readClock(v.gm);
  return { game, now, gm: v.gm, day: c.day, mod: c.minuteOfDay, w: v.w, st: v.jh, life: v.life, mind: v.mind };
}

const RUMOR_TOPIC: Record<string, Topic> = { bandit: 'bandit', wealth: 'money', dojo: 'art', xiake: 'art' };

function topicFor(v: View, def: InteractionDef, a: string, b: string, rumor?: Rumor): Topic {
  if (rumor) return RUMOR_TOPIC[rumor.about] ?? 'rumor';
  if (def.id === 'complain' || def.id === 'chat') {
    const pid = v.pidOf[a];
    const n = pid ? v.life.people[pid]?.needs : undefined;
    const lost = memoriesOf(v, a).some((m) => m.kind === 'spar_lost' && v.gm - m.t < RULES.recentDays * 1440);
    if (lost) return 'art';
    if (n && n.hunger >= 60) return 'food';
    if (def.id === 'chat') {
      const t = (['home', 'money', 'beast', 'person', 'love'] as Topic[])[(a.length * 3 + b.length + readClock(v.gm).day) % 5];
      return t;
    }
    return n && n.fatigue >= 60 ? 'home' : 'money';
  }
  return def.topic as Topic;
}

function reactionFor(def: InteractionDef, ok: boolean, calmB: number): Reaction {
  if (def.id === 'provoke') return ok ? 'angry' : 'happy';
  if (!ok) return calmB < 0 ? 'angry' : 'sad';
  if (def.id === 'rumor' || def.id === 'inquire' || def.id === 'boast') return 'surprised';
  if (def.id === 'comfort' || def.id === 'thank' || def.id === 'apologize') return 'shy';
  return 'happy';
}

type PerformOpts = { place?: string; others?: string[]; player?: boolean; cause?: number };

/** 執行一次互動：擲成敗、套效果、寫紀錄。回傳紀錄。 */
function perform(game: Game, v: View, ctx: Ctx | undefined, a: string, b: string, def: InteractionDef, o: PerformOpts): SocialEntry {
  const st = v.st;
  const gm = v.gm;
  const f = features(v, a, b);
  const p = successP(def, f);
  const ok = game.rng() < p;
  const fx = ok ? def.okFx : def.failFx;
  const id = st.seq++;
  const effects: Fx[] = [];
  let rumor: Rumor | undefined;
  // 傳聞（說傳聞 a→b、打聽 b→a）
  if (fx.rumor && ctx) {
    const [teller, listener] = fx.rumor === 'ab' ? [a, b] : [b, a];
    rumor = freshRumor(v, teller, listener);
    if (rumor && hear(ctx, listener, rumor, 'talk', { cid: teller, heard: heardOf(v.jh!, teller, rumor.id) }))
      effects.push({ k: 'rumor', who: listener, from: teller, rid: rumor.id });
  }
  // 關係（每一方一筆 social 記憶，W7 由記憶算三軸；寒暄不記）
  if (def.id !== 'greet' && v.mind) {
    for (const [role, owner, other] of [
      ['a', a, b],
      ['b', b, a],
    ] as const) {
      const pid = v.pidOf[owner];
      if (!pid) continue;
      const mem = remember(v.mind, pid, gm, 'social', { other, what: `${def.id}.${ok ? 'ok' : 'fail'}.${role}`, n: id, place: o.place });
      const d = role === 'a' ? fx.a : fx.b;
      for (const [axis, dv] of Object.entries(d ?? {})) if (dv) effects.push({ k: 'bond', who: owner, to: other, axis: axis as any, d: dv, mem });
    }
  }
  // 念頭／心情
  for (const [key, who] of [
    ['moodA', a],
    ['moodB', b],
  ] as const) {
    const mm = fx[key];
    if (!mm) continue;
    const l = (st.moodlets[who] ??= []);
    l.push({ k: `${def.id}#${id}`, v: mm[0], until: gm + mm[1] * 1440 });
    if (l.length > RULES.moodletCap) l.splice(0, l.length - RULES.moodletCap);
    effects.push({ k: 'mood', who, d: mm[0], days: mm[1] });
  }
  const entry: SocialEntry = {
    id,
    t: gm,
    a,
    b,
    kind: def.id,
    topic: topicFor(v, def, a, b, rumor),
    ok,
    p,
    react: reactionFor(def, ok, traitsOf(st, b).calm),
    effects,
    minutes: def.minutes,
  };
  if (o.player) entry.player = 1;
  if (o.cause !== undefined) entry.cause = o.cause;
  // 傳授：指點開一個時段（老師＋最多 3 個學生）
  if (ok && fx.teach === 'session') {
    const students = [b];
    for (const q of o.others ?? []) {
      if (students.length >= RULES.maxStudents) break;
      if (q === a || q === b) continue;
      const fq = features(v, a, q);
      if ((fq.disciple > 0 || fq.asked > 0) && canTeach(v, a, q)) students.push(q);
    }
    const s = { id: st.seq++, iid: id, teacher: a, students, start: gm, until: gm + RULES.sessionMinutes };
    st.sessions.push(s);
    if (students.length > 1) entry.with = students.slice(1);
    effects.push({ k: 'teach', session: s.id, teacher: a, students });
    for (const q of students.slice(1)) st.busy[q] = Math.max(st.busy[q] ?? -1, gm + def.minutes);
  }
  const stat = (st.stats[def.id] ??= { n: 0, ok: 0, pSum: 0, pVar: 0 });
  stat.n++;
  if (ok) stat.ok++;
  stat.pSum = round4(stat.pSum + p);
  stat.pVar = round4(stat.pVar + p * (1 - p));
  st.started[a] = (st.started[a] ?? 0) + 1;
  st.busy[a] = gm + def.minutes;
  st.busy[b] = gm + def.minutes;
  st.lastStart[a] = gm;
  st.pairLast[pairKey(a, b)] = gm;
  st.log.push(entry);
  if (st.log.length > RULES.logSize) st.log.splice(0, st.log.length - RULES.logSize);
  // 請教成功＝指點的入口（#574 留言第 1 項）：被請教的人會教就接著指點
  if (ok && fx.teach === 'ask' && canTeach(v, b, a)) {
    const live = st.sessions.find((s) => s.teacher === b && s.until > gm && s.students.length < RULES.maxStudents);
    if (live) {
      if (!live.students.includes(a)) live.students.push(a);
    } else perform(game, v, ctx, b, a, INTERACTION_BY_ID.instruct, { ...o, others: [], cause: id, player: false });
  }
  return entry;
}

/** 玩家發起互動（W9 wuxiaPlayerAct kind 'social'，act＝互動 id，target＝對方）。同一套規則。 */
export function playerSocial(game: Game, now: number, aCid: string, bCid: string, kind: string): { ok: boolean; reason: string; entry?: number } {
  const w = game.world.wuxia;
  if (!w) return { ok: false, reason: '沒有武俠狀態' };
  const gm = gameMinutes(now, w.clockEpoch!, w.timeScale);
  const v = viewOf(w, gm);
  if (!v) return { ok: false, reason: '無言互動沒開' };
  const def = INTERACTION_BY_ID[kind];
  if (!def) return { ok: false, reason: `不認得的互動 ${kind}` };
  const pa = v.pidOf[aCid];
  const pb = v.pidOf[bCid];
  const A = pa ? game.world.players.get(pa as any) : undefined;
  const B = pb ? game.world.players.get(pb as any) : undefined;
  if (!A || !B) return { ok: false, reason: '找不到對方' };
  const placeA = personPlace(v.life.people[pa], A);
  if (placeA !== personPlace(v.life.people[pb], B) || Math.hypot(A.position.x - B.position.x, A.position.y - B.position.y) > RADIUS)
    return { ok: false, reason: '要先走到對方身邊' };
  if ((v.st.busy[bCid] ?? -1) > gm) return { ok: false, reason: '對方正忙著' };
  const f = features(v, aCid, bCid);
  if (!feasible(v, def, aCid, bCid, f)) return { ok: false, reason: `現在不能${def.label}` };
  const e = perform(game, v, jhCtx(game, now, v), aCid, bCid, def, { place: placeA, player: true, others: [] });
  return { ok: e.ok, reason: `${def.label}${e.ok ? '成功' : '沒成'}`, entry: e.id };
}

/** 某人此刻的心情 0–100（畫面與報告用）；a3-silent 沒開回 undefined。 */
export function moodNow(w: WuxiaState | undefined, gm: number, cid: string): number | undefined {
  const v = w && viewOf(w, gm);
  return v ? moodOf(v, cid) : undefined;
}
