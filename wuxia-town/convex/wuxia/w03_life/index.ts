// 武俠小鎮 W3（#555，元素 id `w03-life`）：日程、需求與地點活動。
// 取代上游「隨機漫遊＋3 個隨機活動」：開啟時 Agent.tick 不再發出 agentDoSomething（WUXIA-PATCH(W3)），
// 改由本元素在引擎 tick 內（規則、確定性、只用 game.rng()）替每個閒下來的人選下一件事、預約物件座位、
// 走過去、計時、套用效果、釋放預約。另含 #562 W3 補充：每戶物資（水／飯／柴）、日程留白、對話 90 遊戲分鐘上限。
// 狀態存在 world.wuxia.elements['w03-life']（#549 §2 慣例；#562 寫的 wuxia.life.* 即此處）。
import type { Game } from '../../aiTown/game';
import type { Player } from '../../aiTown/player';
import type { WuxiaElement } from '../registry';
import type { WuxiaState } from '../state';
import { gameMinutes, readClock } from '../clock';
import { profileByName } from '../w02_folk';
import { movePlayer, stopPlayer } from '../../aiTown/movement';
import { Conversation } from '../../aiTown/conversation';
import { movementSpeed } from '../../../data/characters';
import {
  ACTIVITY_BY_ID,
  ActivityDef,
  LEISURE,
  NEEDS_CONFIG,
  NEED_KEYS,
  Needs,
  OBJECTS,
  OBJECT_BY_ID,
  ObjectDef,
  ONCE_PER_BLOCK,
  RESOURCES,
  SCHEDULES,
  Stock,
  currentBlock,
  inRange,
  placeAt,
} from './data';

export const W03_LIFE = 'w03-life';

/** 規則常數（遊戲分鐘）。數值調整寫在 docs/wuxia/W3.md。 */
export const LIFE_RULES = {
  scheduleWeight: 3,
  /** 需求急迫度的紓解權重：活動能扣掉 ≥ fullRelief 點才算滿分 */
  fullRelief: 20,
  noise: 0.3,
  /** 走不到：路徑結束卻離座位超過這個距離（格）就重試，重試超過 maxRetries 次放棄 */
  arriveDistance: 1.5,
  maxRetries: 2,
  /** 等超過：預估步行時間 ×1.5 再加 30 遊戲分鐘還沒到就放棄（#555「等超過 30 遊戲分鐘」，見 DEVIATIONS W3-2） */
  waitSlack: 30,
  /** 對話（#555「對話怎麼接」＋#562 W3-6） */
  inviteChancePerMinute: 0.08,
  /** 閒暇活動做到這個比例以上才會被邀去聊天；被對話打斷時若已做到這個比例，視為做完（吃飯不會只吃一口） */
  leisureMinFraction: 0.5,
  afterLeisureWindow: 10,
  personTalkCooldown: 30,
  pairTalkCooldown: 120,
  maxConversationMinutes: 90,
  exitNeed: 90,
  logSize: 500,
  /** 錯過的一次性時段（吃飯）在時段結束後還保留日程權重的分鐘數 */
  carryMinutes: 120,
  /** #562 W3-4 物資有來有去：家裡某樣物資 < lowStock 時，補這樣物資的活動（挑水、砍竹、煮飯）加 lowStockWeight */
  lowStock: 2,
  lowStockWeight: 1.5,
} as const;

export type Phase = 'walk' | 'do' | 'talk';
export type Current = {
  act: string;
  obj: string;
  slot: number;
  phase: Phase;
  /** 開始這個階段的遊戲分鐘 */
  since: number;
  /** do：預定結束的遊戲分鐘 */
  until?: number;
  /** walk：最晚抵達的遊戲分鐘 */
  deadline?: number;
  retries: number;
};

