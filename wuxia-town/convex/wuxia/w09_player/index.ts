// 武俠小鎮 W9（#561，元素 id `w09-player`）：玩家以一個角色住進鎮上，做跟 AI 鎮民一樣的事；玩家不動時世界照樣運轉。
// - 加入（上游 join input 多帶 wuxiaRole，WUXIA-PATCH(W9)）：選「外地少年／少女」，在 w03-life 建一個人（需求、技能、記憶、關係
//   都跟 AI 一樣由各元素照算；人物 id player-N）。第一個玩家加入時才把 w09-player 記進 enabled、建立本元素狀態，
//   所以沒有玩家加入的世界跟 W8 逐位元組相同（#561「玩家不加入時，世界 hash 與 W8 同 seed 一致」）。
// - 操作都是 input（可重播）：點物件選活動（同一套 allowed／預約／走過去／計時）、對人「請教」「切磋」「拜師」
//   （切磋走 W6 的同意規則、拜師走 W7 的拜師流程與師父同意規則、請教是本步新加的規則，見 data/wuxia/player.json）。
// - 閒置超過 30 實分鐘交給規則代管（auto：w03-life 跟 AI 一樣替他選事），玩家任何 input 都會接手（manual）。
//   上游「真人閒置 5 分鐘移除」改成不移除（#562 W9-14，WUXIA-PATCH(W9) player.ts）。
// - 單人世界可暫停（#562 W9-14）：暫停時引擎 tick 不跑、遊戲時鐘不走；繼續時把引擎時間戳記往後平移。
// 只用規則與 tick 的 now，不用 Math.random／Date.now；本元素不耗 game.rng()。
import type { Game } from '../../aiTown/game';
import type { Player } from '../../aiTown/player';
import type { WuxiaElement } from '../registry';
import { gameMinutes, readClock } from '../clock';
import { bumpEnabledEpoch } from '../enabledEpoch';
import { movePlayer, stopPlayer, blocked } from '../../aiTown/movement';
import {
  W03_LIFE,
  LifeState,
  Person,
  allowed,
  interruptActivity,
  personPlace,
  pushLog,
  walkTo,
} from '../w03_life';
import { NEEDS_CONFIG, NEED_KEYS, Needs, OBJECT_BY_ID, ActivityDef, ObjectDef, inRange } from '../w03_life/data';
import { W04_DOJO, DojoState, addGain, ensure } from '../w04_dojo';
import { SKILL_KEYS, Skills, gainPerMinute, initialSkills } from '../w04_dojo/data';
import { W05_MIND, remember } from '../w05_mind';
import type { MindState } from '../w05_mind/data';
import { W06_SPAR, agrees, beginSpar, pairKey, sparOf } from '../w06_spar/data';
import { SPAR } from '../w06_spar/duel';
import { W07_BOND, BONDS, BondState, bondBetween, bondOf } from '../w07_bond/data';
import { free as bondFree, startBow } from '../w07_bond';
import {
  ASK_APPROACH_MINUTES,
  IDLE_TO_AUTO_MS,
  PLAYER,
  PLAYER_OBJECTS,
  PLAYER_ROLES,
  PlayerRec,
  PlayerState,
  W09_PLAYER,
  initPlayerState,
  playerRec,
  playerSchedCtx,
  playerStateOf,
} from './data';

export { W09_PLAYER } from './data';

export const playerElement: WuxiaElement = {
  id: W09_PLAYER,
  requires: [W03_LIFE],
  // 不在建立世界時寫任何狀態：第一個玩家加入時才建立（見 joinPlayer）
  tick: (game, now) => tickPlayer(game, now),
};

const msPerGameMinute = (game: Game) => 60_000 / game.world.wuxia!.timeScale;

function gmOf(game: Game, now: number): number | undefined {
  const w = game.world.wuxia!;
  if (w.clockEpoch === undefined) return undefined;
  return gameMinutes(now, w.clockEpoch, w.timeScale);
}

function lifeOf(game: Game): LifeState | undefined {
  const w = game.world.wuxia;
  if (!w?.enabled[W03_LIFE]) return undefined;
  return w.elements[W03_LIFE] as LifeState | undefined;
}

function log(st: PlayerState, e: Omit<import('./data').PlayerLog, 'id'>) {
  st.log.push({ id: st.seq++, ...e });
  if (st.log.length > PLAYER.logSize) st.log.splice(0, st.log.length - PLAYER.logSize);
}

