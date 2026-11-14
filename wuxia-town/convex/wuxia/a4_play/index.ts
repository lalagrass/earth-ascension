// 武俠小鎮 A4（#576，元素 id `a4-play`）：玩家是「牽線的人」。每遊戲日 1 點緣（最多 3），花在五個干預上；
// 干預都是 input（wuxiaIntervene），只改處境（日程、耳聞、飯、師父的親近），人要不要做還是照 W3／A2／A3 規則。
// 選了劇本時每日判一次三級目標（資料上的條件式，見 ./data.ts evalGoals），達成金級或到期就結算（世界照走，不等玩家）。
// a4 自己記一份關鍵事件（大師進鎮、第一次學會、再傳、拜師、切磋、鎮上事件、干預、目標），結算卡的故事從這裡挑，每條都有 id。
import type { Game } from '../../aiTown/game';
import type { WuxiaElement } from '../registry';
import type { WuxiaState } from '../state';
import { gameMinutes, readClock } from '../clock';
import { W03_LIFE } from '../w03_life';
import type { LifeState } from '../w03_life';
import { placeName } from '../w03_life/data';
import { W05_MIND, remember } from '../w05_mind';
import type { MindState } from '../w05_mind/data';
import { W07_BOND } from '../w07_bond/data';
import type { BondState } from '../w07_bond/data';
import { W06_SPAR } from '../w06_spar/data';
import type { SparState } from '../w06_spar/data';
import { W08_JIANGHU } from '../w08_jianghu/data';
import type { JianghuState } from '../w08_jianghu/data';
import { hear, knows } from '../w08_jianghu/common';
import { A2_MASTER, COACH_CID, MASTER_CID, MOVE_BY_ID } from '../a2_master/data';
import type { A2State } from '../a2_master/data';
import { introSocial } from '../a3_silent';
import { profileById } from '../w02_folk';
import {
  A4_PLAY,
  A4State,
  INTERVENTIONS,
  INTERVENTION_LABEL,
  InterventionKind,
  Intervention,
  PLAY,
  PlayEvent,
  SCENARIO_BY_ID,
  TIERS,
  TIER_LABEL,
  evalGoals,
  generationOf,
  goalView,
  initA4State,
} from './data';

export * from './data';

export const a4PlayElement: WuxiaElement = {
  id: A4_PLAY,
  requires: [A2_MASTER],
  init: (state: WuxiaState) => {
    state.elements[A4_PLAY] = initA4State();
  },
  tick: (game, now) => tickA4(game, now),
};

const nameOf = (cid: string) => profileById(cid)?.name ?? cid;

/** 選劇本（headless --play s1、單機開局畫面）：大師態度、進鎮日、天數上限。a4-play 關閉時不動。 */
export function applyPlay(w: WuxiaState, id: string, opts: { days?: number } = {}) {
  const sc = SCENARIO_BY_ID[id];
  if (!sc) throw new Error(`unknown a4 scenario ${id}`);
  const st = w.elements[A4_PLAY] as A4State | undefined;
  const a2 = w.elements[A2_MASTER] as A2State | undefined;
  if (!st || !a2) return;
  a2.policy = sc.policy;
  a2.arriveDay = sc.arriveDay;
  st.scenario = sc.id;
  st.daysLimit = opts.days ?? sc.days;
}

function pushEvent(st: A4State, e: Omit<PlayEvent, 'id'>): PlayEvent {
  const ev = { id: st.seq++, ...e };
  st.events.push(ev);
  // 滿了先丟權重最低的類別裡最舊的一筆（目標、收徒、大師進鎮這些故事骨幹不會被一堆切磋擠掉）
  if (st.events.length > PLAY.eventsSize) {
    const W = PLAY.story.weights;
    let drop = 0;
    for (let i = 1; i < st.events.length; i++) if ((W[st.events[i].kind] ?? 0) < (W[st.events[drop].kind] ?? 0)) drop = i;
    st.events.splice(drop, 1);
  }
  return ev;
}

function pidOfCid(life: LifeState, cid: string): string | undefined {
  for (const pid of Object.keys(life.people)) if (life.people[pid].cid === cid) return pid;
  return undefined;
}