export type Person = {
  cid: string;
  home: string;
  needs: Needs;
  cur?: Current;
  /** 選不到事做的起點（遊戲分鐘）；選到就清掉 */
  idleSince?: number;
  lastLeisureEnd?: number;
  lastTalkEnd?: number;
  /** 目前時段已完成的「一次性」活動（#schedules once） */
  blockKey?: string;
  blockDone: string[];
  /** 有 requires.minGap 的活動上次做完的遊戲分鐘 */
  lastDone?: Record<string, number>;
};

/** obj：物件 id（invite 時是被邀的人）；place：invite 時兩人所在的地點 */
export type LifeEvent = { t: number; who: string; act: string; obj: string; place?: string };

export type LifeState = {
  v: 1;
  /** 最後處理過的遊戲分鐘 */
  minute: number;
  /** 鍵是 playerId（遍歷順序＝加入順序，確定性） */
  people: Record<string, Person>;
  /** 每個物件每個座位被誰預約（playerId 或 null） */
  res: Record<string, Array<string | null>>;
  /** 每戶物資，鍵是 home 地點 id */
  stock: Record<string, Stock>;
  /** 生活事件環形紀錄（最近 logSize 筆） */
  log: LifeEvent[];
  /** 兩人上一次開始對話的遊戲分鐘，鍵 "a|b"（排序後） */
  pairs: Record<string, number>;
};

export function initLifeState(): LifeState {
  const res: LifeState['res'] = {};
  for (const o of OBJECTS) res[o.id] = o.slots.map(() => null);
  return { v: 1, minute: -1, people: {}, res, stock: {}, log: [], pairs: {} };
}

export const lifeElement: WuxiaElement = {
  id: W03_LIFE,
  // w02-folk 本身 requires w01-skin（registry 的循環檢查不接受菱形相依，只列直接上層）
  requires: ['w02-folk'],
  init: (state: WuxiaState) => {
    state.elements[W03_LIFE] = initLifeState();
  },
  tick: (game, now) => tickLife(game, now),
};