/** 上游 join 之後呼叫（只在 join 帶了 wuxiaRole 時）。回傳玩家的人物 id，條件不合就回 undefined（照上游真人處理）。 */
export function joinPlayer(game: Game, now: number, pid: string, roleId: string): string | undefined {
  const w = game.world.wuxia;
  if (!w || !w.enabled[W03_LIFE]) return undefined;
  const role = PLAYER_ROLES.find((r) => r.id === roleId);
  if (!role) return undefined;
  w.enabled[W09_PLAYER] = true;
  bumpEnabledEpoch(); // A1：開關快取重看
  let st = w.elements[W09_PLAYER] as PlayerState | undefined;
  if (!st) {
    st = initPlayerState();
    w.elements[W09_PLAYER] = st;
  }
  const life = w.elements[W03_LIFE] as LifeState | undefined;
  if (!life) return undefined;
  const n = st.players.length + 1;
  const cid = `player-${n}`;
  const gm = gmOf(game, now) ?? 0;
  st.players.push({ pid, cid, role: role.id, joinedAt: gm, mode: 'manual', since: gm });
  const needs = {} as Needs;
  for (const k of NEED_KEYS) needs[k] = NEEDS_CONFIG.initial[k];
  life.people[pid] = { cid, home: PLAYER.home, needs, blockDone: [], player: 1 };
  if (!life.stock[PLAYER.home]) life.stock[PLAYER.home] = { ...NEEDS_CONFIG.stock.initial };
  for (const id of PLAYER_OBJECTS) {
    const o = OBJECT_BY_ID[id];
    if (o && !life.res[id]) life.res[id] = o.slots.map(() => null);
  }
  const dojo = w.enabled[W04_DOJO] ? (w.elements[W04_DOJO] as DojoState | undefined) : undefined;
  if (dojo && !dojo.skills[cid]) {
    ensure(dojo, cid);
    for (const k of SKILL_KEYS) dojo.skills[cid][k] = Math.trunc(PLAYER.startSkills[k] ?? 0);
  }
  log(st, { t: gm, who: cid, op: 'join', target: role.id, ok: true, reason: `以「${role.label}」住進茶館客房` });
  return cid;
}

/** 玩家的 input 都算「回來了」：記 lastInput，代管中就接手。Game.handleInput 對帶 playerId 的 input 呼叫（WUXIA-PATCH(W9)）。 */
export function touchPlayer(game: Game, now: number, pid: string | undefined) {
  if (!pid) return;
  const st = playerStateOf(game.world.wuxia);
  const rec = st?.players.find((p) => p.pid === pid);
  if (!st || !rec) return;
  const player = game.world.players.get(pid as any);
  if (player) player.lastInput = now;
  if (rec.mode === 'auto') {
    const gm = gmOf(game, now) ?? 0;
    rec.mode = 'manual';
    rec.since = gm;
    log(st, { t: gm, who: rec.cid, op: 'takeover', ok: true, reason: '玩家回來，接手角色' });
  }
}

export function isManagedHuman(game: Game, pid: string): boolean {
  return !!playerRec(game.world.wuxia, pid);
}

export function isPaused(game: Game): boolean {
  return !!playerStateOf(game.world.wuxia)?.paused;
}

export function tickPlayer(game: Game, now: number) {
  const w = game.world.wuxia!;
  const st = w.elements[W09_PLAYER] as PlayerState | undefined;
  if (!st) return;
  const gm = gmOf(game, now);
  if (gm === undefined) return;
  const life = lifeOf(game);
  for (const rec of st.players) {
    const player = game.world.players.get(rec.pid as any);
    if (!player) continue;
    if (rec.mode === 'manual' && now - player.lastInput > IDLE_TO_AUTO_MS) {
      rec.mode = 'auto';
      rec.since = gm;
      log(st, {
        t: gm,
        who: rec.cid,
        op: 'auto',
        ok: true,
        reason: `閒置超過 ${PLAYER.idleToAutoMinutes} 實分鐘，交給規則代管`,
      });
    }
  }
  if (life) stepAsks(game, now, gm, st, life);
}

// ---------- 操作 ----------

