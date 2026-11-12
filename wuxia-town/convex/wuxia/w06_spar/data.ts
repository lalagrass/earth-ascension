// 武俠小鎮 W6（#558，元素 id `w06-spar`）：切磋的狀態型別、W3 決策用的候選活動「切磋」、開場。
// 本檔不 import w03_life／w04_dojo／w05_mind 的 index（w03_life 會反過來 import 本檔），只 import 純資料模組。
// 判定（勢、回合）在 duel.ts，本檔與其他系統只透過 duel.ts 的函式碰它（#562 W6-11）。
import type { Game } from '../../aiTown/game';
import type { WuxiaState } from '../state';
import { movePlayer } from '../../aiTown/movement';
import { mindOf } from '../w05_mind/data';
import { initialSkills, Skills } from '../w04_dojo/data';
import { Bout, SPAR } from './duel';

export const W06_SPAR = 'w06-spar';
const W04_DOJO_ID = 'w04-dojo';

export type SparMatch = {
  id: number;
  place: string;
  /** 發起人與對方（playerId） */
  a: string;
  b: string;
  /** 人物 id */
  ca: string;
  cb: string;
  /** 開始（走向場子）的遊戲分鐘；untilGm＝這個 30 遊戲分鐘活動結束 */
  startGm: number;
  untilGm: number;
  approachUntil: number;
  phase: 'approach' | 'fight' | 'rest';
  /** 兩人站的格子：[發起人, 對方] */
  ring: [[number, number], [number, number]];
  /** 判定狀態（duel.ts 專用） */
  bout?: Bout;
  /** 每回合的引擎時間（畫面用來算前衝／後退的動畫） */
  times: number[];
  /** 下一回合的引擎時間 */
  nextAt?: number;
  /** 開打時的引擎時間 */
  fightAt?: number;
  /** 旁觀者（playerId） */
  spectators: string[];
  result?: SparResult;
  narration?: Narration;
};

export type SparResult = {
  /** 贏家／輸家人物 id；平手時 undefined */
  winner?: string;
  loser?: string;
  draw: boolean;
  rounds: number;
  /** 結束的引擎時間與遊戲分鐘 */
  endAt: number;
  endGm: number;
  /** 寫進 W5 記憶的 id（追因果用）：人物 id → 記憶 id */
  memories: Record<string, number>;
  /** 雙方拳腳成長（人物 id → 加了多少） */
  growth: Record<string, number>;
};

export type Narration = {
  text: string;
  source: 'template' | 'llm';
  /** LLM 回來時的守門結果 */
  guard?: string;
};

/** 打完的場次摘要（報告用，保留最近 historySize 場）。 */
export type SparRecord = {
  id: number;
  day: number;
  startGm: number;
  place: string;
  a: string;
  b: string;
  first: string;
  winner?: string;
  draw: boolean;
  rounds: number;
  /** 每回合：攻方人物 id、招、守方反應成功率、是否擊中 */
  log: Array<[string, string, number, boolean]>;
  spectators: string[];
  memories: Record<string, number>;
  growth: Record<string, number>;
  narration?: Narration;
};

export type SparState = {
  v: 1;
  seq: number;
  active: SparMatch[];
  /** 兩人（人物 id 排序後 "a|b"）上次切磋的遊戲日 */
  pairDay: Record<string, number>;
  history: SparRecord[];
};

export const SPAR_RULES = { historySize: 200 } as const;

export function initSparState(): SparState {
  return { v: 1, seq: 1, active: [], pairDay: {}, history: [] };
}

export function sparOf(w: WuxiaState | undefined): SparState | undefined {
  if (!w || !w.enabled[W06_SPAR]) return undefined;
  return w.elements[W06_SPAR] as SparState | undefined;
}

export function pairKey(c1: string, c2: string): string {
  return [c1, c2].sort().join('|');
}

/** 判定看的技能值（w04-dojo 的目前值；還沒建立的用起始值）。 */
export function skillsOf(w: WuxiaState, cid: string): Skills {
  const dojo = w.elements[W04_DOJO_ID] as { skills?: Record<string, Skills> } | undefined;
  return { ...(dojo?.skills?.[cid] ?? initialSkills(cid)) };
}

/** 這個人有沒有讓他想切磋的心念（#558「想變強」；W7 加「競爭」）。 */
export function motivated(w: WuxiaState, pid: string): boolean {
  const mind = mindOf(w);
  return !!mind?.people[pid]?.thoughts.some((t) => SPAR.motivation.includes(t.id));
}

/** #558：對象同意＝拳腳差距 < 300，或對方是教頭。 */
export function agrees(w: WuxiaState, challengerCid: string, targetCid: string): boolean {
  if (targetCid === SPAR.coachAlwaysAgrees) return true;
  return Math.abs(skillsOf(w, challengerCid).fist - skillsOf(w, targetCid).fist) < SPAR.agreeFistGap;
}

