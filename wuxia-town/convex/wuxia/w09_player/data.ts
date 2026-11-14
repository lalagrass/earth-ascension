// 武俠小鎮 W9（#561，元素 id `w09-player`）：玩家角色的資料（data/wuxia/player.json）與純函式。
// 這個檔案只放資料與不改狀態的函式，w03-life 也會 import（不可 import w03_life/index，避免循環）。
import playerJson from '../../../data/wuxia/player.json';
import type { WuxiaState } from '../state';
import { SchedCtx, ScheduleBlock, schedCtx } from '../w03_life/data';
import { closedOverlays, mindOf } from '../w05_mind/data';

export const W09_PLAYER = 'w09-player';

export type PlayerRole = {
  id: string;
  label: string;
  sprite: string;
  defaultName: string;
  identity: string;
};

export const PLAYER = playerJson as unknown as {
  roles: PlayerRole[];
  home: string;
  acts: string[];
  startSkills: Record<string, number>;
  idleToAutoMinutes: number;
  ask: { minutes: number; minGap: number; maxNeed: number; act: string };
  logSize: number;
};

export const PLAYER_ROLES = PLAYER.roles;
export const PLAYER_ACTS = new Set(PLAYER.acts);
/** objects.json 的 owner 寫這個＝玩家專用（茶館客床） */
export const PLAYER_OWNER = '@player';
/** 只在有玩家加入時才放進 w03-life 預約表的物件 */
export const PLAYER_OBJECTS = ['guest-bed'];
/** 閒置多久（引擎毫秒＝實時間）交給規則代管 */
export const IDLE_TO_AUTO_MS = PLAYER.idleToAutoMinutes * 60_000;
/** 請教：走到對方身邊的期限（遊戲分鐘） */
export const ASK_APPROACH_MINUTES = 20;

export type PlayerMode = 'manual' | 'auto';

export type PlayerRec = {
  pid: string;
  /** 玩家角色在各元素裡的人物 id（player-1、player-2…） */
  cid: string;
  role: string;
  /** 加入的遊戲分鐘 */
  joinedAt: number;
  mode: PlayerMode;
  /** 切到目前 mode 的遊戲分鐘 */
  since: number;
};

export type PlayerLog = {
  id: number;
  /** 遊戲分鐘 */
  t: number;
  who: string;
  op: string;
  target?: string;
  ok: boolean;
  reason: string;
};

export type AskSession = {
  id: number;
  a: string;
  b: string;
  ca: string;
  cb: string;
  phase: 'approach' | 'lesson';
  startGm: number;
  approachUntil: number;
  lessonFrom?: number;
  lessonUntil?: number;
  spot: [number, number];
};

export type PlayerState = {
  v: 1;
  seq: number;
  /** 依加入順序 */
  players: PlayerRec[];
  /** 單人世界暫停中：暫停開始的引擎時間 */
  paused?: { since: number; by: string };
  asks: AskSession[];
  log: PlayerLog[];
};

export function initPlayerState(): PlayerState {
  return { v: 1, seq: 1, players: [], asks: [], log: [] };
}

export function playerStateOf(w: WuxiaState | undefined): PlayerState | undefined {
  if (!w || !w.enabled[W09_PLAYER]) return undefined;
  return w.elements[W09_PLAYER] as PlayerState | undefined;
}

/** 已登記的玩家（依加入順序）。沒有玩家加入的世界回傳空陣列。 */
export function humanPlayers(w: WuxiaState | undefined): PlayerRec[] {
  return playerStateOf(w)?.players ?? [];
}

export function playerRec(w: WuxiaState | undefined, pid: string): PlayerRec | undefined {
  return humanPlayers(w).find((p) => p.pid === pid);
}

export function isPlayerCid(cid: string): boolean {
  return cid.startsWith('player-');
}

/**
 * 玩家角色的日程情境：跟 lifeSchedCtx 一樣看元素開關與「武館還沒重開」擋下的覆蓋、W7 門規／指點時段，
 * 但不含心念加的時段（#561「玩家的心念只顯示，不改玩家行為」）。
 */
export function playerSchedCtx(w: WuxiaState, day?: number): SchedCtx {
  const ctx = mindOf(w) ? schedCtx(w.enabled, day, { closed: closedOverlays(w) }) : schedCtx(w.enabled, day);
  const master = w.enabled['w07-bond']
    ? (w.elements['w07-bond'] as { masterBlocks?: Record<string, ScheduleBlock[]> } | undefined)?.masterBlocks
    : undefined;
  if (master && Object.keys(master).length) {
    const blocks: Record<string, ScheduleBlock[]> = { ...(ctx.blocks ?? {}) };
    for (const cid of Object.keys(master)) blocks[cid] = [...master[cid], ...(blocks[cid] ?? [])];
    ctx.blocks = blocks;
  }
  return ctx;
}

/**
 * A3（#574）：玩家發起無言互動的掛鉤。a3-silent 模組載入時填入（避免 w09 → a3 → a2 → registry 的循環 import）；
 * 只放函式、不放狀態，不影響 hash。
 */
export const SOCIAL_HOOK: {
  act?: (game: any, now: number, a: string, b: string, kind: string) => { ok: boolean; reason: string };
} = {};