export type ActArgs = {
  playerId?: string;
  human?: string;
  kind: string;
  obj?: string;
  act?: string;
  target?: string;
};

export type ActResult = { ok: boolean; reason: string };

function findPid(game: Game, args: { playerId?: string; human?: string }): string | undefined {
  if (args.playerId) return args.playerId;
  if (args.human) {
    for (const p of game.world.players.values()) if (p.human === args.human) return p.id as string;
  }
  return undefined;
}

const cidName = (game: Game, life: LifeState, cid: string) => {
  for (const [pid, p] of Object.entries(life.people))
    if (p.cid === cid) return game.playerDescriptions.get(pid as any)?.name ?? cid;
  return cid;
};

function pidOfCid(life: LifeState, cid: string): string | undefined {
  for (const [pid, p] of Object.entries(life.people)) if (p.cid === cid) return pid;
  return undefined;
}

/** 玩家此刻手上的事能不能放下（切磋、拜師、事件、請教中不行）。 */
function busyReason(game: Game, person: Person, player: Player): string | undefined {
  const ph = person.cur?.phase;
  if (ph === 'spar' || ph === 'watch') return '正在切磋';
  if (ph === 'bow') return '正在拜師';
  if (ph === 'event') return '正被江湖事件絆住';
  if (ph === 'player') return '正在請教';
  if (game.world.playerConversation(player)) return '正在跟人說話';
  return undefined;
}

/** 玩家選的活動：跟 allowed 同一套條件，只是不看「日程排到才做」（玩家自己決定什麼時候做）。逐條回傳不行的理由。 */
export function activityReason(
  game: Game,
  life: LifeState,
  person: Person,
  obj: ObjectDef,
  act: ActivityDef,
  gm: number,
): string | undefined {
  const w = game.world.wuxia!;
  const mod = readClock(gm).minuteOfDay;
  if (!life.res[obj.id]) return `這個世界沒有「${obj.name ?? obj.id}」`;
  if (!act.roles.includes('*') && !PLAYER.acts.includes(act.id)) return `「${act.label}」是鎮民的本業，玩家不能做`;
  if (obj.owner && obj.owner !== '@player') return '那是別人的床';
  if (obj.household && obj.household !== person.home) return '那是別人家的灶';
  if (act.requires?.timeOfDay && !inRange(mod, act.requires.timeOfDay)) return `這個時辰不能${act.label}`;
  if (obj.place === 'dojo') {
    const dojo = w.enabled[W04_DOJO] ? (w.elements[W04_DOJO] as DojoState | undefined) : undefined;
    if (dojo?.openedAt === undefined) return '武館還沒重開';
  }
  const { scheduledOnly: _s, scheduledOrNeed: _n, ...rest } = act.requires ?? {};
  const relaxed: ActivityDef = { ...act, requires: rest };
  if (!allowed(person, obj, relaxed, mod, life, playerSchedCtx(w, readClock(gm).day))) {
    if (act.requires?.minGap !== undefined) return `剛${act.label}過，還不需要`;
    if (act.requires?.whileActive) return `現在沒有人在${act.requires.whileActive === 'storytell' ? '說書' : act.requires.whileActive}`;
    if (act.consumes) return '家裡的東西不夠';
    if (act.gives) return '家裡已經滿了';
    return '現在不能做';
  }
  if (life.res[obj.id].indexOf(null) < 0) return '沒有空位';
  return undefined;
}

export function playerAct(game: Game, now: number, args: ActArgs): ActResult {
  const w = game.world.wuxia;
  const st = playerStateOf(w);
  const pid = findPid(game, args);
  const rec = pid ? st?.players.find((p) => p.pid === pid) : undefined;
  const life = lifeOf(game);
  if (!w || !st || !rec || !life) return { ok: false, reason: '不是鎮上的玩家角色' };
  touchPlayer(game, now, rec.pid);
  const gm = gmOf(game, now);
  const player = game.world.players.get(rec.pid as any);
  const person = life.people[rec.pid];
  const done = (r: ActResult): ActResult => {
    log(st, { t: gm ?? 0, who: rec.cid, op: args.kind, target: args.target ?? args.act, ...r });
    return r;
  };
  if (gm === undefined || !player || !person) return done({ ok: false, reason: '鎮上的時辰還沒開始' });
  if (st.paused) return done({ ok: false, reason: '世界暫停中' });
  const busy = busyReason(game, person, player);
  if (busy) return done({ ok: false, reason: busy });
  if (args.kind === 'activity') return done(doActivity(game, now, gm, life, rec, player, person, args));
  if (args.kind === 'ask') return done(doAsk(game, now, gm, st, life, rec, player, person, args.target ?? ''));
  if (args.kind === 'spar') return done(doSpar(game, now, gm, life, rec, player, person, args.target ?? ''));
  if (args.kind === 'apprentice')
    return done(doApprentice(game, now, gm, life, rec, player, person, args.target ?? ''));
  return done({ ok: false, reason: `不認得的操作 ${args.kind}` });
}