export function tickA4(game: Game, now: number) {
  const w = game.world.wuxia!;
  if (w.clockEpoch === undefined) return;
  let st = w.elements[A4_PLAY] as A4State | undefined;
  if (!st) {
    st = initA4State();
    w.elements[A4_PLAY] = st;
  }
  const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
  if (gm <= st.minute) return;
  st.minute = gm;
  const c = readClock(gm);
  const life = w.elements[W03_LIFE] as LifeState | undefined;
  if (c.day !== st.day) {
    if (st.day > 0) {
      st.yuan = Math.min(PLAY.yuan.max, st.yuan + PLAY.yuan.perDay);
      daily(w, st, gm, st.day);
    }
    st.day = c.day;
    for (const cid of Object.keys(st.blocks)) {
      const l = st.blocks[cid].filter((b) => b.day >= c.day);
      if (l.length) st.blocks[cid] = l;
      else delete st.blocks[cid];
    }
    st.intros = st.intros.filter((x) => x[3] >= c.day);
  }
  if (!life) return;
  // 接濟：這幾天餓不超過 feed.hunger
  for (const cid of Object.keys(st.fed).sort()) {
    if (st.fed[cid] <= gm) {
      delete st.fed[cid];
      continue;
    }
    const pid = pidOfCid(life, cid);
    const p = pid ? life.people[pid] : undefined;
    if (p && p.needs.hunger > PLAY.feed.hunger) p.needs.hunger = PLAY.feed.hunger;
  }
  // 引薦：從排的那段開始到當天結束，兩人第一次都有空、同處 → A 發起一次互動
  if (st.intros.length) {
    const keep: A4State['intros'] = [];
    for (const it of st.intros) {
      const [ivId, a, b, day] = it;
      const blk = st.blocks[a]?.find((x) => x.iv === ivId);
      if (day !== c.day || !blk || c.minuteOfDay < blk.from) {
        keep.push(it);
        continue;
      }
      const e = introSocial(game, now, a, b);
      if (!e) {
        keep.push(it);
        continue;
      }
      const iv = st.used.find((u) => u.id === ivId);
      if (iv) iv.social = e.id;
      pushEvent(st, { day: c.day, gm, kind: 'fate', who: [a, b], ref: { src: 'a4', id: ivId }, text: `經人引薦，${nameOf(a)}在茶館找上了${nameOf(b)}` });
    }
    st.intros = keep;
  }
}

/** 每日一次（換日時，判的是剛過完的那一天）：掃描新事件、判目標、到期或金級就結算。 */
function daily(w: WuxiaState, st: A4State, gm: number, day: number) {
  scan(w, st, gm, day);
  if (!st.scenario || st.ended) return;
  const sc = SCENARIO_BY_ID[st.scenario];
  const g = evalGoals(w, sc);
  for (const t of TIERS) {
    if (!g[t].ok || st.goals[t] !== undefined) continue;
    st.goals[t] = day;
    pushEvent(st, { day, gm, kind: 'goal', who: [], text: `達成${TIER_LABEL[t]}級——${sc.goals[t].label}` });
  }
  if (st.goals.gold !== undefined) st.ended = { day, gm, reason: 'gold' };
  else if (day >= (st.daysLimit ?? sc.days)) st.ended = { day, gm, reason: 'time' };
}

