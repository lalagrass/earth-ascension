// 武俠小鎮 A2（#575，元素 id `a2-master`）：大師入鎮——招式、四條傳承管道、師承。
// - 招式表：data/wuxia/arts/*.json（太極拳 12 式、老槐拳 6 式）；每人 know[招] = {prof, from, via, day, flawed, cap}
// - 四條管道全部是規則（不耗 game.rng()，沒有隨機成分）：教（60 遊戲分鐘、prof ≥ 400、上限 ×0.9）、
//   看（6 格內、累計 10 次、難度 ≤ 2、走樣、上限 150）、練（W4 曲線到上限、14 日沒練退步）、再傳（走樣跟著傳）
// - 大師張三丰是真的鎮民：第 5 日巳初從城門進鎮（建立 player＋agent，跟 createAgent 同一套），之後由 w03-life 照日程過日子
// - 拳腳改由招推導（#575）：每分鐘把 w04 的 skills.fist 改寫成「體能分＋Σ(prof×難度權重)」，W6 切磋／W7 拜師自動跟著變
// - 關閉時：本元素不存在、物件不存在、人物表沒有新的 6 位，世界跟 A1 逐位元組相同
// 狀態存在 world.wuxia.elements['a2-master']。本元素排在 registry 最後（在 w03–w09、a1 之後）。
import { a5On } from '../a5_robust';
import type { Game } from '../../aiTown/game';
import { Player } from '../../aiTown/player';
import { Agent } from '../../aiTown/agent';
import { AgentDescription } from '../../aiTown/agentDescription';
import { blocked } from '../../aiTown/movement';
import type { WuxiaElement } from '../registry';
import type { WuxiaState } from '../state';
import { gameMinutes, readClock } from '../clock';
import { W03_LIFE, LifeState, Person, personPlace } from '../w03_life';
import type { ScheduleBlock } from '../w03_life/data';
import { blankMinutesPerDay, currentBlock, inRange, lifeSchedCtx } from '../w03_life/data';
import { W04_DOJO, DojoState, ensure } from '../w04_dojo';
import { W05_MIND, remember } from '../w05_mind';
import type { MindState } from '../w05_mind/data';
import { W06_SPAR } from '../w06_spar/data';
import type { SparState } from '../w06_spar/data';
import { W07_BOND, BONDS } from '../w07_bond/data';
import type { BondState } from '../w07_bond/data';
import { W08_JIANGHU } from '../w08_jianghu/data';
import type { JianghuState } from '../w08_jianghu/data';
import { hear, newRumor } from '../w08_jianghu/common';
import { profileById } from '../w02_folk';
import {
  A2_MASTER,
  A2State,
  ART_BY_ID,
  ARTS,
  BASE_CALM,
  COACH_CID,
  Hint,
  Know,
  MASTER,
  MASTER_CID,
  MASTER_PROFILE,
  MOVE_BY_ID,
  MoveDef,
  Policy,
  TeachRecord,
  applyTeach,
  applyWatch,
  bodyOk,
  capOf,
  chainOf,
  decayed,
  derivedFist,
  formMove,
  haowuOf,
  initA2State,
  learnersOf,
  practiceBase,
  practiceGain,
  prereqOk,
  teachThreshold,
} from './data';
import { hasMisdeed } from './hooks';
import { a3Of, inSession } from '../a3_silent/data';
import { a2HintText } from '../a3_silent/grammar';
import { a4Of } from '../a4_play/data';
import { a6On, a6State, rankOf, recordWatch, watchChance, watchDayFull, watchable } from '../a6_spread';

export { A2_MASTER } from './data';

export const a2MasterElement: WuxiaElement = {
  id: A2_MASTER,
  requires: [W07_BOND],
  init: (state: WuxiaState) => {
    state.elements[A2_MASTER] = initA2State();
  },
  tick: (game, now) => tickA2(game, now),
};

