// 武俠小鎮 W8：事件共用的工具（接手／放回鎮民、外人走路、對打、聽到傳聞）。只用 game.rng() 與 tick 的 now。
import type { Game } from '../../aiTown/game';
import type { Player } from '../../aiTown/player';
import type { WuxiaState } from '../state';
import { movePlayer, stopPlayer } from '../../aiTown/movement';
import { LifeState, Person, interruptActivity, personPlace, pushLog } from '../w03_life';
import { W05_MIND, remember } from '../w05_mind';
import type { MindState } from '../w05_mind/data';
import { skillsOf } from '../w06_spar/data';
import { boutOutcome, firstAttacker, startBout, stepBout, Fighter } from '../w06_spar/duel';
import {
  ActiveEvent,
  ChronicleEntry,
  Facts,
  Fight,
  Figure,
  Heard,
  JIANGHU,
  JianghuState,
  Rumor,
  RumorAbout,
  Via,
  cidName,
  distortFacts,
  rumorText,
} from './data';

export type Ctx = {
  game: Game;
  now: number;
  gm: number;
  day: number;
  mod: number;
  w: WuxiaState;
  st: JianghuState;
  life: LifeState;
  mind?: MindState;
};

export type EventImpl = {
  start: (c: Ctx, ev: ActiveEvent) => void;
  /** 每遊戲分鐘一次；回傳 true＝事件結束 */
  tick: (c: Ctx, ev: ActiveEvent) => boolean;
  /** 收場：回傳編年模板句與結局摘要，並產生傳聞 */
  end: (c: Ctx, ev: ActiveEvent) => { text: string; outcome: Record<string, any>; rumors: number[] };
};

export type PersonRef = { pid: string; person: Person; player: Player; cid: string };

/** 鎮民（依 pid 排序，確定性）。 */
export function people(c: Ctx): PersonRef[] {
  const out: PersonRef[] = [];
  for (const pid of Object.keys(c.life.people).sort()) {
    const player = c.game.world.players.get(pid as any);
    if (!player || player.human) continue;
    const person = c.life.people[pid];
    out.push({ pid, person, player, cid: person.cid });
  }
  return out;
}

export function pidOf(c: Ctx, cid: string): string | undefined {
  for (const [pid, p] of Object.entries(c.life.people)) if (p.cid === cid) return pid;
  return undefined;
}

export function placeOf(r: PersonRef): string {
  return personPlace(r.person, r.player);
}

/** 可以被事件接手：醒著、不在對話、沒被別的元素接手（切磋／旁觀／拜師／事件）。 */
export function available(c: Ctx, r: PersonRef): boolean {
  if (c.game.world.playerConversation(r.player)) return false;
  const cur = r.person.cur;
  if (cur && cur.phase !== 'do' && cur.phase !== 'walk') return false;
  if (cur?.act === 'sleep') return false;
  return true;
}

export function awake(r: PersonRef): boolean {
  return r.person.cur?.act !== 'sleep';
}

/** 事件接手一個鎮民（w03-life 不替 phase 'event' 的人做決定）。dest 給了就走過去。 */
export function enlist(c: Ctx, ev: ActiveEvent, r: PersonRef, act: string, desc: string, emoji: string, dest?: [number, number]) {
  interruptActivity(c.life, r.pid, r.person, c.gm, r.player);
  r.person.cur = { act, obj: ev.kind, slot: -1, phase: 'event', since: c.gm, retries: 0 };
  delete r.person.idleSince;
  r.player.activity = { description: desc, emoji, until: c.now + 6 * 3600_000 };
  if (dest && (r.player.position.x !== dest[0] || r.player.position.y !== dest[1])) movePlayer(c.game, c.now, r.player, { x: dest[0], y: dest[1] });
  if (!ev.enlisted.includes(r.pid)) ev.enlisted.push(r.pid);
  pushLog(c.life, { t: c.gm, who: r.cid, act: `event:${act}`, obj: ev.kind });
}

/** 改變已接手的人的動作（不再中斷）。 */
export function setAct(c: Ctx, r: PersonRef, act: string, desc: string, emoji: string, dest?: [number, number]) {
  if (r.person.cur?.phase === 'event') r.person.cur.act = act;
  r.player.activity = { description: desc, emoji, until: c.now + 6 * 3600_000 };
  if (dest && (r.player.position.x !== dest[0] || r.player.position.y !== dest[1])) movePlayer(c.game, c.now, r.player, { x: dest[0], y: dest[1] });
}

/** 放回 w03-life。 */
export function release(c: Ctx, ev: ActiveEvent, pid: string) {
  const person = c.life.people[pid];
  const player = c.game.world.players.get(pid as any);
  if (person?.cur?.phase === 'event') delete person.cur;
  if (player) {
    stopPlayer(player);
    delete player.activity;
  }
  ev.enlisted = ev.enlisted.filter((p) => p !== pid);
}

export function releaseAll(c: Ctx, ev: ActiveEvent) {
  for (const pid of [...ev.enlisted]) release(c, ev, pid);
}

export function arrived(player: Player, spot: [number, number], tol = 1.5) {
  return !player.pathfinding && Math.hypot(player.position.x - spot[0], player.position.y - spot[1]) <= tol;
}