function scan(w: WuxiaState, st: A4State, gm: number, day: number) {
  const a2 = w.enabled[A2_MASTER] ? (w.elements[A2_MASTER] as A2State | undefined) : undefined;
  if (a2 && a2.arrivedAt !== undefined && !st.scan.arrived) {
    st.scan.arrived = true;
    pushEvent(st, { day: readClock(a2.arrivedAt).day, gm: a2.arrivedAt, kind: 'arrive', who: [MASTER_CID], text: `${nameOf(MASTER_CID)}進了鎮` });
  }
  if (a2) {
    const v = goalView(w);
    for (const r of a2.records) {
      if (r.id <= st.scan.a2) continue;
      st.scan.a2 = r.id;
      if (r.again) continue;
      const fam = MOVE_BY_ID[r.move]?.family ?? '';
      const key = `${r.to}|${fam}`;
      if (!st.scan.learned.includes(key)) {
        st.scan.learned.push(key);
        const mv = MOVE_BY_ID[r.move]?.name ?? r.move;
        pushEvent(st, {
          day: r.day,
          gm: r.gm,
          kind: 'learn',
          who: [r.to, r.from],
          ref: { src: 'a2', id: r.id },
          text: r.via === 'watch' ? `${nameOf(r.to)}偷看${nameOf(r.from)}打拳，學了「${mv}」的皮毛` : `${nameOf(r.to)}跟${nameOf(r.from)}學會了「${mv}」`,
        });
      }
      const g = generationOf(v, r.to, fam);
      if (g > st.scan.gen) {
        st.scan.gen = g;
        pushEvent(st, { day: r.day, gm: r.gm, kind: 'generation', who: [r.to, r.from], ref: { src: 'a2', id: r.id }, text: `${nameOf(r.to)}從${nameOf(r.from)}那裡接下了這門拳，成了第 ${g} 代傳人` });
      }
    }
  }
  const bond = w.enabled[W07_BOND] ? (w.elements[W07_BOND] as BondState | undefined) : undefined;
  if (bond)
    for (const cid of Object.keys(bond.disciples).sort()) {
      const d = bond.disciples[cid];
      const key = `${cid}>${d.master}`;
      if (st.scan.disciples.includes(key)) continue;
      st.scan.disciples.push(key);
      pushEvent(st, { day: d.day, gm: d.since, kind: 'disciple', who: [cid, d.master], ref: { src: 'w07', id: d.since }, text: `${nameOf(cid)}拜${nameOf(d.master)}為師` });
    }
  const spar = w.enabled[W06_SPAR] ? (w.elements[W06_SPAR] as SparState | undefined) : undefined;
  if (spar)
    for (const r of spar.history) {
      if (r.id <= st.scan.w06) continue;
      st.scan.w06 = r.id;
      // 只記兩門之間的切磋（各自的門＝師父本人或他拜的師父；同門、門外人不記）
      const school = (x: string) => (x === MASTER_CID || x === COACH_CID ? x : bond?.disciples[x]?.master);
      const ma = school(r.a);
      const mb = school(r.b);
      if (!ma || !mb || ma === mb) continue;
      const res = r.draw ? '打成平手' : `${nameOf(r.winner ?? r.a)}勝`;
      pushEvent(st, { day: r.day, gm: r.startGm, kind: 'spar', who: [r.a, r.b], ref: { src: 'w06', id: r.id }, text: `${nameOf(r.a)}與${nameOf(r.b)}切磋，${res}` });
    }
  const jh = w.enabled[W08_JIANGHU] ? (w.elements[W08_JIANGHU] as JianghuState | undefined) : undefined;
  if (jh)
    for (const e of jh.chronicle) {
      if (e.event === undefined || e.event <= st.scan.w08) continue;
      st.scan.w08 = e.event;
      pushEvent(st, { day: e.day, gm: e.gm, kind: 'event', who: [], ref: { src: 'w08', id: e.event }, text: e.text.replace(/[。！]+$/, '') });
    }
  void gm;
  void day;
}

export type InterveneArgs = { kind: string; target: string; other?: string; place?: string; rid?: number };