function doActivity(
  game: Game,
  now: number,
  gm: number,
  life: LifeState,
  rec: PlayerRec,
  player: Player,
  person: Person,
  args: ActArgs,
): ActResult {
  const obj = OBJECT_BY_ID[args.obj ?? ''];
  if (!obj) return { ok: false, reason: `沒有物件 ${args.obj}` };
  const act = obj.activities.find((a) => a.id === args.act);
  if (!act) return { ok: false, reason: `「${obj.name ?? obj.id}」沒有活動 ${args.act}` };
  const why = activityReason(game, life, person, obj, act, gm);
  if (why) return { ok: false, reason: why };
  if (person.cur?.obj === obj.id && person.cur.act === act.id)
    return { ok: true, reason: `已經在${person.cur.phase === 'do' ? '' : '去'}${act.label}` };
  interruptActivity(life, rec.pid, person, gm, player);
  delete person.idleSince;
  const slot = life.res[obj.id].indexOf(null);
  walkTo(game, now, gm, life, rec.pid, player, person, obj.id, act.id, slot);
  pushLog(life, { t: gm, who: person.cid, act: `player:${act.id}`, obj: obj.id });
  return { ok: true, reason: `走去${obj.name ?? obj.id}${act.label}` };
}

function targetOf(game: Game, life: LifeState, target: string) {
  const pid = life.people[target] ? target : pidOfCid(life, target);
  if (!pid) return undefined;
  const player = game.world.players.get(pid as any);
  if (!player) return undefined;
  return { pid, person: life.people[pid], player };
}

function skills(game: Game, cid: string): Skills {
  const dojo = game.world.wuxia!.enabled[W04_DOJO]
    ? (game.world.wuxia!.elements[W04_DOJO] as DojoState | undefined)
    : undefined;
  return dojo?.skills[cid] ?? initialSkills(cid);
}

function needsTooHigh(person: Person, max: number): boolean {
  return person.needs.hunger >= max || person.needs.fatigue >= max;
}

// ---------- 請教 ----------

