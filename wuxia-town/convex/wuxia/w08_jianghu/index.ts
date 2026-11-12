// 武俠小鎮 W8（#560，元素 id `w08-jianghu`）：江湖事件導演、傳聞與編年。本元素排在 w07-bond 之後，每遊戲分鐘：
//   1. 外人（行商、俠客、山賊）走 1 格。
//   2. 非事件的傳聞來源：武館重開、掛匾（武館／教頭厲害）、藥鋪每 7 日進貨（鎮上有錢）。
//   3. 行商每 5 日巳初到茶館、申初離開；在茶館跟他待滿 20 分鐘的人把知道的傳聞說給他（＝出鎮，#562 W8-12）。
//   4. 對話開始時依親近（W7）互傳傳聞，每傳一手 20% 走樣（common.ts hear）。
//   5. 導演：每遊戲日卯初擲一次（30%，連續 10 日無事 ×2；大事件後 5 日平靜）；事件的權重由出鎮傳聞決定（來因）。
//      事件是小狀態機（events/*.ts，start／tick／end），一次只跑一個；結束時寫編年、產生傳聞。
//   6. 亥正：把當日編年交給 operation 讓 LLM 改寫成 80 字內的古風段落（只換文字；失敗用模板句）。
// 導演只丟事件、不替人做決定：鎮民上前、逃跑、圍觀都由規則（技能、在哪裡、有沒有空）決定。只用 game.rng() 與 tick 的 now。
// 狀態存在 world.wuxia.elements['w08-jianghu']。
import type { Game } from '../../aiTown/game';
import type { WuxiaElement } from '../registry';
import type { WuxiaState } from '../state';
import { gameMinutes, readClock } from '../clock';
import { W03_LIFE, LifeState } from '../w03_life';
import { W04_DOJO, DojoState } from '../w04_dojo';
import { COACH_ID } from '../w04_dojo/data';
import { W05_MIND } from '../w05_mind';
import type { MindState } from '../w05_mind/data';
import { W07_BOND } from '../w07_bond/data';
import type { BondState } from '../w07_bond/data';
import {
  ActiveEvent,
  DirectorRoll,
  EVENT_KINDS,
  EventKind,
  JIANGHU,
  JianghuState,
  W08_JIANGHU,
  activeOut,
  initJianghuState,
  isFighterRumor,
  rollInt,
} from './data';
import {
  Ctx,
  EventImpl,
  addFigure,
  awake,
  chronicle,
  figure,
  hear,
  heardOf,
  knows,
  newRumor,
  people,
  placeOf,
  stepFigures,
} from './common';
import { banditEvent } from './events/bandit';
import { xiakeEvent } from './events/xiake';
import { xiaobiEvent } from './events/xiaobi';
import { storyCandidate, storyEvent } from './events/story';
import { chronicleTemplateDay } from './chronicle';
import { zhCount } from './data';

export { W08_JIANGHU } from './data';

export const EVENTS: Record<EventKind, EventImpl> = {
  xiake: xiakeEvent,
  bandit: banditEvent,
  xiaobi: xiaobiEvent,
  story: storyEvent,
};

export const jianghuElement: WuxiaElement = {
  id: W08_JIANGHU,
  requires: [W07_BOND],
  init: (state: WuxiaState) => {
    state.elements[W08_JIANGHU] = initJianghuState();
  },
  tick: (game, now) => tickJianghu(game, now),
  handleInput: {
    wuxiaChronicleText: (game, _now, args: { day: number; text: string; guard: string }) => applyChronicleText(game, args),
  },
};

export function applyChronicleText(game: Game, args: { day: number; text: string; guard: string }) {
  const st = game.world.wuxia?.elements[W08_JIANGHU] as JianghuState | undefined;
  if (!st) return null;
  const d = st.chronicleDays.find((x) => x.day === args.day);
  if (!d) return null;
  d.text = args.text;
  d.guard = args.guard;
  return null;
}