/** 劇本（headless --scenario）：master-open／master-selective／master-hidden／no-master。 */
export function applyScenario(st: A2State, scenario: string) {
  if (scenario === 'no-master') st.arriveDay = null;
  else if (scenario.startsWith('master-')) st.policy = scenario.slice(7) as Policy;
  else throw new Error(`unknown a2 scenario ${scenario}`);
}

/** 會教的活動（師父示範、教頭指點、自己練時旁邊的人也能學）、學的人的活動 */
const TEACH_ACTS = new Set(['instruct', 'coach', 'practice_form', 'hit_dummy', 'hit_sandbag']);
const LEARN_ACTS = new Set(['practice_form', 'hit_dummy', 'hit_sandbag', 'stand_post', 'lift_stone', 'watch_form']);
const FORM_ACTS = new Set(['taiji_form', 'instruct']);

type P = { pid: string; cid: string; person: Person; x: number; y: number; act?: string; since: number; place: string; asleep: boolean };

const nameOf = (cid: string) => profileById(cid)?.name ?? cid;

function pushHint(st: A2State, h: Omit<Hint, 'id'>, w?: WuxiaState, kind?: string, vars?: Record<string, string>) {
  // A3（#574 留言第 1 項）：a3-silent 開著時事件提示改走文法模板（data/wuxia/grammar/social.json 的 a2），依序號輪換句型
  if (w && kind && vars && a3Of(w)) h = { ...h, text: a2HintText(kind, vars, st.seq) ?? h.text };
  st.hints.push({ id: st.seq++, ...h });
  if (st.hints.length > MASTER.hintSize) st.hints.splice(0, st.hints.length - MASTER.hintSize);
}
function pushRecord(st: A2State, r: Omit<TeachRecord, 'id'>): TeachRecord {
  const rec = { id: st.seq++, ...r };
  st.records.push(rec);
  if (st.records.length > MASTER.recordSize) st.records.splice(0, st.records.length - MASTER.recordSize);
  return rec;
}

function originKnow(cid: string, day: number): Record<string, Know> {
  const out: Record<string, Know> = {};
  for (const art of ARTS) {
    if (art.origin !== cid) continue;
    for (const m of art.moves) out[m.id] = { prof: m.originProf, from: null, via: 'origin', day, flawed: false };
  }
  return out;
}

export function a2State(w: WuxiaState): A2State | undefined {
  return w.elements[A2_MASTER] as A2State | undefined;
}

function bondState(w: WuxiaState): BondState | undefined {
  return w.enabled[W07_BOND] ? (w.elements[W07_BOND] as BondState | undefined) : undefined;
}
function closeOf(w: WuxiaState, a: string, b: string): number {
  return bondState(w)?.bonds[a]?.[b]?.close ?? 0;
}
function respectOf(w: WuxiaState, a: string, b: string): number {
  return bondState(w)?.bonds[a]?.[b]?.respect ?? 0;
}
function masterOfCid(w: WuxiaState, cid: string): string | undefined {
  return bondState(w)?.disciples[cid]?.master;
}

/** 周教頭沉穩嗎（#575 審查補充）：性格 calm ≥ 50，且 14 日內沒有輸切磋、徒弟改投的記憶。 */
export function coachCalm(mind: MindState | undefined, gm: number): boolean {
  if ((BASE_CALM[COACH_CID] ?? 0) < MASTER.coach.calm) return false;
  if (!mind) return true;
  const me = Object.values(mind.people).find((p) => p.cid === COACH_CID);
  if (!me) return true;
  return !me.memories.some((m) => (m.kind === 'spar_lost' || m.kind === 'disciple_left') && gm - m.t <= 14 * 1440);
}

