// 武俠小鎮 W7（#559，元素 id `w07-bond`）：人際三軸、拜師與師兄弟、門規。本元素排在 w06-spar 之後，每遊戲分鐘：
//   1. 記憶：在武館看到別人練功（saw_skill，每日對同一人一筆，n＝對方拳腳 − 自己）；agent.ts 記下的「邀請被拒」轉成記憶。
//   2. 每遊戲日寅初（03:00）：由近 30 日記憶重算每一對人的三軸（data.ts computeBonds），快取在本元素狀態的 bonds。
//      W5 的寅正（04:00）評估因此讀得到當天的關係（心念「想拜師」）。
//   3. 拜師事件：有「想拜師」的人在 06:00–20:00、雙方都有空時走到師父面前 → 跪拜（動作圖 kneel）→
//      師父依規則同意（師父對他的親近 ≥ 0 且收徒數 < 3；周教頭第一個徒弟必收）。周教頭收第一個徒弟時武館掛匾。
//   4. 門規：同門弟子在武館外切磋（不得私鬥）、弟子辰時沒在武館練功（辰時練功）→ 弟子記「違規」、師父記「弟子違規」。
//      尊師（師父邀請必接受）是硬規則，在 agent.ts 的接受邀請那裡（hooks.ts）。
//   5. 師父日程的「指點徒弟」時段（弟子練功的時候師父去武館指點）：心念評估或收徒後重算，w03-life 的日程讀它。
// 只用規則與 tick 的 now，不耗 game.rng()、不等 LLM。狀態存在 world.wuxia.elements['w07-bond']。
import type { Game } from '../../aiTown/game';
import type { Player } from '../../aiTown/player';
import type { WuxiaElement } from '../registry';
import type { WuxiaState } from '../state';
import { gameMinutes, readClock } from '../clock';
import { movePlayer, stopPlayer, blocked } from '../../aiTown/movement';
import { W03_LIFE, LifeState, Person, interruptActivity, personPlace, pushLog } from '../w03_life';
import { currentBlock, schedCtx, blankMinutesPerDay, SchedCtx, ScheduleBlock } from '../w03_life/data';
import { W04_DOJO, DojoState, trainingAct } from '../w04_dojo';
import { COACH_ID, COACH_ACT, TRAINING_ACTS } from '../w04_dojo/data';
import { W05_MIND, remember } from '../w05_mind';
import { MindState, THOUGHT_BY_ID, mindBlocks, closedOverlays } from '../w05_mind/data';
import { W06_SPAR } from '../w06_spar/data';
import type { SparState } from '../w06_spar/data';
import {
  BONDS,
  BondState,
  BowEvent,
  RULE_BY_ID,
  W07_BOND,
  computeBonds,
  disciplesOf,
  dojoNameFor,
  initBondState,
  zeroBond,
} from './data';

export { W07_BOND } from './data';

export const bondElement: WuxiaElement = {
  id: W07_BOND,
  requires: [W06_SPAR],
  init: (state: WuxiaState) => {
    state.elements[W07_BOND] = initBondState();
  },
  tick: (game, now) => tickBond(game, now),
};

function msPerGameMinute(game: Game) {
  return 60_000 / game.world.wuxia!.timeScale;
}

function face(player: Player, toX: number, toY: number) {
  const dx = toX - player.position.x;
  const dy = toY - player.position.y;
  if (Math.abs(dx) >= Math.abs(dy)) player.facing = { dx: dx >= 0 ? 1 : -1, dy: 0 };
  else player.facing = { dx: 0, dy: dy >= 0 ? 1 : -1 };
}