export function tickJianghu(game: Game, now: number) {
  const w = game.world.wuxia!;
  if (w.clockEpoch === undefined) return;
  const life = w.elements[W03_LIFE] as LifeState | undefined;
  if (!life) return;
  let st = w.elements[W08_JIANGHU] as JianghuState | undefined;
  if (!st) {
    st = initJianghuState();
    w.elements[W08_JIANGHU] = st;
  }
  const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
  if (gm <= st.minute) return;
  st.minute = gm;
  const clock = readClock(gm);
  const mind = w.enabled[W05_MIND] ? (w.elements[W05_MIND] as MindState | undefined) : undefined;
  const c: Ctx = { game, now, gm, day: clock.day, mod: clock.minuteOfDay, w, st, life, mind };

  stepFigures(c);
  birthRumors(c);
  merchant(c);
  spreadInTalk(c);
  director(c);
  if (st.active) {
    const impl = EVENTS[st.active.kind];
    if (impl.tick(c, st.active)) finishEvent(c, st.active);
  }
  nightChronicle(c);
}

// ---------- 非事件的傳聞來源 ----------

function witnessesAt(c: Ctx, place: string, must: string[]): string[] {
  const out = new Set(must);
  for (const r of people(c)) if (awake(r) && placeOf(r) === place) out.add(r.cid);
  return [...out].sort();
}

function birthRumors(c: Ctx) {
  const dojo = c.w.elements[W04_DOJO] as DojoState | undefined;
  const bond = c.w.elements[W07_BOND] as BondState | undefined;
  if (dojo?.openedAt !== undefined && c.st.born.reopen === undefined) {
    const r = newRumor(c, 'dojo', { feat: 'reopen', coach: COACH_ID, disciples: 0 });
    c.st.born.reopen = r.id;
    for (const cid of witnessesAt(c, 'dojo', [COACH_ID])) hear(c, cid, r, 'saw');
    chronicle(c, { kind: 'dojo', text: '周教頭重開了破武館' });
  }
  if (bond?.plaqueAt !== undefined && c.st.born.plaque === undefined) {
    const dis = Object.entries(bond.disciples).filter(([, d]) => d.master === COACH_ID).map(([cid]) => cid);
    const r = newRumor(c, 'dojo', { feat: 'plaque', coach: COACH_ID, disciples: dis.length, dojoName: bond.dojoName });
    c.st.born.plaque = r.id;
    for (const cid of witnessesAt(c, 'dojo', [COACH_ID, ...dis])) hear(c, cid, r, 'saw');
    chronicle(c, { kind: 'dojo', text: `武館掛上「${bond.dojoName ?? '武館'}」的匾，周教頭收了第一個徒弟` });
  }
  const R = JIANGHU.restock;
  if (c.day % R.everyDays === R.offsetDay % R.everyDays && c.mod >= R.minuteOfDay && c.st.born[`restock:${c.day}`] === undefined) {
    const goods = rollInt(() => c.game.rng(), R.goods);
    const r = newRumor(c, 'wealth', { goods });
    c.st.born[`restock:${c.day}`] = r.id;
    for (const cid of witnessesAt(c, 'pharmacy', ['he-langzhong'])) hear(c, cid, r, 'saw');
    chronicle(c, { kind: 'restock', text: `藥鋪進了${zhCount(goods)}箱藥材` });
  }
}

// ---------- 行商（#562 W8-12）----------