/** wuxiaIntervene input：花緣做一個干預。回傳 { ok, reason, id? }（不夠緣、條件不合時 ok=false，不扣緣、狀態不變）。 */
export function intervene(game: Game, now: number, args: InterveneArgs): { ok: boolean; reason: string; id?: number } {
  const w = game.world.wuxia;
  const st = w?.enabled[A4_PLAY] ? (w.elements[A4_PLAY] as A4State | undefined) : undefined;
  if (!w || !st || w.clockEpoch === undefined) return { ok: false, reason: '玩家干預沒開' };
  if (st.ended) return { ok: false, reason: '這一局已經結算' };
  const kind = args.kind as InterventionKind;
  if (!INTERVENTIONS.includes(kind)) return { ok: false, reason: `不認得的干預 ${args.kind}` };
  const cost = PLAY.costs[kind];
  if (kind === 'plead' && st.pleaded.filter((k) => k === `${args.other ?? MASTER_CID}|${args.target}`).length >= PLAY.plead.perPair)
    return { ok: false, reason: '同一對人只能說情一次' };
  if (st.yuan < cost) return { ok: false, reason: `緣不夠（要 ${cost}，剩 ${st.yuan}）` };
  const life = w.elements[W03_LIFE] as LifeState | undefined;
  const mind = w.enabled[W05_MIND] ? (w.elements[W05_MIND] as MindState | undefined) : undefined;
  if (!life) return { ok: false, reason: '沒有鎮民' };
  const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
  const c = readClock(gm);
  const tPid = pidOfCid(life, args.target);
  if (!tPid || life.people[tPid].player) return { ok: false, reason: '找不到這個人' };
  if (args.target === MASTER_CID && kind !== 'intro') return { ok: false, reason: '大師不吃這一套' };
  const id = st.seq;
  const iv: Intervention = { id, gm, day: c.day, kind, target: args.target, cost };
  let text = '';
  let memWhat: Record<string, string | undefined> = {};
  switch (kind) {
    case 'guide': {
      const place = args.place ?? 'plaza';
      const acts = PLAY.guide.places[place];
      if (!acts) return { ok: false, reason: `不能指去 ${place}` };
      const blocks = (st.blocks[args.target] ??= []);
      if (blocks.some((b) => b.day === c.day + 1 && b.from === PLAY.guide.from)) return { ok: false, reason: '明早已經有人給他指過路了' };
      blocks.push({ day: c.day + 1, iv: id, from: PLAY.guide.from, to: PLAY.guide.to, label: `有人指路：去${placeName(place)}`, do: [...acts] });
      iv.place = place;
      memWhat = { place };
      text = `有人給${nameOf(args.target)}指了路：明早去${placeName(place)}`;
      break;
    }
    case 'intro': {
      const b = args.other;
      if (!b || b === args.target || !pidOfCid(life, b)) return { ok: false, reason: '要引薦給誰？' };
      let day = c.day;
      let from = Math.ceil((c.minuteOfDay + 1) / 60) * 60;
      if (from > PLAY.intro.latest) {
        day = c.day + 1;
        from = PLAY.intro.nextMorning;
      }
      const to = from + PLAY.intro.minutes;
      for (const who of [args.target, b])
        (st.blocks[who] ??= []).push({ day, iv: id, from, to, label: `經人引薦：在茶館見${nameOf(who === b ? args.target : b)}`, do: ['drink_tea'] });
      st.intros.push([id, args.target, b, day]);
      iv.other = b;
      memWhat = { other: b };
      text = `有人引薦${nameOf(args.target)}去見${nameOf(b)}`;
      break;
    }
    case 'whisper': {
      const jh = w.enabled[W08_JIANGHU] ? (w.elements[W08_JIANGHU] as JianghuState | undefined) : undefined;
      const r = jh?.rumors.find((x) => x.id === args.rid);
      if (!jh || !r) return { ok: false, reason: '沒有這條傳聞' };
      if (knows(jh, args.target, r.id)) return { ok: false, reason: '他已經聽過了' };
      const ctx = { game, now, gm, day: c.day, mod: c.minuteOfDay, w, st: jh, life, mind };
      hear(ctx, args.target, r, 'talk');
      iv.rid = r.id;
      text = `有人在${nameOf(args.target)}耳邊說了一件事：${r.text.replace(/[。！]+$/, '')}`;
      break;
    }
    case 'feed': {
      st.fed[args.target] = Math.max(st.fed[args.target] ?? 0, gm + PLAY.feed.days * 1440);
      text = `有人接濟了${nameOf(args.target)}三天的飯`;
      break;
    }
    case 'plead': {
      const m = args.other ?? MASTER_CID;
      if (m !== MASTER_CID && m !== COACH_CID) return { ok: false, reason: '只能向師父說情' };
      const key = `${m}|${args.target}`;
      if (st.pleaded.filter((k) => k === key).length >= PLAY.plead.perPair) return { ok: false, reason: '同一對人只能說情一次' };
      const mPid = pidOfCid(life, m);
      if (!mPid) return { ok: false, reason: '師父還沒到' };
      st.pleaded.push(key);
      if (mind) remember(mind, mPid, gm, 'pleaded', { other: args.target });
      iv.other = m;
      memWhat = { other: m };
      text = `有人替${nameOf(args.target)}向${nameOf(m)}說情`;
      break;
    }
  }
  st.seq++;
  st.yuan -= cost;
  if (mind) iv.mem = remember(mind, tPid, gm, 'fate', { what: kind, ...(memWhat.other ? { other: memWhat.other } : {}), ...(memWhat.place ? { place: memWhat.place } : {}) });
  st.used.push(iv);
  pushEvent(st, { day: c.day, gm, kind: 'fate', who: [args.target, ...(iv.other ? [iv.other] : [])], ref: { src: 'a4', id }, text });
  return { ok: true, reason: `${INTERVENTION_LABEL[kind]}：${text}`, id };
}