/** 每日對同一人只記一筆的記憶（同日再發生就更新 n 與 tEnd）。 */
function rememberDaily(mind: MindState, pid: string, t: number, kind: 'saw_skill', other: string, n: number) {
  const person = mind.people[pid];
  if (!person) return;
  const day = readClock(t).day;
  for (let i = person.memories.length - 1; i >= 0; i--) {
    const m = person.memories[i];
    if (readClock(m.t).day !== day) break;
    if (m.kind === kind && m.other === other) {
      m.n = n;
      m.tEnd = t;
      return;
    }
  }
  remember(mind, pid, t, kind, { other, n });
}

/** 有空：在世界裡、不是真人、不在對話、沒在切磋／旁觀／拜師、沒在睡覺。 */
function free(game: Game, pid: string, person: Person): boolean {
  const player = game.world.players.get(pid as any);
  if (!player || player.human) return false;
  if (game.world.playerConversation(player)) return false;
  const cur = person.cur;
  if (cur && cur.phase !== 'do' && cur.phase !== 'walk') return false;
  if (cur?.act === 'sleep') return false;
  return true;
}

export function tickBond(game: Game, now: number) {
  const w = game.world.wuxia!;
  if (w.clockEpoch === undefined) return;
  const life = w.elements[W03_LIFE] as LifeState | undefined;
  const mind = w.elements[W05_MIND] as MindState | undefined;
  const dojo = w.elements[W04_DOJO] as DojoState | undefined;
  if (!life || !mind || !dojo) return;
  let state = w.elements[W07_BOND] as BondState | undefined;
  if (!state) {
    state = initBondState();
    w.elements[W07_BOND] = state;
  }
  const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
  if (gm <= state.minute) return;
  state.minute = gm;
  const clock = readClock(gm);
  const mod = clock.minuteOfDay;
  const pids = Object.keys(life.people).sort();
  const pidOf: Record<string, string> = {};
  for (const pid of pids) pidOf[life.people[pid].cid] = pid;

  // 1a. 邀請被拒（agent.ts 的 hooks 記下的）→ 邀請人的記憶
  if (state.pendingRejects.length) {
    for (const r of state.pendingRejects) {
      const inviter = life.people[r.inviter];
      const invitee = life.people[r.invitee];
      if (inviter && invitee) remember(mind, r.inviter, r.t, 'rejected', { other: invitee.cid });
    }
    state.pendingRejects = [];
  }

  // 1b. 在武館看到別人練功／指點（只記會影響關係的：對方高很多或相近）
  for (const a of pids) {
    const pa = life.people[a];
    const playerA = game.world.players.get(a as any);
    if (!playerA || pa.cur?.act === 'sleep') continue;
    if (personPlace(pa, playerA) !== 'dojo') continue;
    const fa = dojo.skills[pa.cid]?.fist ?? 0;
    for (const b of pids) {
      if (b === a) continue;
      const pb = life.people[b];
      const act = pb.cur?.phase === 'do' ? pb.cur.act : undefined;
      if (!act || !(TRAINING_ACTS.has(act) || act === COACH_ACT)) continue;
      const gap = (dojo.skills[pb.cid]?.fist ?? 0) - fa;
      if (gap >= BONDS.skillGap.respect || Math.abs(gap) <= BONDS.skillGap.rival) rememberDaily(mind, a, gm, 'saw_skill', pb.cid, gap);
    }
  }

  // 2. 寅初重算關係（第 1 日從卯正開始，第一次在第 2 日寅初）
  if (state.evalDay === 0) state.evalDay = clock.day;
  if (clock.day > state.evalDay && mod >= BONDS.evalMinuteOfDay) {
    state.evalDay = clock.day;
    state.bonds = computeBonds(mind, state, gm);
  }

  // 4. 門規
  checkRules(game, gm, clock.day, mod, state, life, mind, pidOf);

  // 3. 拜師
  if (state.active) stepBow(game, now, gm, state, life, mind, pidOf);
  else maybeStartBow(game, now, gm, mod, state, life, mind);

  // 5. 師父的「指點徒弟」時段
  const key = `${clock.day}|${mind.evalDay}|${Object.keys(state.disciples).sort().join(',')}`;
  if (state.blocksKey !== key) {
    state.blocksKey = key;
    state.masterBlocks = computeMasterBlocks(w, state, clock.day);
  }
}