function merchant(c: Ctx) {
  const M = JIANGHU.merchant;
  const P = JIANGHU.places;
  if (c.day % M.everyDays === 0 && c.mod >= M.arriveMinuteOfDay && c.mod < M.leaveMinuteOfDay && c.st.merchant?.day !== c.day) {
    const f = addFigure(c, undefined, { kind: 'merchant', name: M.name, x: P.gate[0], y: P.gate[1], to: [P.teahouse[0] - 2, P.teahouse[1] + 1], emoji: '🎒', activity: '挑擔進鎮' });
    c.st.merchant = { day: c.day, met: {}, told: {} };
    (c.st.merchant as any).fid = f.id;
  }
  const m = c.st.merchant as (JianghuState['merchant'] & { fid?: string; left?: boolean; carried?: number[] }) | undefined;
  if (!m || m.day !== c.day || m.left) return;
  const f = m.fid ? figure(c, m.fid) : undefined;
  if (!f) return;
  if (c.mod >= M.leaveMinuteOfDay) {
    f.to = [...P.gate];
    f.leaving = true;
    f.activity = '挑擔離鎮';
    m.left = true;
    const carried = m.carried ?? [];
    const texts = carried.map((rid) => c.st.out.find((o) => o.rid === rid && o.day === c.day)?.text).filter(Boolean);
    chronicle(c, {
      kind: 'merchant',
      text: texts.length ? `行商路過茶館，把「${texts.join('」「')}」的消息帶出了鎮` : '行商路過茶館，沒聽到什麼新鮮事',
    });
    return;
  }
  if (f.to) return;
  f.activity = '在茶館喝茶';
  for (const r of people(c)) {
    if (!awake(r) || placeOf(r) !== 'teahouse' || r.person.cur?.phase === 'event') continue;
    m.met[r.cid] = (m.met[r.cid] ?? 0) + 1;
    if (m.met[r.cid] !== M.listenMinutes) continue;
    for (const h of [...(c.st.known[r.cid] ?? [])].sort((a, b) => a.rid - b.rid)) {
      // 每則傳聞只出鎮一次（已經被行商帶出去過的不再算；過了 outDays 外人就淡忘）
      if (m.told[h.rid] || c.st.out.some((o) => o.rid === h.rid)) continue;
      if (c.game.rng() >= M.tellChance) continue;
      m.told[h.rid] = true;
      const rumor = c.st.rumors.find((x) => x.id === h.rid)!;
      c.st.trail.push({ rid: h.rid, day: c.day, gm: c.gm, from: r.cid, to: M.name, via: 'merchant', hop: h.hop + 1, distorted: false, text: h.text });
      if (c.st.noRumorOut) continue;
      c.st.out.push({ rid: h.rid, about: rumor.about, facts: h.facts, text: h.text, day: c.day, gm: c.gm, from: r.cid });
      (m.carried ??= []).push(h.rid);
    }
  }
}

// ---------- 對話傳傳聞 ----------

function closeness(c: Ctx, a: string, b: string): number {
  const bond = c.w.elements[W07_BOND] as BondState | undefined;
  return bond?.bonds[a]?.[b]?.close ?? 0;
}

function spreadInTalk(c: Ctx) {
  const live = new Set<string>();
  for (const conv of c.game.world.conversations.values()) {
    const id = conv.id as string;
    live.add(id);
    if (c.st.convSeen.includes(id)) continue;
    const members = [...conv.participants.values()];
    if (members.length !== 2 || !members.every((m) => m.status.kind === 'participating')) continue;
    const cids = members.map((m) => c.life.people[m.playerId as string]?.cid);
    if (!cids[0] || !cids[1]) continue;
    c.st.convSeen.push(id);
    const R = JIANGHU.rumor;
    for (const [a, b] of [
      [cids[0], cids[1]],
      [cids[1], cids[0]],
    ]) {
      const mine = (c.st.known[a] ?? []).filter((h) => !knows(c.st, b, h.rid));
      const fresh = mine.slice(-R.perTalk).reverse();
      for (const h of fresh) {
        const p = Math.max(R.spreadMin, Math.min(R.spreadMax, R.spreadBase + R.spreadPerClose * closeness(c, a, b)));
        if (c.game.rng() >= p) continue;
        const rumor = c.st.rumors.find((x) => x.id === h.rid)!;
        hear(c, b, rumor, 'talk', { cid: a, heard: heardOf(c.st, a, h.rid) });
      }
    }
  }
  c.st.convSeen = c.st.convSeen.filter((id) => live.has(id));
}

// ---------- 導演 ----------

export function eventWeights(c: Ctx): Array<{ kind: EventKind; w: number; causes: number[] }> {
  const out: Array<{ kind: EventKind; w: number; causes: number[] }> = [];
  const outs = activeOut(c.st, c.day);
  const dojo = c.w.elements[W04_DOJO] as DojoState | undefined;
  for (const kind of EVENT_KINDS) {
    const def = JIANGHU.events[kind];
    if ((c.st.cooldown[kind] ?? 0) >= c.day) continue;
    const cause = def.cause;
    let causes: number[] = [];
    let mult = 1;
    if (cause.out) {
      const hits = outs.filter((o) => o.about === cause.out);
      if (hits.length === 0) continue;
      if (cause.noOut === 'fighter' && outs.some((o) => isFighterRumor(o.about, o.facts))) continue;
      causes = [...new Set(hits.map((o) => o.rid))];
      mult = Math.min(3, causes.length);
    }
    if (cause.dojoDays !== undefined) {
      if (dojo?.openedAt === undefined || c.gm - dojo.openedAt < cause.dojoDays * 1440) continue;
    }
    if (cause.tellerKnows) {
      const rid = storyCandidate(c.st);
      if (rid === undefined) continue;
      causes = [rid];
    }
    out.push({ kind, w: def.weight * mult, causes });
  }
  return out;
}