function doAsk(
  game: Game,
  now: number,
  gm: number,
  st: PlayerState,
  life: LifeState,
  rec: PlayerRec,
  player: Player,
  person: Person,
  target: string,
): ActResult {
  const w = game.world.wuxia!;
  if (!w.enabled[W04_DOJO] || !w.enabled[W05_MIND]) return { ok: false, reason: '這個世界沒有練功與記憶（w04-dojo／w05-mind 未開）' };
  const t = targetOf(game, life, target);
  if (!t || t.pid === rec.pid) return { ok: false, reason: `找不到 ${target}` };
  const name = cidName(game, life, t.person.cid);
  if (!bondFree(game, t.pid, t.person)) return { ok: false, reason: `${name}現在沒空（睡覺、說話或正忙）` };
  if (needsTooHigh(person, PLAYER.ask.maxNeed)) return { ok: false, reason: '自己太餓或太累' };
  if (needsTooHigh(t.person, PLAYER.ask.maxNeed)) return { ok: false, reason: `${name}太餓或太累` };
  const gap = skills(game, t.person.cid).fist - skills(game, rec.cid).fist;
  if (gap < PLAYER.ask.minGap) return { ok: false, reason: `${name}的拳腳只比你高 ${gap}（< ${PLAYER.ask.minGap}），沒什麼可教` };
  if (w.enabled[W07_BOND]) {
    const close = bondBetween(w, t.person.cid, rec.cid).close;
    if (close < 0) return { ok: false, reason: `${name}對你的親近 ${close} < 0，不肯教` };
  }
  // 同意：對方放下手上的事，玩家走到對方身邊（左右下上第一個能站的格子）
  interruptActivity(life, rec.pid, person, gm, player);
  interruptActivity(life, t.pid, t.person, gm, t.player);
  delete person.idleSince;
  delete t.person.idleSince;
  const bx = Math.round(t.player.position.x);
  const by = Math.round(t.player.position.y);
  const spots: Array<[number, number]> = [
    [bx - 1, by],
    [bx + 1, by],
    [bx, by + 1],
    [bx, by - 1],
  ];
  const spot = spots.find(([x, y]) => !blocked(game, now, { x, y }, player.id)) ?? [bx - 1, by];
  person.cur = { act: 'ask', obj: '', slot: -1, phase: 'player', since: gm, retries: 0 };
  t.person.cur = { act: 'teach', obj: '', slot: -1, phase: 'player', since: gm, retries: 0 };
  const session = {
    id: st.seq++,
    a: rec.pid,
    b: t.pid,
    ca: rec.cid,
    cb: t.person.cid,
    phase: 'approach' as const,
    startGm: gm,
    approachUntil: gm + ASK_APPROACH_MINUTES,
    spot,
  };
  st.asks.push(session);
  const until = now + ASK_APPROACH_MINUTES * msPerGameMinute(game);
  player.activity = { description: '去請教', emoji: '🚶', until };
  t.player.activity = { description: '等人請教', emoji: '🧍', until };
  if (Math.hypot(player.position.x - spot[0], player.position.y - spot[1]) > 0.01)
    movePlayer(game, now, player, { x: spot[0], y: spot[1] });
  pushLog(life, { t: gm, who: rec.cid, act: 'ask', obj: t.person.cid, place: personPlace(t.person, t.player) });
  return { ok: true, reason: `${name}答應指點（拳腳高 ${gap}）` };
}

function endAsk(game: Game, life: LifeState, pid: string) {
  const person = life.people[pid];
  if (person?.cur?.phase === 'player') delete person.cur;
  const player = game.world.players.get(pid as any);
  if (player) delete player.activity;
}

function stepAsks(game: Game, now: number, gm: number, st: PlayerState, life: LifeState) {
  const w = game.world.wuxia!;
  for (const s of [...st.asks]) {
    const pa = game.world.players.get(s.a as any);
    const pb = game.world.players.get(s.b as any);
    const drop = () => {
      endAsk(game, life, s.a);
      endAsk(game, life, s.b);
      st.asks.splice(st.asks.indexOf(s), 1);
    };
    if (!pa || !pb) {
      drop();
      continue;
    }
    if (s.phase === 'approach') {
      const arrived = !pa.pathfinding && Math.hypot(pa.position.x - s.spot[0], pa.position.y - s.spot[1]) <= 0.5;
      if (!arrived && gm < s.approachUntil) continue;
      stopPlayer(pa);
      s.phase = 'lesson';
      s.lessonFrom = gm;
      s.lessonUntil = gm + PLAYER.ask.minutes;
      const until = now + PLAYER.ask.minutes * msPerGameMinute(game);
      pa.activity = { description: '請教', emoji: '🙇', until };
      pb.activity = { description: '指點', emoji: '👉', until };
      continue;
    }
    if (gm < s.lessonUntil!) continue;
    // 成長：按「打樁、教頭在場」的每分鐘成長算 minutes 分鐘（data/wuxia/training.json；不佔樁）
    const dojo = w.elements[W04_DOJO] as DojoState | undefined;
    const gains: string[] = [];
    if (dojo) {
      ensure(dojo, s.ca);
      const person = life.people[s.a];
      for (const k of SKILL_KEYS) {
        const g = gainPerMinute(PLAYER.ask.act, k, dojo.skills[s.ca][k], true, person?.needs.fatigue ?? 0) * PLAYER.ask.minutes;
        const got = addGain(dojo, s.ca, k, g);
        if (got > 0) gains.push(`${k}+${got}`);
      }
    }
    const mind = w.elements[W05_MIND] as MindState | undefined;
    if (mind) {
      remember(mind, s.a, gm, 'asked', { other: s.cb });
      remember(mind, s.b, gm, 'taught', { other: s.ca });
    }
    log(st, {
      t: gm,
      who: s.ca,
      op: 'ask-done',
      target: s.cb,
      ok: true,
      reason: `請教 ${PLAYER.ask.minutes} 遊戲分鐘${gains.length ? `（${gains.join(' ')}）` : ''}`,
    });
    pushLog(life, { t: gm, who: s.ca, act: 'ask_done', obj: s.cb });
    drop();
  }
}