export function face(player: Player, toX: number, toY: number) {
  const dx = toX - player.position.x;
  const dy = toY - player.position.y;
  if (Math.abs(dx) >= Math.abs(dy)) player.facing = { dx: dx >= 0 ? 1 : -1, dy: 0 };
  else player.facing = { dx: 0, dy: dy >= 0 ? 1 : -1 };
}

// ---------- 外人 ----------

export function addFigure(c: Ctx, ev: ActiveEvent | undefined, f: Omit<Figure, 'id'>): Figure {
  const fig: Figure = { id: `f${c.st.seq++}`, ...f };
  c.st.figures.push(fig);
  if (ev) ev.figures.push(fig.id);
  return fig;
}

export function figure(c: Ctx, id: string): Figure | undefined {
  return c.st.figures.find((f) => f.id === id);
}

export function removeFigure(c: Ctx, id: string) {
  c.st.figures = c.st.figures.filter((f) => f.id !== id);
}

/** 每遊戲分鐘：外人往目的地走 1 格（先橫後直）；離鎮的人到了就消失。 */
export function stepFigures(c: Ctx) {
  for (const f of [...c.st.figures]) {
    if (!f.to) continue;
    if (f.x !== f.to[0]) f.x += f.to[0] > f.x ? 1 : -1;
    else if (f.y !== f.to[1]) f.y += f.to[1] > f.y ? 1 : -1;
    if (f.x === f.to[0] && f.y === f.to[1]) {
      delete f.to;
      if (f.leaving) removeFigure(c, f.id);
    }
  }
}

export function figureAt(f: Figure, spot: [number, number]) {
  return f.x === spot[0] && f.y === spot[1] && !f.to;
}

// ---------- 對打（W6 判定）----------

export function startFight(c: Ctx, a: Fight['a'], b: Fight['b'], fa: Fighter, fb: Fighter): Fight {
  return { a, b, bout: startBout(fa, fb, firstAttacker(() => c.game.rng())), startGm: c.gm };
}

export function townFighter(c: Ctx, cid: string): Fighter {
  const s = skillsOf(c.w, cid);
  return { fist: s.fist, power: s.power, stance: s.stance, stamina: s.stamina };
}

/** 一回合（每遊戲分鐘一回合，同 W6 每 1 實秒一回合）。打完回傳結果。 */
export function stepFight(c: Ctx, f: Fight): { winner: 0 | 1 | 'draw'; rounds: number } | undefined {
  stepBout(f.bout, () => c.game.rng());
  if (f.bout.winner === undefined) return undefined;
  const out = boutOutcome(f.bout);
  return { winner: out.winner as 0 | 1 | 'draw', rounds: out.rounds };
}

// ---------- 記憶與傳聞 ----------

export function memo(c: Ctx, pid: string | undefined, kind: any, extra: Record<string, any> = {}): number | undefined {
  if (!pid || !c.mind || !c.w.enabled[W05_MIND]) return undefined;
  return remember(c.mind, pid, c.gm, kind, extra);
}

export function newRumor(c: Ctx, about: RumorAbout, truth: Facts, event?: number): Rumor {
  const r: Rumor = { id: c.st.rumorSeq++, about, truth, text: rumorText(about, truth), day: c.day, gm: c.gm, event };
  c.st.rumors.push(r);
  return r;
}

export function knows(st: JianghuState, cid: string, rid: number): boolean {
  return !!st.known[cid]?.some((h) => h.rid === rid);
}

/**
 * cid 得到傳聞 rid 的某個版本。親眼看到（via 'saw'）＝真版本、不走樣；聽來的（talk／story）每一手 20% 走樣。
 * 已經知道的不再記。寫 W5 記憶「聽說…」（what＝傳聞類別，n＝傳聞 id），可觸發心念（例：聽說山賊 → 想學武）。
 */
export function hear(c: Ctx, cid: string, rumor: Rumor, via: Via, from?: { cid: string; heard?: Heard }): boolean {
  if (knows(c.st, cid, rumor.id)) return false;
  let facts: Facts = rumor.truth;
  let hop = 0;
  let distorted = false;
  if (via !== 'saw' && from) {
    facts = from.heard?.facts ?? rumor.truth;
    hop = (from.heard?.hop ?? 0) + 1;
    if (c.game.rng() < JIANGHU.rumor.distort) {
      facts = distortFacts(rumor.about, facts);
      distorted = true;
    }
  }
  const text = rumorText(rumor.about, facts);
  const h: Heard = { rid: rumor.id, facts, text, from: from?.cid, via, hop, day: c.day, gm: c.gm, distorted };
  (c.st.known[cid] ??= []).push(h);
  c.st.trail.push({ rid: rumor.id, day: c.day, gm: c.gm, from: from?.cid, to: cid, via, hop, distorted, text });
  memo(c, pidOf(c, cid), 'rumor', { what: rumor.about, n: rumor.id, other: from?.cid });
  return true;
}

export function heardOf(st: JianghuState, cid: string, rid: number): Heard | undefined {
  return st.known[cid]?.find((h) => h.rid === rid);
}

export function chronicle(c: Ctx, e: Omit<ChronicleEntry, 'day' | 'gm'>) {
  c.st.chronicle.push({ day: c.day, gm: c.gm, ...e });
}

export function names(list: string[]): string {
  return list.map(cidName).join('、');
}