/** 願不願意教（#575 三種態度／周教頭／再傳）。 */
export function willing(w: WuxiaState, st: A2State, mind: MindState | undefined, teacher: string, student: string, m: MoveDef): boolean {
  const disc = masterOfCid(w, student) === teacher;
  if (teacher === MASTER_CID) {
    // A4（#576 劇本二）：破例收下的那一個徒弟（只有 a4-play 開著才可能有）教；其他人照舊不教
    if (st.policy === 'hidden') return disc && !!a4Of(w);
    if (st.policy === 'selective') return disc || (closeOf(w, teacher, student) >= MASTER.selective.close && !hasMisdeed(mind, student));
    return disc || m.difficulty <= 2;
  }
  if (teacher === COACH_CID && m.family === 'laohuai') return disc || m.difficulty <= MASTER.coach.maxDifficultyOpen;
  return disc || closeOf(w, teacher, student) >= MASTER.teach.reteachClose;
}

/** 教的人此刻能教學的人哪一招（招式表順序第一個符合的）；沒有回 undefined。 */
export function pickTeach(
  w: WuxiaState,
  st: A2State,
  mind: MindState | undefined,
  teacher: string,
  student: string,
  skills: { stance: number; power: number } | undefined,
): MoveDef | undefined {
  const T = MASTER.teach;
  const tk = st.know[teacher];
  if (!tk) return undefined;
  const sk = st.know[student];
  for (const art of ARTS) {
    for (const m of art.moves) {
      const t = tk[m.id];
      if (!t || t.prof < teachThreshold(w, m)) continue;
      const s = sk?.[m.id];
      if (s) {
        const better = (s.flawed && !t.flawed) || Math.floor(t.prof * T.capFactor) > capOf(s) + T.reteachMargin;
        if (!better) continue;
        // A5（a5-robust，#577 補驗收 A2-2）：看會的招再被教（again）時也要過前置招與身體門檻；A4 以前只在第一次教時檢查，
        // 林嫂看會單鞭後身體不夠仍被大師「再教」（9 日 open 劇本第 7、8 日）。a5-robust 關掉時照 A4
        if (a5On(w) && (!prereqOk(sk, m) || !bodyOk(skills, m))) continue;
      } else if (!prereqOk(sk, m) || !bodyOk(skills, m)) continue;
      if (chainOf(st.know, teacher, m.id).includes(student)) continue;
      if (!willing(w, st, mind, teacher, student, m)) continue;
      return m;
    }
  }
  return undefined;
}

/** 練功時在練哪一招：在廣場練太極、在武館練老槐拳（沒有就練別門）；挑還沒到上限、熟練度最低的（同分依招式表）。 */
function choosePractice(know: Record<string, Know> | undefined, place: string): string | undefined {
  if (!know) return undefined;
  const prefer = place === 'dojo' ? 'laohuai' : 'taiji';
  const order = [ART_BY_ID[prefer], ...ARTS.filter((a) => a.id !== prefer)];
  for (const art of order) {
    let best: { id: string; prof: number; full: boolean } | undefined;
    for (const m of art.moves) {
      const k = know[m.id];
      if (!k) continue;
      const full = k.prof >= capOf(k);
      if (!best || (best.full && !full) || (best.full === full && k.prof < best.prof)) best = { id: m.id, prof: k.prof, full };
    }
    if (best) return best.id;
  }
  return undefined;
}