// ---------- 切磋（W6 的同意規則） ----------

function doSpar(
  game: Game,
  now: number,
  gm: number,
  life: LifeState,
  rec: PlayerRec,
  player: Player,
  person: Person,
  target: string,
): ActResult {
  const w = game.world.wuxia!;
  const spar = sparOf(w);
  if (!spar) return { ok: false, reason: '這個世界沒有切磋（w06-spar 未開）' };
  const t = targetOf(game, life, target);
  if (!t || t.pid === rec.pid) return { ok: false, reason: `找不到 ${target}` };
  const name = cidName(game, life, t.person.cid);
  const place = personPlace(person, player);
  // #558：兩人都在武館或廣場、都醒著不累、不在對話／走路／另一場切磋裡；對方同意＝拳腳差距 < 300 或對方是教頭
  if (!SPAR.places.includes(place)) return { ok: false, reason: '切磋要在武館或廣場' };
  if (place === 'dojo') {
    const dojo = w.elements[W04_DOJO] as DojoState | undefined;
    if (dojo?.openedAt === undefined) return { ok: false, reason: '武館還沒重開' };
  }
  if (personPlace(t.person, t.player) !== place) return { ok: false, reason: `${name}不在這裡` };
  if (person.needs.fatigue >= SPAR.maxFatigue) return { ok: false, reason: '自己太累' };
  if (person.cur && (person.cur.phase !== 'do' || person.cur.act === 'sleep')) return { ok: false, reason: '手上的事還沒停' };
  const tp = t.person;
  if (t.player.human || tp.needs.fatigue >= SPAR.maxFatigue || game.world.playerConversation(t.player) || (tp.cur && (tp.cur.phase !== 'do' || tp.cur.act === 'sleep')))
    return { ok: false, reason: `${name}現在不能下場` };
  if (spar.active.some((m) => m.place === place)) return { ok: false, reason: '場子上已經有人在打' };
  const day = readClock(gm).day;
  if (spar.pairDay[pairKey(rec.cid, tp.cid)] === day) return { ok: false, reason: `今天已經跟${name}切磋過` };
  if (!agrees(w, rec.cid, tp.cid)) return { ok: false, reason: `${name}不肯（拳腳差距 ≥ ${SPAR.agreeFistGap}）` };
  interruptActivity(life, t.pid, tp, gm, t.player);
  interruptActivity(life, rec.pid, person, gm, player);
  stopPlayer(player);
  delete person.idleSince;
  delete tp.idleSince;
  person.cur = { act: 'spar', obj: '', slot: -1, phase: 'spar', since: gm, retries: 0 };
  tp.cur = { act: 'spar', obj: '', slot: -1, phase: 'spar', since: gm, retries: 0 };
  beginSpar(game, now, gm, day, rec.pid, t.pid, rec.cid, tp.cid, place);
  pushLog(life, { t: gm, who: rec.cid, act: 'spar', obj: tp.cid, place });
  return { ok: true, reason: `${name}答應切磋` };
}

// ---------- 拜師（W7 的拜師流程與師父同意規則） ----------