function violation(state: BondState, mind: MindState, gm: number, day: number, rule: string, disciple: string, pidOf: Record<string, string>) {
  const master = state.disciples[disciple]?.master;
  if (!master) return;
  const name = RULE_BY_ID[rule]?.name ?? rule;
  const memories: Record<string, number> = {};
  const m1 = remember(mind, pidOf[disciple], gm, 'violated', { other: master, what: name });
  if (m1 !== undefined) memories[disciple] = m1;
  if (pidOf[master]) {
    const m2 = remember(mind, pidOf[master], gm, 'disciple_violated', { other: disciple, what: name });
    if (m2 !== undefined) memories[master] = m2;
  }
  state.violations.push({ id: state.seq++, day, gm, rule, disciple, master, memories });
  if (state.violations.length > 200) state.violations.splice(0, state.violations.length - 200);
}

function checkRules(
  game: Game,
  gm: number,
  day: number,
  mod: number,
  state: BondState,
  life: LifeState,
  mind: MindState,
  pidOf: Record<string, string>,
) {
  const w = game.world.wuxia!;
  // 不得私鬥：同門弟子在武館以外切磋（看 w06-spar 新的紀錄）
  const spar = w.elements[W06_SPAR] as SparState | undefined;
  if (spar) {
    for (const r of spar.history) {
      if (r.id <= state.sparSeen) continue;
      state.sparSeen = r.id;
      const da = state.disciples[r.a];
      const db = state.disciples[r.b];
      if (da && db && da.master === db.master && r.place !== 'dojo') {
        violation(state, mind, gm, day, 'no-private-fight', r.a, pidOf);
        violation(state, mind, gm, day, 'no-private-fight', r.b, pidOf);
      }
    }
  }
  // 辰時練功：辰時（07:00–09:00）在武館練功的分鐘；辰時結束時檢查（拜師當天辰時以後才入門的，從隔天算）
  const drill = RULE_BY_ID['morning-drill'];
  if (!drill) return;
  for (const cid of Object.keys(state.disciples).sort()) {
    const pid = pidOf[cid];
    if (!pid) continue;
    if (mod >= drill.from! && mod < drill.to! && trainingAct(life.people[pid])) {
      const d = state.drill[cid];
      state.drill[cid] = d && d[0] === day ? [day, d[1] + 1] : [day, 1];
    }
  }
  if (mod >= drill.to! && state.drillChecked < day) {
    state.drillChecked = day;
    const dayStart = gm - (mod - drill.from!);
    for (const cid of Object.keys(state.disciples).sort()) {
      if (state.disciples[cid].since > dayStart) continue;
      const d = state.drill[cid];
      const minutes = d && d[0] === day ? d[1] : 0;
      if (minutes < (drill.minMinutes ?? 1)) violation(state, mind, gm, day, 'morning-drill', cid, pidOf);
    }
  }
}