/** 決策時需要的最少資訊（w03-life 傳進來，避免 import w03_life）。 */
export type PersonView = {
  cid: string;
  needs: { fatigue: number };
  cur?: { act: string; phase: string };
};

export type SparCandidate = { target: string; score: number };

/** 能不能下場（發起或被邀）：醒著、不累、不在對話／走路／另一場切磋裡。 */
export function canFight(game: Game, pid: string, person: PersonView): boolean {
  if (person.needs.fatigue >= SPAR.maxFatigue) return false;
  const player = game.world.players.get(pid as any);
  if (!player || player.human) return false;
  if (game.world.playerConversation(player)) return false;
  const cur = person.cur;
  if (cur && cur.phase !== 'do') return false;
  if (cur && cur.act === 'sleep') return false;
  return true;
}

/**
 * #558「在 W3 決策裡加候選活動『切磋』」：pid 閒下來要選下一件事時呼叫。
 * 有合格的對象才回傳候選（分數＝score＋擾動，這時才耗 1 個亂數）；沒有就回 undefined、不耗亂數。
 */
export function sparCandidate(
  game: Game,
  gm: number,
  day: number,
  pid: string,
  person: PersonView,
  people: Record<string, PersonView>,
  placeOf: (pid: string) => string,
  r: () => number,
  noise: number,
): SparCandidate | undefined {
  const w = game.world.wuxia!;
  const state = sparOf(w);
  if (!state) return undefined;
  const place = placeOf(pid);
  if (!SPAR.places.includes(place)) return undefined;
  if (place === 'dojo') {
    const dojo = w.elements[W04_DOJO_ID] as { openedAt?: number } | undefined;
    if (dojo?.openedAt === undefined) return undefined;
  }
  if (!canFight(game, pid, person)) return undefined;
  if (state.active.some((m) => m.place === place)) return undefined;
  const me = game.world.players.get(pid as any)!;
  let best: { id: string; d: number } | undefined;
  for (const other of Object.keys(people).sort()) {
    if (other === pid) continue;
    const op = people[other];
    if (!canFight(game, other, op)) continue;
    if (placeOf(other) !== place) continue;
    if (state.pairDay[pairKey(person.cid, op.cid)] === day) continue;
    if (!motivated(w, pid) && !motivated(w, other)) continue;
    if (!agrees(w, person.cid, op.cid)) continue;
    const p = game.world.players.get(other as any)!;
    const d = Math.hypot(me.position.x - p.position.x, me.position.y - p.position.y);
    if (!best || d < best.d) best = { id: other, d };
  }
  if (!best) return undefined;
  return { target: best.id, score: SPAR.score + (r() * 2 - 1) * noise };
}

/**
 * 開場：記下這一對今天切磋過、兩人走向場子（發起人站左格）。
 * 呼叫端（w03-life）先把對方手上的事中斷、把兩人的 cur 設成 phase 'spar'。
 */
export function beginSpar(
  game: Game,
  now: number,
  gm: number,
  day: number,
  a: string,
  b: string,
  ca: string,
  cb: string,
  place: string,
): SparMatch {
  const state = sparOf(game.world.wuxia)!;
  const spots = SPAR.ring[place];
  const pa = game.world.players.get(a as any)!;
  const pb = game.world.players.get(b as any)!;
  // 發起人站離自己近的那一格
  const d0 = Math.hypot(pa.position.x - spots[0][0], pa.position.y - spots[0][1]);
  const d1 = Math.hypot(pa.position.x - spots[1][0], pa.position.y - spots[1][1]);
  const ring: SparMatch['ring'] =
    d0 <= d1 ? [[...spots[0]] as [number, number], [...spots[1]] as [number, number]] : [[...spots[1]] as [number, number], [...spots[0]] as [number, number]];
  const match: SparMatch = {
    id: state.seq++,
    place,
    a,
    b,
    ca,
    cb,
    startGm: gm,
    untilGm: gm + SPAR.activityMinutes,
    approachUntil: gm + SPAR.approachMinutes,
    phase: 'approach',
    ring,
    times: [],
    spectators: [],
  };
  state.pairDay[pairKey(ca, cb)] = day;
  state.active.push(match);
  for (const [player, spot] of [
    [pa, ring[0]],
    [pb, ring[1]],
  ] as const) {
    player.activity = { description: '切磋', emoji: '🤜', until: now + SPAR.activityMinutes * msPerGameMinute(game) };
    if (player.position.x !== spot[0] || player.position.y !== spot[1]) movePlayer(game, now, player, { x: spot[0], y: spot[1] });
  }
  return match;
}

export function msPerGameMinute(game: Game) {
  return 60_000 / game.world.wuxia!.timeScale;
}