export function lifeState(game: Game): LifeState | undefined {
  return game.world.wuxia?.elements[W03_LIFE] as LifeState | undefined;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

/** 需求急迫度：> soft 線性加分到 softMax；> hard 時一定壓過日程（hardBase > 日程權重＋擾動）。 */
export function urgency(v: number): number {
  const u = NEEDS_CONFIG.urgency;
  if (v > u.hard) return u.hardBase + (v - u.hard) * u.hardSlope;
  if (v > u.soft) return ((v - u.soft) / (u.hard - u.soft)) * u.softMax;
  return 0;
}

function pushLog(state: LifeState, e: LifeEvent) {
  state.log.push(e);
  if (state.log.length > LIFE_RULES.logSize) state.log.splice(0, state.log.length - LIFE_RULES.logSize);
}

function release(state: LifeState, playerId: string, cur: Current | undefined) {
  if (!cur || !cur.obj) return;
  const seats = state.res[cur.obj];
  if (seats && seats[cur.slot] === playerId) seats[cur.slot] = null;
}

function stockOf(state: LifeState, home: string): Stock {
  if (!state.stock[home]) state.stock[home] = { ...NEEDS_CONFIG.stock.initial };
  return state.stock[home];
}

function applyNeeds(person: Person, delta: Partial<Needs> | undefined, fraction = 1) {
  if (!delta) return;
  for (const k of NEED_KEYS) {
    const d = delta[k];
    if (d) person.needs[k] = round2(clamp(person.needs[k] + d * fraction));
  }
}

/** 某人此刻能不能做某物件的某活動（不看座位）。 */
export function allowed(
  person: Person,
  obj: ObjectDef,
  act: ActivityDef,
  minuteOfDay: number,
  state: LifeState,
): boolean {
  if (!act.roles.includes('*') && !act.roles.includes(person.cid)) return false;
  if (obj.owner && obj.owner !== person.cid) return false;
  if (obj.household && obj.household !== person.home) return false;
  if (act.requires?.timeOfDay && !inRange(minuteOfDay, act.requires.timeOfDay)) return false;
  if (act.requires?.scheduledOrNeed) {
    const block = currentBlock(person.cid, minuteOfDay);
    const scheduled = !!block && block.do.includes(act.id);
    if (!scheduled && person.needs[act.requires.scheduledOrNeed] <= NEEDS_CONFIG.urgency.soft)
      return false;
  }
  if (act.requires?.minGap !== undefined) {
    const last = person.lastDone?.[act.id];
    if (last !== undefined && state.minute - last < act.requires.minGap) return false;
  }
  if (act.requires?.whileActive) {
    const target = act.requires.whileActive;
    if (!Object.values(state.people).some((p) => p.cur?.phase === 'do' && p.cur.act === target))
      return false;
  }
  const stock = stockOf(state, person.home);
  for (const r of RESOURCES) {
    const need = act.consumes?.[r];
    if (need && stock[r] < need) return false;
  }
  // 物資已滿就不再生產（避免一直挑水）
  const gives = RESOURCES.filter((r) => act.gives?.[r]);
  if (gives.length > 0 && gives.every((r) => stock[r] >= NEEDS_CONFIG.stock.max[r])) return false;
  return true;
}

/** 剛結束（carryMinutes 內）、含有 actId 的時段，回傳那個時段開始的遊戲分鐘（絕對值）。 */
export function missedBlockStart(
  cid: string,
  actId: string,
  minuteOfDay: number,
  gm: number,
): number | undefined {
  for (const b of SCHEDULES[cid]?.blocks ?? []) {
    if (!b.do.includes(actId)) continue;
    const sinceEnd = (minuteOfDay - b.to + 1440) % 1440;
    if (sinceEnd >= LIFE_RULES.carryMinutes) continue;
    const length = (b.to - b.from + 1440) % 1440;
    return gm - sinceEnd - length;
  }
  return undefined;
}

export type Candidate = { obj: string; act: string; slot: number; score: number; parts: string };

/** 規則決策（#555「決策」）：分數＝日程權重＋需求急迫度＋小擾動。r 是 game.rng。 */
export function chooseNext(
  person: Person,
  minuteOfDay: number,
  blockKey: string | undefined,
  state: LifeState,
  r: () => number,
): Candidate | undefined {
  const block = currentBlock(person.cid, minuteOfDay);
  const done = person.blockKey === blockKey ? person.blockDone : [];
  const sched = (actId: string) => {
    if (block && block.do.includes(actId))
      return ONCE_PER_BLOCK.includes(actId) && done.includes(actId) ? 0 : LIFE_RULES.scheduleWeight;
    // 一次性的事（吃飯）錯過了時段（被對話或工作拖過頭）：時段結束後 carryMinutes 內、還沒做過，就繼續有日程權重
    if (ONCE_PER_BLOCK.includes(actId)) {
      const missed = missedBlockStart(person.cid, actId, minuteOfDay, state.minute);
      if (missed !== undefined && (person.lastDone?.[actId] ?? -Infinity) < missed)
        return LIFE_RULES.scheduleWeight;
    }
    return 0;
  };
  const stock = stockOf(state, person.home);
  // #562 W3-4：沒飯時「煮飯」繼承「餓」的急迫度（也繼承吃飯的日程權重）；缺水／缺柴時，挑水／砍竹再繼承一次
  const food = stock.meal < 1 ? Math.max(urgency(person.needs.hunger), sched('eat')) : 0;
  let best: Candidate | undefined;
  for (const obj of OBJECTS) {
    const seats = state.res[obj.id];
    const slot = seats.indexOf(null);
    if (slot < 0) continue;
    for (const act of obj.activities) {
      if (!allowed(person, obj, act, minuteOfDay, state)) continue;
      let score = sched(act.id);
      for (const k of NEED_KEYS) {
        // 急迫度乘上這個活動能紓解多少（扣 20 以上算滿），喝茶順便止一點餓不會被當成吃飯
        const relief = -(act.needs?.[k] ?? 0);
        if (relief > 0) score += urgency(person.needs[k]) * Math.min(1, relief / LIFE_RULES.fullRelief);
      }
      if (RESOURCES.some((r) => act.gives?.[r] && stock[r] < LIFE_RULES.lowStock)) {
        score += LIFE_RULES.lowStockWeight;
      }
      if (food > 0) {
        if (act.id === 'cook') score += food;
        else if ((act.gives?.water && stock.water < 1) || (act.gives?.wood && stock.wood < 1))
          score += food;
      }
      score += (r() * 2 - 1) * LIFE_RULES.noise;
      if (!best || score > best.score) {
        best = { obj: obj.id, act: act.id, slot, score, parts: '' };
      }
    }
  }
  return best;
}

function msPerGameMinute(game: Game) {
  return 60_000 / game.world.wuxia!.timeScale;
}

function startDoing(game: Game, now: number, gm: number, state: LifeState, player: Player, person: Person) {
  const cur = person.cur!;
  const act = ACTIVITY_BY_ID[cur.act];
  const stock = stockOf(state, person.home);
  for (const r of RESOURCES) {
    const n = act.consumes?.[r];
    if (n) stock[r] = stock[r] - n;
  }
  cur.phase = 'do';
  cur.since = gm;
  cur.until = gm + act.minutes;
  player.activity = {
    description: act.label,
    emoji: act.emoji,
    until: now + act.minutes * msPerGameMinute(game),
  };
  pushLog(state, { t: gm, who: person.cid, act: cur.act, obj: cur.obj });
}

function finish(state: LifeState, playerId: string, person: Person, gm: number, fraction: number) {
  const cur = person.cur!;
  const act = ACTIVITY_BY_ID[cur.act];
  applyNeeds(person, act.needs, fraction);
  if (fraction >= 1) {
    const stock = stockOf(state, person.home);
    for (const r of RESOURCES) {
      const n = act.gives?.[r];
      if (n) stock[r] = Math.min(NEEDS_CONFIG.stock.max[r], stock[r] + n);
    }
    if (ONCE_PER_BLOCK.includes(act.id)) person.blockDone.push(act.id);
    if (act.requires?.minGap !== undefined || ONCE_PER_BLOCK.includes(act.id))
      (person.lastDone ??= {})[act.id] = gm;
  }
  if (LEISURE.has(act.id)) person.lastLeisureEnd = gm;
  release(state, playerId, cur);
  delete person.cur;
}

function abandon(state: LifeState, playerId: string, person: Person, gm: number, player: Player) {
  const cur = person.cur!;
  release(state, playerId, cur);
  stopPlayer(player);
  pushLog(state, { t: gm, who: person.cid, act: 'abandon', obj: cur.obj });
  delete person.cur;
}

export function tickLife(game: Game, now: number) {
  const w = game.world.wuxia!;
  if (w.clockEpoch === undefined) return;
  let state = w.elements[W03_LIFE] as LifeState | undefined;
  if (!state) {
    state = initLifeState();
    w.elements[W03_LIFE] = state;
  }
  const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
  if (gm <= state.minute) return;
  const elapsed = state.minute < 0 ? 0 : gm - state.minute;
  state.minute = gm;
  const clock = readClock(gm);
  const mod = clock.minuteOfDay;

  // 依 agents 的加入順序處理（確定性）
  for (const agent of game.world.agents.values()) {
    const player = game.world.players.get(agent.playerId);
    if (!player || player.human) continue;
    const pid = player.id as string;
    let person = state.people[pid];
    if (!person) {
      const name = game.playerDescriptions.get(player.id)?.name;
      const profile = name ? profileByName(name) : undefined;
      if (!profile) continue;
      const needs = {} as Needs;
      for (const k of NEED_KEYS) {
        needs[k] = round2(
          clamp(NEEDS_CONFIG.initial[k] + (game.rng() * 2 - 1) * NEEDS_CONFIG.jitter),
        );
      }
      person = { cid: profile.id, home: profile.home, needs, blockDone: [] };
      state.people[pid] = person;
      stockOf(state, person.home);
    }
    // 需求隨時間增加（每遊戲小時固定量）
    if (elapsed > 0) {
      for (const k of NEED_KEYS) {
        person.needs[k] = round2(clamp(person.needs[k] + (NEEDS_CONFIG.perHour[k] * elapsed) / 60));
      }
    }
    const block = currentBlock(person.cid, mod);
    const blockKey = block ? `${clock.day}:${block.from}` : undefined;
    if (person.blockKey !== blockKey) {
      person.blockKey = blockKey;
      person.blockDone = [];
    }

    const conversation = game.world.playerConversation(player);
    if (conversation) {
      if (person.cur && person.cur.phase !== 'talk') {
        const cur = person.cur;
        if (cur.phase === 'do') {
          const act = ACTIVITY_BY_ID[cur.act];
          const fraction = Math.min(1, (gm - cur.since) / act.minutes);
          finish(state, pid, person, gm, fraction >= LIFE_RULES.leisureMinFraction ? 1 : fraction);
        } else {
          release(state, pid, cur);
          delete person.cur;
        }
      }
      if (!person.cur) {
        person.cur = { act: 'talk', obj: '', slot: -1, phase: 'talk', since: gm, retries: 0 };
        pushLog(state, { t: gm, who: person.cid, act: 'talk', obj: placeAt(player.position.x, player.position.y) });
      }
      delete person.idleSince;
      // #562 W3-6：對話最長 90 遊戲分鐘；餓或累 > 90 直接離開
      const talked = gameMinutes(now, conversation.created, w.timeScale);
      const tooLong = talked >= LIFE_RULES.maxConversationMinutes;
      const urgent =
        person.needs.hunger > LIFE_RULES.exitNeed || person.needs.fatigue > LIFE_RULES.exitNeed;
      if (tooLong || urgent) {
        pushLog(state, {
          t: gm,
          who: person.cid,
          act: tooLong ? 'leave-talk:time' : 'leave-talk:need',
          obj: '',
        });
        conversation.leave(game, now, player);
      }
      continue;
    }
    if (person.cur?.phase === 'talk') {
      applyNeeds(person, NEEDS_CONFIG.talk);
      person.lastTalkEnd = gm;
      delete person.cur;
    }

    if (person.cur?.phase === 'walk') {
      const cur = person.cur;
      const [sx, sy] = OBJECT_BY_ID[cur.obj].slots[cur.slot];
      if (player.pathfinding) {
        if (gm > cur.deadline!) abandon(state, pid, person, gm, player);
      } else {
        const dist = Math.hypot(player.position.x - sx, player.position.y - sy);
        if (dist <= LIFE_RULES.arriveDistance) {
          startDoing(game, now, gm, state, player, person);
        } else if (cur.retries < LIFE_RULES.maxRetries && gm <= cur.deadline!) {
          cur.retries++;
          movePlayer(game, now, player, { x: sx, y: sy });
        } else {
          abandon(state, pid, person, gm, player);
        }
      }
    }

    if (person.cur?.phase === 'do' && gm >= person.cur.until!) {
      finish(state, pid, person, gm, 1);
    }

    if (!person.cur) {
      const pick = chooseNext(person, mod, blockKey, state, () => game.rng());
      if (!pick) {
        if (person.idleSince === undefined) person.idleSince = gm;
        continue;
      }
      delete person.idleSince;
      state.res[pick.obj][pick.slot] = pid;
      const [sx, sy] = OBJECT_BY_ID[pick.obj].slots[pick.slot];
      const walkTiles = Math.abs(player.position.x - sx) + Math.abs(player.position.y - sy);
      const tilesPerGameMinute = (movementSpeed * 60) / w.timeScale;
      person.cur = {
        act: pick.act,
        obj: pick.obj,
        slot: pick.slot,
        phase: 'walk',
        since: gm,
        deadline: gm + Math.ceil((walkTiles / tilesPerGameMinute) * 1.5) + LIFE_RULES.waitSlack,
        retries: 0,
      };
      if (Math.hypot(player.position.x - sx, player.position.y - sy) <= 0.01) {
        stopPlayer(player);
        startDoing(game, now, gm, state, player, person);
      } else {
        movePlayer(game, now, player, { x: sx, y: sy });
      }
    }
  }

  inviteToTalk(game, now, gm, state);
}

/** 目前所在地點：在做事就看物件的地點，不然看站的位置。 */
export function personPlace(person: Person, player: Player): string {
  if (person.cur?.phase === 'do') return OBJECT_BY_ID[person.cur.obj].place;
  return placeAt(player.position.x, player.position.y);
}

const LEISURE_PLACES = new Set(
  OBJECTS.filter((o) => o.activities.some((a) => a.leisure)).map((o) => o.place),
);

function canChat(game: Game, gm: number, pid: string, person: Person): boolean {
  // 該睡覺的時段不邀人聊天
  if (currentBlock(person.cid, readClock(gm).minuteOfDay)?.do.includes('sleep')) return false;
  const player = game.world.players.get(pid as any);
  if (!player || game.world.playerConversation(player)) return false;
  const agent = [...game.world.agents.values()].find((a) => a.playerId === player.id);
  if (!agent || agent.inProgressOperation) return false;
  if (person.lastTalkEnd !== undefined && gm - person.lastTalkEnd < LIFE_RULES.personTalkCooldown)
    return false;
  const cur = person.cur;
  if (cur?.phase === 'do')
    return (
      LEISURE.has(cur.act) &&
      gm - cur.since >= ACTIVITY_BY_ID[cur.act].minutes * LIFE_RULES.leisureMinFraction
    );
  // 「結束後」：剛做完閒暇活動、正走向下一個閒暇活動（例如喝完茶換桌聽書）；走去幹活的人不邀
  return (
    cur?.phase === 'walk' &&
    LEISURE.has(cur.act) &&
    person.lastLeisureEnd !== undefined &&
    gm - person.lastLeisureEnd <= LIFE_RULES.afterLeisureWindow
  );
}

/** #555「對話怎麼接」：只有閒暇活動中或剛結束、且兩人在同一地點，才會邀請；工作中不聊。 */
function inviteToTalk(game: Game, now: number, gm: number, state: LifeState) {
  const ids = Object.keys(state.people);
  for (const a of ids) {
    const pa = state.people[a];
    if (!canChat(game, gm, a, pa)) continue;
    const playerA = game.world.players.get(a as any)!;
    const placeA = personPlace(pa, playerA);
    // 只在有閒暇物件的地點（茶館、河邊、各家飯桌）開口；走在街上不攀談
    if (!LEISURE_PLACES.has(placeA)) continue;
    let best: { id: string; d: number } | undefined;
    for (const b of ids) {
      if (b === a) continue;
      const pb = state.people[b];
      if (!canChat(game, gm, b, pb)) continue;
      const playerB = game.world.players.get(b as any)!;
      if (personPlace(pb, playerB) !== placeA) continue;
      const key = [a, b].sort().join('|');
      if (state.pairs[key] !== undefined && gm - state.pairs[key] < LIFE_RULES.pairTalkCooldown)
        continue;
      const d = Math.hypot(
        playerA.position.x - playerB.position.x,
        playerA.position.y - playerB.position.y,
      );
      if (!best || d < best.d) best = { id: b, d };
    }
    if (!best) continue;
    if (game.rng() >= LIFE_RULES.inviteChancePerMinute) continue;
    const playerB = game.world.players.get(best.id as any)!;
    const result = Conversation.start(game, now, playerA, playerB);
    if ('conversationId' in result) {
      const agentA = [...game.world.agents.values()].find((x) => x.playerId === playerA.id)!;
      agentA.lastInviteAttempt = now;
      state.pairs[[a, best.id].sort().join('|')] = gm;
      pushLog(state, { t: gm, who: pa.cid, act: 'invite', obj: state.people[best.id].cid, place: placeA });
    }
  }
}