function maybeStartBow(game: Game, now: number, gm: number, mod: number, state: BondState, life: LifeState, mind: MindState) {
  if (mod < BONDS.bowWindow[0] || mod >= BONDS.bowWindow[1]) return;
  const pids = Object.keys(life.people).sort();
  for (const a of pids) {
    const pa = life.people[a];
    if (state.disciples[pa.cid]) continue;
    if ((state.refusedUntil[pa.cid] ?? -1) > gm) continue;
    const thought = mind.people[a]?.thoughts.find((t) => THOUGHT_BY_ID[t.id]?.effects.apprentice && t.target);
    if (!thought) continue;
    if (pa.needs.hunger >= BONDS.bowMaxNeed || pa.needs.fatigue >= BONDS.bowMaxNeed) continue;
    if (!free(game, a, pa)) continue;
    const b = pids.find((p) => life.people[p].cid === thought.target);
    if (!b) continue;
    const pb = life.people[b];
    if (!free(game, b, pb)) continue;
    const playerA = game.world.players.get(a as any)!;
    const playerB = game.world.players.get(b as any)!;
    interruptActivity(life, a, pa, gm, playerA);
    interruptActivity(life, b, pb, gm, playerB);
    stopPlayer(playerB);
    pa.cur = { act: 'bow', obj: '', slot: -1, phase: 'bow', since: gm, retries: 0 };
    pb.cur = { act: 'receive_bow', obj: '', slot: -1, phase: 'bow', since: gm, retries: 0 };
    delete pa.idleSince;
    delete pb.idleSince;
    // 弟子跪在師父左邊一格（動作圖面向右）；不能站就試右、下、上
    const bx = Math.round(playerB.position.x);
    const by = Math.round(playerB.position.y);
    const spots: Array<[number, number]> = [
      [bx - 1, by],
      [bx + 1, by],
      [bx, by + 1],
      [bx, by - 1],
    ];
    const spot = spots.find(([x, y]) => !blocked(game, now, { x, y }, playerA.id)) ?? [bx - 1, by];
    const ev: BowEvent = {
      id: state.seq++,
      a,
      b,
      ca: pa.cid,
      cb: pb.cid,
      startGm: gm,
      phase: 'approach',
      approachUntil: gm + BONDS.approachMinutes,
      spot,
      causes: [...thought.causes],
    };
    state.active = ev;
    const until = now + BONDS.approachMinutes * msPerGameMinute(game);
    playerA.activity = { description: '去拜師', emoji: '🚶', until };
    playerB.activity = { description: '等人', emoji: '🧍', until };
    if (Math.hypot(playerA.position.x - spot[0], playerA.position.y - spot[1]) > 0.01)
      movePlayer(game, now, playerA, { x: spot[0], y: spot[1] });
    pushLog(life, { t: gm, who: pa.cid, act: 'bow', obj: pb.cid, place: personPlace(pb, playerB) });
    return;
  }
}

function release(game: Game, life: LifeState, pid: string) {
  const person = life.people[pid];
  if (person?.cur?.phase === 'bow') delete person.cur;
  const player = game.world.players.get(pid as any);
  if (player) delete player.activity;
}