function doApprentice(
  game: Game,
  now: number,
  gm: number,
  life: LifeState,
  rec: PlayerRec,
  player: Player,
  person: Person,
  target: string,
): ActResult {
  const w = game.world.wuxia!;
  const bond = bondOf(w) as BondState | undefined;
  if (!w.enabled[W07_BOND] || !bond) return { ok: false, reason: '這個世界沒有拜師（w07-bond 未開）' };
  const t = targetOf(game, life, target);
  if (!t || t.pid === rec.pid) return { ok: false, reason: `找不到 ${target}` };
  const name = cidName(game, life, t.person.cid);
  if (bond.disciples[rec.cid]) return { ok: false, reason: `已經拜${cidName(game, life, bond.disciples[rec.cid].master)}為師` };
  if ((bond.refusedUntil[rec.cid] ?? -1) > gm) return { ok: false, reason: '剛被拒絕過，過幾天再說' };
  if (bond.active) return { ok: false, reason: '鎮上正有人在拜師' };
  const mod = readClock(gm).minuteOfDay;
  if (mod < BONDS.bowWindow[0] || mod >= BONDS.bowWindow[1]) return { ok: false, reason: '這個時辰不宜拜師' };
  // W7 想拜師的條件：對方技能高 200 以上（bonds.json skillGap.respect）
  const gap = skills(game, t.person.cid)[BONDS.skillGap.key as keyof Skills] - skills(game, rec.cid)[BONDS.skillGap.key as keyof Skills];
  if (gap < BONDS.skillGap.respect) return { ok: false, reason: `${name}的拳腳只比你高 ${gap}（< ${BONDS.skillGap.respect}）` };
  if (needsTooHigh(person, BONDS.bowMaxNeed)) return { ok: false, reason: '自己太餓或太累' };
  if (!bondFree(game, t.pid, t.person)) return { ok: false, reason: `${name}現在沒空` };
  // 跟 maybeStartBow 一樣中斷雙方手上的事，走到師父面前跪拜；師父同不同意由 stepBow 依規則判定
  startBow(game, now, gm, bond, life, rec.pid, t.pid, []);
  void player;
  return { ok: true, reason: `去向${name}拜師（師父的決定在跪拜後）` };
}

// ---------- 暫停（單人世界） ----------

export function setPaused(game: Game, now: number, args: { playerId?: string; human?: string; paused: boolean }): ActResult {
  const w = game.world.wuxia;
  const st = playerStateOf(w);
  const pid = findPid(game, args);
  const rec = pid ? st?.players.find((p) => p.pid === pid) : undefined;
  if (!w || !st || !rec) return { ok: false, reason: '不是鎮上的玩家角色' };
  const gm = gmOf(game, now) ?? 0;
  const humans = [...game.world.players.values()].filter((p) => p.human);
  if (args.paused) {
    if (st.paused) return { ok: true, reason: '已經暫停' };
    if (humans.length !== 1 || humans[0].id !== rec.pid) {
      log(st, { t: gm, who: rec.cid, op: 'pause', ok: false, reason: '只有單人世界可以暫停' });
      return { ok: false, reason: '只有單人世界可以暫停' };
    }
    st.paused = { since: now, by: rec.pid };
    log(st, { t: gm, who: rec.cid, op: 'pause', ok: true, reason: '暫停' });
    return { ok: true, reason: '暫停' };
  }
  if (!st.paused) return { ok: true, reason: '沒有暫停' };
  const dt = now - st.paused.since;
  delete st.paused;
  shiftEngineTimes(game, dt);
  const player = game.world.players.get(rec.pid as any);
  if (player) player.lastInput = now;
  // 平移後的時鐘＝暫停那一刻（暫停期間遊戲時間不走）
  log(st, { t: gmOf(game, now) ?? gm, who: rec.cid, op: 'resume', ok: true, reason: `繼續（暫停了 ${Math.round(dt / 1000)} 實秒）` });
  return { ok: true, reason: '繼續' };
}

/** 暫停期間引擎時間照走、遊戲時鐘不走：把時鐘起點與所有以引擎時間記的期限往後平移 dt。 */
export function shiftEngineTimes(game: Game, dt: number) {
  if (dt <= 0) return;
  const w = game.world.wuxia!;
  if (w.clockEpoch !== undefined) w.clockEpoch += dt;
  for (const p of game.world.players.values()) {
    p.lastInput += dt;
    if (p.activity) p.activity.until += dt;
    const pf = p.pathfinding;
    if (pf) {
      pf.started += dt;
      if (pf.state.kind === 'moving') for (const q of pf.state.path as any[]) q.t += dt;
      if (pf.state.kind === 'waiting') pf.state.until += dt;
    }
  }
  for (const c of game.world.conversations.values()) {
    c.created += dt;
    if (c.isTyping) c.isTyping.since += dt;
    if (c.lastMessage) c.lastMessage.timestamp += dt;
    for (const m of c.participants.values()) if (m.status.kind === 'participating') m.status.started += dt;
  }
  for (const a of game.world.agents.values()) {
    if (a.lastConversation !== undefined) a.lastConversation += dt;
    if (a.lastInviteAttempt !== undefined) a.lastInviteAttempt += dt;
    if (a.inProgressOperation) a.inProgressOperation.started += dt;
  }
}