function director(c: Ctx) {
  const D = JIANGHU.director;
  if (c.mod < D.rollMinuteOfDay || c.st.rollDay >= c.day) return;
  c.st.rollDay = c.day;
  const roll: DirectorRoll = { day: c.day, p: 0, candidates: [] };
  c.st.rolls.push(roll);
  const force = c.st.force;
  if (force && !force.done && c.day >= force.day && !c.st.active) {
    force.done = true;
    roll.picked = force.kind;
    roll.skipped = 'forced';
    startEvent(c, force.kind, [], true);
    return;
  }
  if (c.st.active) {
    roll.skipped = 'active';
    return;
  }
  if (c.day <= c.st.quietUntil) {
    roll.skipped = 'quiet';
    return;
  }
  const cands = eventWeights(c);
  roll.candidates = cands.map(({ kind, w }) => ({ kind, w }));
  if (cands.length === 0) {
    roll.skipped = 'none';
    return;
  }
  const idle = c.day - c.st.lastEventDay - 1;
  roll.p = D.chance * (idle >= D.boostAfterDays ? D.boost : 1);
  roll.r = Math.round(c.game.rng() * 1e4) / 1e4;
  if (roll.r >= roll.p) return;
  const total = cands.reduce((s, x) => s + x.w, 0);
  let x = c.game.rng() * total;
  let pick = cands[cands.length - 1];
  for (const cand of cands) {
    if (x < cand.w) {
      pick = cand;
      break;
    }
    x -= cand.w;
  }
  roll.picked = pick.kind;
  startEvent(c, pick.kind, pick.causes, false);
}

function startEvent(c: Ctx, kind: EventKind, causes: number[], forced: boolean) {
  if (kind === 'story' && storyCandidate(c.st) === undefined) return;
  const ev: ActiveEvent = { id: c.st.seq++, kind, day: c.day, startGm: c.gm, phase: 'start', enlisted: [], figures: [], data: {}, causes };
  if (forced) ev.forced = true;
  c.st.active = ev;
  c.st.lastEventDay = c.day;
  EVENTS[kind].start(c, ev);
}

function finishEvent(c: Ctx, ev: ActiveEvent) {
  const res = EVENTS[ev.kind].end(c, ev);
  const def = JIANGHU.events[ev.kind];
  c.st.history.push({
    id: ev.id,
    kind: ev.kind,
    name: def.name,
    day: ev.day,
    startGm: ev.startGm,
    endGm: c.gm,
    ...(ev.forced ? { forced: true } : {}),
    causes: ev.causes,
    outcome: res.outcome,
    rumors: res.rumors,
    text: res.text,
  });
  chronicle(c, { kind: ev.kind, event: ev.id, text: res.text });
  c.st.cooldown[ev.kind] = c.day + def.cooldownDays;
  c.st.lastEventDay = c.day;
  if (def.big) c.st.quietUntil = c.day + JIANGHU.director.quietDays;
  delete c.st.active;
}

// ---------- 亥時編年 ----------

function nightChronicle(c: Ctx) {
  if (c.mod < JIANGHU.chronicle.llmMinuteOfDay) return;
  if (c.st.chronicleDays.some((d) => d.day === c.day)) return;
  const entries = c.st.chronicle.filter((e) => e.day === c.day);
  if (entries.length === 0) return;
  const template = chronicleTemplateDay(c.day, entries);
  c.st.chronicleDays.push({ day: c.day, text: template, guard: 'template' });
  c.game.scheduleOperation('wuxiaChronicleRewrite', {
    worldId: c.game.worldId,
    day: c.day,
    entries: entries.map((e) => e.text),
    template,
  });
}