function stepBow(game: Game, now: number, gm: number, state: BondState, life: LifeState, mind: MindState, pidOf: Record<string, string>) {
  const ev = state.active!;
  const pa = game.world.players.get(ev.a as any);
  const pb = game.world.players.get(ev.b as any);
  if (!pa || !pb) {
    release(game, life, ev.a);
    release(game, life, ev.b);
    delete state.active;
    return;
  }
  if (ev.phase === 'approach') {
    const arrived = !pa.pathfinding && Math.hypot(pa.position.x - ev.spot[0], pa.position.y - ev.spot[1]) <= 0.5;
    if (!arrived && gm < ev.approachUntil) return;
    stopPlayer(pa);
    face(pa, pb.position.x, pb.position.y);
    face(pb, pa.position.x, pa.position.y);
    ev.phase = 'kneel';
    ev.kneelAt = gm;
    ev.kneelUntil = gm + BONDS.kneelMinutes;
    const until = now + BONDS.kneelMinutes * msPerGameMinute(game);
    pa.activity = { description: '拜師', emoji: '🙇', until };
    pb.activity = { description: '受禮', emoji: '🙏', until };
    return;
  }
  if (gm < ev.kneelUntil!) return;
  // 師父依規則同意（#559：親近 ≥ 0 且收徒數 < 3；周教頭第一個徒弟必收）
  const w = game.world.wuxia!;
  const close = state.bonds[ev.cb]?.[ev.ca]?.close ?? zeroBond().close;
  const respect = state.bonds[ev.ca]?.[ev.cb]?.respect ?? 0;
  const count = disciplesOf(state, ev.cb).length;
  let accepted: boolean;
  let reason: string;
  if (ev.cb === COACH_ID && count === 0) {
    accepted = true;
    reason = '周教頭第一個徒弟必收';
  } else if (count >= BONDS.maxDisciples) {
    accepted = false;
    reason = `收徒已滿 ${BONDS.maxDisciples} 人`;
  } else if (close < 0) {
    accepted = false;
    reason = `師父對他的親近 ${close} < 0`;
  } else {
    accepted = true;
    reason = `師父對他的親近 ${close} ≥ 0、收徒 ${count} < ${BONDS.maxDisciples}`;
  }
  const day = readClock(gm).day;
  const memories: Record<string, number> = {};
  if (accepted) {
    state.disciples[ev.ca] = { master: ev.cb, since: gm, day, order: count + 1 };
    const m1 = remember(mind, ev.a, gm, 'apprenticed', { other: ev.cb });
    const m2 = remember(mind, ev.b, gm, 'took_disciple', { other: ev.ca });
    if (m1 !== undefined) memories[ev.ca] = m1;
    if (m2 !== undefined) memories[ev.cb] = m2;
    if (ev.cb === COACH_ID && state.dojoName === undefined) {
      state.dojoName = dojoNameFor(w.seed);
      state.plaqueAt = gm;
    }
  } else {
    state.refusedUntil[ev.ca] = gm + BONDS.refuseCooldownDays * 1440;
    const m1 = remember(mind, ev.a, gm, 'rejected', { other: ev.cb, what: '拜師' });
    if (m1 !== undefined) memories[ev.ca] = m1;
  }
  state.events.push({ id: ev.id, day, gm, disciple: ev.ca, master: ev.cb, accepted, reason, causes: ev.causes, respect, close, memories });
  pushLog(life, { t: gm, who: ev.ca, act: accepted ? 'bow_ok' : 'bow_refused', obj: ev.cb });
  release(game, life, ev.a);
  release(game, life, ev.b);
  delete state.active;
  void pidOf;
}

/**
 * #559「師父日程加『指點』時段，會主動去弟子練功的地方」：弟子日程裡有練功的時段，師父那時候如果是留白或本來就在指點，
 * 就加一段「指點徒弟」（coach，在武館）。留白至少留 2 小時（#562 W3-5）。
 */
export function computeMasterBlocks(w: WuxiaState, state: BondState, day: number): BondState['masterBlocks'] {
  const out: BondState['masterBlocks'] = {};
  const masters = [...new Set(Object.values(state.disciples).map((d) => d.master))].sort();
  if (masters.length === 0) return out;
  const mind = w.enabled[W05_MIND] ? { blocks: mindBlocks(w), closed: closedOverlays(w) } : undefined;
  const ctx: SchedCtx = schedCtx(w.enabled, day, mind);
  for (const m of masters) {
    const ds = disciplesOf(state, m);
    const take = new Array<boolean>(1440).fill(false);
    let blank = blankMinutesPerDay(m, ctx);
    for (let t = 0; t < 1440; t++) {
      const db = ds.map((d) => currentBlock(d, t, ctx)).find((b) => b && b.do.some((a) => TRAINING_ACTS.has(a)));
      if (!db) continue;
      const mb = currentBlock(m, t, ctx);
      if (mb && !mb.do.includes(COACH_ACT)) continue;
      if (!mb) {
        if (blank <= 120) continue;
        blank--;
      }
      take[t] = true;
    }
    const blocks: ScheduleBlock[] = [];
    for (let t = 0; t < 1440; t++) {
      if (!take[t]) continue;
      let e = t;
      while (e < 1440 && take[e]) e++;
      blocks.push({ from: t, to: e, label: '指點徒弟', do: [COACH_ACT] } as ScheduleBlock);
      t = e;
    }
    if (blocks.length) out[m] = blocks as any;
  }
  return out;
}