function spawnMaster(game: Game, now: number, gm: number, st: A2State, w: WuxiaState, life: LifeState, mind: MindState | undefined) {
  const prof = MASTER_PROFILE;
  const playerId = Player.join(game, now, prof.name, prof.sprite, prof.identity);
  const player = game.world.players.get(playerId)!;
  const gate = { x: 23, y: 33 };
  if (!blocked(game, now, gate, playerId)) player.position = gate;
  const agentId = game.allocId('agents');
  game.world.agents.set(
    agentId,
    new Agent({ id: agentId, playerId, inProgressOperation: undefined, lastConversation: undefined, lastInviteAttempt: undefined, toRemember: undefined }),
  );
  game.agentDescriptions.set(agentId, new AgentDescription({ agentId, identity: prof.identity, plan: prof.plan }));
  st.arrivedAt = gm;
  st.masterPid = playerId as string;
  const day = readClock(gm).day;
  st.know[MASTER_CID] = originKnow(MASTER_CID, day);
  pushHint(st, { gm, kind: 'arrive', text: `${prof.name}從城門走進鎮上，在茶館後院租了間小屋`, who: MASTER_CID }, w, 'arrive', { m: prof.name });
  // 進鎮的消息：每人興趣 +20×好武（小鎮消息傳得快，旋鈕）
  for (const pid of Object.keys(life.people).sort()) {
    const cid = life.people[pid].cid;
    st.interest[cid] = round2((st.interest[cid] ?? 0) + MASTER.interest.arrival * haowuOf(cid));
  }
  // W8 傳聞「鎮上來了高人」：此刻在城門、主街、小廣場的人親眼看到
  const jh = w.enabled[W08_JIANGHU] ? (w.elements[W08_JIANGHU] as JianghuState | undefined) : undefined;
  if (jh) {
    const c = { game, now, gm, day, mod: readClock(gm).minuteOfDay, w, st: jh, life, mind };
    const r = newRumor(c, 'master', { feat: 'arrive', master: MASTER_CID });
    for (const pid of Object.keys(life.people).sort()) {
      const pl = game.world.players.get(pid as any);
      if (!pl) continue;
      const place = personPlace(life.people[pid], pl);
      if (place === 'gate' || place === 'street' || place === 'plaza') hear(c, life.people[pid].cid, r, 'saw');
    }
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100;

function dailyBlocks(w: WuxiaState, st: A2State, life: LifeState, mind: MindState | undefined, gm: number): Record<string, ScheduleBlock[]> {
  const out: Record<string, ScheduleBlock[]> = {};
  if (st.arrivedAt === undefined) return out;
  const B = MASTER.blocks;
  const I = MASTER.interest;
  // #562 W3-5：每人每天至少 2 小時留白。先拿掉昨天的 A2 時段算出原本的日程，每加一段都要留得下 2 小時
  st.blocks = {};
  const ctx = lifeSchedCtx(w, readClock(gm).day);
  const MIN_BLANK = 120;
  for (const pid of Object.keys(life.people).sort()) {
    const p = life.people[pid];
    const cid = p.cid;
    if (cid === MASTER_CID || p.player) continue;
    const eff = (st.interest[cid] ?? 0) + (st.artRepute[cid]?.taiji ?? 0) * I.reputeWeight;
    const knowsTaiji = Object.keys(st.know[cid] ?? {}).some((m) => MOVE_BY_ID[m]?.family === 'taiji');
    const disc = masterOfCid(w, cid) === MASTER_CID;
    const blocks: ScheduleBlock[] = [];
    if (eff >= I.watchMin || disc || knowsTaiji)
      blocks.push(
        knowsTaiji
          ? { from: B.form[0], to: B.form[1], label: '跟著大師晨練', do: ['practice_form'] }
          : { from: B.form[0], to: B.form[1], label: '看大師晨練', do: ['watch_form'] },
      );
    let ask = false;
    if (cid === COACH_CID) {
      ask = st.policy !== 'hidden' && coachCalm(mind, gm) && respectOf(w, COACH_CID, MASTER_CID) >= MASTER.coach.respect;
    } else if (st.policy === 'open') ask = disc || eff >= I.askMin;
    else if (st.policy === 'selective') ask = disc || (closeOf(w, MASTER_CID, cid) >= MASTER.selective.close && !hasMisdeed(mind, cid));
    if (ask) blocks.push({ from: B.ask[0], to: B.ask[1], label: `向${MASTER_PROFILE.name}請教`, do: ['practice_form'] });
    let blank = blankMinutesPerDay(cid, ctx);
    const kept: ScheduleBlock[] = [];
    for (const b of blocks) {
      let take = 0;
      for (let m = b.from; m < b.to; m++) if (!currentBlock(cid, m, ctx) && !kept.some((k) => inRange(m, [k.from, k.to]))) take++;
      if (blank - take < MIN_BLANK) continue;
      blank -= take;
      kept.push(b);
    }
    if (kept.length) out[cid] = kept;
  }
  return out;
}

function daily(game: Game, now: number, gm: number, day: number, st: A2State, w: WuxiaState, life: LifeState, mind: MindState | undefined) {
  // 退步
  for (const cid of Object.keys(st.know).sort()) for (const id of Object.keys(st.know[cid]).sort()) st.know[cid][id].prof = decayed(st.know[cid][id], day);
  // 會的人數曲線
  const learners: Record<string, number> = {};
  for (const art of ARTS) learners[art.id] = learnersOf(st, art.id).length;
  st.daily.push({ day, learners });
  if (st.daily.length > 400) st.daily.splice(0, st.daily.length - 400);
  // 改投（#575「徒弟會比較、會改投」）
  const bond = bondState(w);
  if (bond && st.arrivedAt !== undefined && st.policy !== 'hidden') {
    const S = MASTER.switch;
    for (const cid of Object.keys(bond.disciples).sort()) {
      if (bond.disciples[cid].master !== COACH_CID) continue;
      const rNew = respectOf(w, cid, MASTER_CID);
      const rOld = respectOf(w, cid, COACH_CID);
      if (rNew < S.respectMin || rNew < rOld + S.respectGap) continue;
      const count = Object.values(bond.disciples).filter((d) => d.master === MASTER_CID).length;
      const cap = st.policy === 'selective' ? MASTER.selective.maxDisciples : BONDS.maxDisciples;
      if (count >= cap) continue;
      if (st.policy === 'selective' && (closeOf(w, MASTER_CID, cid) < MASTER.selective.close || hasMisdeed(mind, cid))) continue;
      bond.disciples[cid] = { master: MASTER_CID, since: gm, day, order: count + 1 };
      const pidOf = (c: string) => Object.keys(life.people).find((p) => life.people[p].cid === c);
      if (mind) {
        const dp = pidOf(cid);
        const cp = pidOf(COACH_CID);
        if (dp) remember(mind, dp, gm, 'switched_master', { other: MASTER_CID, what: COACH_CID });
        if (cp) remember(mind, cp, gm, 'disciple_left', { other: MASTER_CID, what: cid });
      }
      st.switches.push({ day, gm, disciple: cid, fromMaster: COACH_CID, toMaster: MASTER_CID, respectNew: rNew, respectOld: rOld });
      pushHint(st, { gm, kind: 'switch', text: `${nameOf(cid)}離開${nameOf(COACH_CID)}，改投${MASTER_PROFILE.name}門下`, who: cid }, w, 'switch', { s: nameOf(cid), c: nameOf(COACH_CID), m: MASTER_PROFILE.name });
      const jh = w.enabled[W08_JIANGHU] ? (w.elements[W08_JIANGHU] as JianghuState | undefined) : undefined;
      if (jh) {
        const c = { game, now, gm, day, mod: readClock(gm).minuteOfDay, w, st: jh, life, mind };
        const r = newRumor(c, 'master', { feat: 'switch', master: MASTER_CID, coach: COACH_CID, winner: cid });
        hear(c, cid, r, 'saw');
        hear(c, COACH_CID, r, 'saw');
      }
    }
  }
  st.blocks = dailyBlocks(w, st, life, mind, gm);
  st.blocksDay = day;
}

export function tickA2(game: Game, now: number) {
  const w = game.world.wuxia!;
  if (w.clockEpoch === undefined) return;
  const life = w.elements[W03_LIFE] as LifeState | undefined;
  const dojo = w.elements[W04_DOJO] as DojoState | undefined;
  if (!life || !dojo) return;
  const mind = w.enabled[W05_MIND] ? (w.elements[W05_MIND] as MindState | undefined) : undefined;
  let st = w.elements[A2_MASTER] as A2State | undefined;
  if (!st) {
    st = initA2State();
    w.elements[A2_MASTER] = st;
  }
  const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
  if (gm <= st.minute) return;
  const elapsed = st.minute < 0 ? 0 : gm - st.minute;
  st.minute = gm;
  const clock = readClock(gm);
  const day = clock.day;
  const mod = clock.minuteOfDay;

  const pids = Object.keys(life.people).sort();
  // 起始會的招：周教頭老槐拳（家傳）、大師太極（進鎮時）
  for (const pid of pids) {
    const cid = life.people[pid].cid;
    if (!st.know[cid]) st.know[cid] = originKnow(cid, day);
  }

  // 1. 大師進鎮
  if (st.arrivedAt === undefined && st.arriveDay !== null && (day > st.arriveDay || (day === st.arriveDay && mod >= MASTER.arriveMinute))) {
    spawnMaster(game, now, gm, st, w, life, mind);
    st.blocks = dailyBlocks(w, st, life, mind, gm);
  }

  // 2. 換日
  if (day > st.dayDone) {
    st.dayDone = day;
    daily(game, now, gm, day, st, w, life, mind);
  }

  // 3. 切磋結果：看到會太極的人切磋贏了 → 對太極的評價＋、興趣＋（#575「為什麼有人想學」）
  const spar = w.enabled[W06_SPAR] ? (w.elements[W06_SPAR] as SparState | undefined) : undefined;
  if (spar) {
    for (const r of spar.history) {
      if (r.id <= st.sparSeen) continue;
      st.sparSeen = r.id;
      if (!r.winner) continue;
      const wk = st.know[r.winner] ?? {};
      if (!Object.keys(wk).some((m) => MOVE_BY_ID[m]?.family === 'taiji')) continue;
      const loser = r.winner === r.a ? r.b : r.a;
      for (const cid of [...new Set([loser, ...r.spectators])].sort()) {
        if (cid === r.winner) continue;
        const rep = (st.artRepute[cid] ??= {});
        rep.taiji = round2((rep.taiji ?? 0) + MASTER.interest.sawWin);
        st.interest[cid] = round2((st.interest[cid] ?? 0) + MASTER.interest.sawWin * haowuOf(cid));
        const pid = pids.find((p) => life.people[p].cid === cid);
        if (mind && pid) remember(mind, pid, gm, 'saw_art_win', { other: r.winner, what: '太極拳' });
      }
    }
  }

  // 4. 每分鐘：誰在打拳（練／示範／晨練）、看、教
  const ps: P[] = [];
  for (const pid of pids) {
    const person = life.people[pid];
    const player = game.world.players.get(pid as any);
    if (!player) continue;
    const cur = person.cur;
    const act = cur?.phase === 'do' ? cur.act : undefined;
    ps.push({
      pid,
      cid: person.cid,
      person,
      x: player.position.x,
      y: player.position.y,
      act,
      since: cur?.since ?? gm,
      place: personPlace(person, player),
      asleep: act === 'sleep',
    });
  }
  const W = MASTER.watch;
  const T = MASTER.teach;
  const a6 = a6On(w) ? a6State(w) : undefined;
  const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
  const performing: Array<{ p: P; move: string }> = [];
  for (const p of ps) {
    if (!p.act || MASTER.practice.acts[p.act] === undefined) continue;
    const know = st.know[p.cid];
    let move: string | undefined;
    if (FORM_ACTS.has(p.act)) move = formMove(ART_BY_ID.taiji, p.since, gm).id;
    else if (p.act === 'coach') move = know && Object.keys(know).some((m) => MOVE_BY_ID[m]?.family === 'laohuai') ? formMove(ART_BY_ID.laohuai, p.since, gm).id : undefined;
    else {
      const prev = st.practice[p.pid];
      if (prev && prev[0] === p.since && know?.[prev[1]]) move = prev[1];
      else {
        move = choosePractice(know, p.place);
        if (move) st.practice[p.pid] = [p.since, move];
        else delete st.practice[p.pid];
      }
    }
    if (!move || !know?.[move]) continue;
    performing.push({ p, move });
    // 練：W4 曲線成長到上限（這一分鐘才開始的不算）
    const minutes = Math.min(elapsed, gm - p.since);
    if (minutes > 0) {
      const k = know[move];
      const mv = move;
      const kn = st.know;
      const teacherNear = ps.some((q) => q !== p && (q.act === 'instruct' || q.act === 'coach') && q.place === p.place && dist(p, q) <= T.radius && (kn[q.cid]?.[mv]?.prof ?? 0) > k.prof);
      k.prof = practiceGain(k, MASTER.practice.acts[p.act], teacherNear ? MASTER.practice.teacherBonus : 1, minutes, practiceBase(w));
      k.last = day;
    }
  }

  // 看：每看完一招（每 5 分鐘一招）算一次；看到大師晨練每人每日記一次
  for (const { p, move } of performing) {
    const m = MOVE_BY_ID[move];
    const segEnd = (gm - p.since) % W.segmentMinutes === W.segmentMinutes - 1;
    const masterForm = p.cid === MASTER_CID && p.act === 'taiji_form';
    if (!segEnd && !masterForm) continue;
    for (const q of ps) {
      if (q === p || q.asleep || dist(p, q) > W.radius) continue;
      if (masterForm && st.sawDay[q.cid] !== day && q.cid !== MASTER_CID) {
        st.sawDay[q.cid] = day;
        const hw = haowuOf(q.cid);
        st.interest[q.cid] = round2((st.interest[q.cid] ?? 0) + MASTER.interest.sawForm * hw);
        if (mind) remember(mind, q.pid, gm, 'saw_form', { other: MASTER_CID, n: Math.round(hw * 100), place: 'plaza' });
        if (q.cid === COACH_CID && !coachCalm(mind, gm) && mind) {
          remember(mind, q.pid, gm, 'rival_master', { other: MASTER_CID });
          pushHint(st, { gm, kind: 'rival', text: `${nameOf(COACH_CID)}遠遠看著${MASTER_PROFILE.name}打拳，臉色不太好看`, who: COACH_CID }, w, 'rival', { c: nameOf(COACH_CID), m: MASTER_PROFILE.name });
        }
      }
      if (!segEnd || m.difficulty > W.maxDifficulty || st.know[q.cid]?.[move]) continue;
      let rec: ReturnType<typeof applyWatch>;
      if (a6) {
        // A6（#581）：只從正式學會的人身上看；每次成功與否擲 game.rng()（好武×(1−0.15×(難度−1))）；同一招要在 ≥3 個不同日累計看滿
        if (!watchable(st.know, p.cid, move) || watchDayFull(a6, q.cid, move, day)) continue;
        if (game.rng() >= watchChance(haowuOf(q.cid), m.difficulty)) continue;
        if (!recordWatch(a6, q.cid, move, day, W.count)) continue;
        rec = applyWatch(st.know, p.cid, q.cid, move, day, gm);
        if (!rec) continue;
      } else {
        const wq = (st.watch[q.cid] ??= {});
        wq[move] = (wq[move] ?? 0) + 1;
        if (wq[move] < W.count) continue;
        rec = applyWatch(st.know, p.cid, q.cid, move, day, gm);
        if (!rec) continue;
        delete wq[move];
      }
      const r = pushRecord(st, rec);
      if (mind) remember(mind, q.pid, gm, 'learned_move', { other: p.cid, what: m.name, n: 0 });
      pushHint(st, { gm, kind: 'watch', text: `${nameOf(q.cid)}偷學到『${m.name}』的皮毛`, who: q.cid, record: r.id }, w, 'watch', { s: nameOf(q.cid), move: m.name });
    }
  }

  // 教／再傳：教的人與學的人同在一處（同地點、6 格內），累計 60 遊戲分鐘教一招；一次最多 3 人
  // A3（#574 留言第 1 項）：a3-silent 開著時「教」＝指點——只在請教／指點開出的時段裡、老師與那幾個學生之間累計（不看活動）
  const a3 = a3Of(w);
  if (elapsed > 0) {
    for (const t of ps) {
      if (!st.know[t.cid]) continue;
      if (a3 ? !a3.sessions.some((x) => x.teacher === t.cid && x.start <= gm && x.until > gm) : !t.act || !TEACH_ACTS.has(t.act)) continue;
      const cands: Array<{ s: P; m: MoveDef; key: string; tog: number }> = [];
      for (const s of ps) {
        if (s === t || s.place !== t.place || dist(s, t) > T.radius) continue;
        if (a3 ? !inSession(a3, t.cid, s.cid, gm) : !s.act || !LEARN_ACTS.has(s.act)) continue;
        const m = pickTeach(w, st, mind, t.cid, s.cid, dojo.skills[s.cid]);
        if (!m) continue;
        const key = `${t.cid}|${s.cid}`;
        cands.push({ s, m, key, tog: st.together[key] ?? 0 });
      }
      cands.sort((a, b) => b.tog - a.tog || (a.s.pid < b.s.pid ? -1 : a.s.pid > b.s.pid ? 1 : 0));
      for (const c of cands.slice(0, T.maxStudents)) {
        const tog = (st.together[c.key] = c.tog + Math.min(elapsed, 1));
        if (tog < T.minutes) continue;
        delete st.together[c.key];
        const rec = pushRecord(st, applyTeach(st.know, t.cid, c.s.cid, c.m.id, day, gm, dojo.skills[c.s.cid]));
        if (mind) {
          remember(mind, c.s.pid, gm, 'learned_move', { other: t.cid, what: c.m.name, n: 1 });
          remember(mind, t.pid, gm, 'taught_move', { other: c.s.cid, what: c.m.name });
        }
        pushHint(st, {
          gm,
          kind: 'teach',
          text: rec.again ? `${nameOf(t.cid)}重新指點${nameOf(c.s.cid)}『${c.m.name}』` : `${nameOf(c.s.cid)}向${nameOf(t.cid)}學了『${c.m.name}』`,
          who: c.s.cid,
          record: rec.id,
        }, w, rec.again ? 'again' : 'teach', { t: nameOf(t.cid), s: nameOf(c.s.cid), move: c.m.name });
      }
    }
  }

  // A6（#581）：有人第一次「能教」某招時跳一次角落提示（每 10 遊戲分鐘檢查一次）
  if (a6 && gm % 10 === 0) {
    for (const cid of Object.keys(st.know).sort())
      for (const id of Object.keys(st.know[cid]).sort()) {
        const k = st.know[cid][id];
        const mv = MOVE_BY_ID[id];
        if (!mv || k.via === 'origin' || k.prof < teachThreshold(w, mv)) continue;
        const key = `${cid}|${id}`;
        if (a6.teachable.includes(key)) continue;
        a6.teachable.push(key);
        pushHint(st, { gm, kind: 'skill', text: `${nameOf(cid)}的${mv.name}${rankOf(k.prof)}了，可以教人了`, who: cid });
      }
  }

  // 5. 拳腳由招推導（#575）
  for (const p of ps) {
    ensure(dojo, p.cid);
    const s = dojo.skills[p.cid];
    const f = derivedFist(s, st.know[p.cid]);
    if (s.fist !== f) s.fist = f;
  }
}
