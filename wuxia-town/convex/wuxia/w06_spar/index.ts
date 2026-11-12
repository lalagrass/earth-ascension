// 武俠小鎮 W6（#558，元素 id `w06-spar`）：同地圖切磋。
// - 誰會切磋：w03-life 的決策多一個候選活動「切磋」（data.ts sparCandidate），選中時兩人的 cur 變成 phase 'spar'、
//   本元素接手：走到場子（approach）→ 每 1 實秒一回合（fight，判定在 duel.ts）→ 打完收勢到 30 遊戲分鐘（rest）。
// - 旁觀：開打時同一地點醒著、沒在聊天的人停下手上的事、轉向兩人（phase 'watch'），打完就放回 w03-life。
// - 結果：W5 記憶（勝／負／平、旁觀者「看到 X 勝 Y」）、雙方拳腳＋打樁 2 小時的量、旁白（先放模板句，
//   再排一個 operation 讓 LLM 寫一句；LLM 的結果以 input 回來，只換文字，不影響規則）。
// - 只用 game.rng() 與 tick 的 now；不等 LLM。本元素排在 w05-mind 之後。
// 狀態存在 world.wuxia.elements['w06-spar']。
import type { Game } from '../../aiTown/game';
import type { Player } from '../../aiTown/player';
import type { WuxiaElement } from '../registry';
import type { WuxiaState } from '../state';
import { gameMinutes, readClock } from '../clock';
import { stopPlayer } from '../../aiTown/movement';
import { W03_LIFE, LifeState, interruptActivity, personPlace, pushLog } from '../w03_life';
import { W04_DOJO, DojoState, addGain } from '../w04_dojo';
import { W05_MIND, remember } from '../w05_mind';
import type { MindState } from '../w05_mind/data';
import { gainPerMinute } from '../w04_dojo/data';
import { SPAR, boutOutcome, boutView, firstAttacker, startBout, stepBout } from './duel';
import {
  Narration,
  SPAR_RULES,
  SparMatch,
  SparRecord,
  SparState,
  W06_SPAR,
  initSparState,
  msPerGameMinute,
  skillsOf,
} from './data';
import { sparNarrationTemplate } from './narration';

export { W06_SPAR } from './data';

export const sparElement: WuxiaElement = {
  id: W06_SPAR,
  requires: [W04_DOJO, W05_MIND],
  init: (state: WuxiaState) => {
    state.elements[W06_SPAR] = initSparState();
  },
  tick: (game, now) => tickSpar(game, now),
  handleInput: {
    // LLM 旁白回來（convex/wuxia/w06_spar/narrate.ts）：只換文字
    wuxiaSparNarration: (game, _now, args: { matchId: number; text: string; guard: string }) =>
      applyNarration(game, args),
  },
};

const NAME = (game: Game, pid: string) => game.playerDescriptions.get(pid as any)?.name ?? pid;
const nameOfCid = (game: Game, life: LifeState, cid: string) => {
  for (const [pid, p] of Object.entries(life.people)) if (p.cid === cid) return NAME(game, pid);
  return cid;
};

function face(player: Player, toX: number, toY: number) {
  const dx = toX - player.position.x;
  const dy = toY - player.position.y;
  if (Math.abs(dx) >= Math.abs(dy)) player.facing = { dx: dx >= 0 ? 1 : -1, dy: 0 };
  else player.facing = { dx: 0, dy: dy >= 0 ? 1 : -1 };
}

function arrived(player: Player, spot: [number, number]) {
  return !player.pathfinding && Math.hypot(player.position.x - spot[0], player.position.y - spot[1]) <= 0.5;
}

export function tickSpar(game: Game, now: number) {
  const w = game.world.wuxia!;
  if (w.clockEpoch === undefined) return;
  const life = w.elements[W03_LIFE] as LifeState | undefined;
  if (!life) return;
  let state = w.elements[W06_SPAR] as SparState | undefined;
  if (!state) {
    state = initSparState();
    w.elements[W06_SPAR] = state;
  }
  if (state.active.length === 0) return;
  const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
  for (const match of [...state.active]) {
    const pa = game.world.players.get(match.a as any);
    const pb = game.world.players.get(match.b as any);
    if (!pa || !pb) {
      // 有人離開世界：直接收場（不記勝負）
      endMatch(game, life, state, match, gm);
      continue;
    }
    if (match.phase === 'approach') {
      if ((arrived(pa, match.ring[0]) && arrived(pb, match.ring[1])) || gm >= match.approachUntil) {
        startFight(game, now, gm, life, match, pa, pb);
      }
    }
    if (match.phase === 'fight') {
      while (match.bout!.winner === undefined && now >= match.nextAt!) {
        stepBout(match.bout!, () => game.rng());
        match.times.push(match.nextAt!);
        match.nextAt! += SPAR.roundMs;
      }
      if (match.bout!.winner !== undefined) finishFight(game, now, gm, life, state, match);
    }
    if (match.phase === 'rest' && gm >= match.untilGm) endMatch(game, life, state, match, gm);
  }
}

function startFight(game: Game, now: number, gm: number, life: LifeState, match: SparMatch, pa: Player, pb: Player) {
  const w = game.world.wuxia!;
  stopPlayer(pa);
  stopPlayer(pb);
  face(pa, pb.position.x, pb.position.y);
  face(pb, pa.position.x, pa.position.y);
  const until = now + (match.untilGm - gm) * msPerGameMinute(game);
  pa.activity = { description: '切磋', emoji: '🤜', until };
  pb.activity = { description: '切磋', emoji: '🤛', until };
  match.phase = 'fight';
  match.fightAt = now;
  match.bout = startBout(skillsOf(w, match.ca), skillsOf(w, match.cb), firstAttacker(() => game.rng()));
  match.nextAt = now + SPAR.roundMs;
  // 旁觀：同地點、醒著、沒在聊天／走路的人停下來看（#558「停下活動，最多看到結束」）
  const cx = (pa.position.x + pb.position.x) / 2;
  const cy = (pa.position.y + pb.position.y) / 2;
  for (const pid of Object.keys(life.people).sort()) {
    if (pid === match.a || pid === match.b) continue;
    const person = life.people[pid];
    const player = game.world.players.get(pid as any);
    if (!player || player.human) continue;
    const cur = person.cur;
    if (cur && cur.phase !== 'do') continue;
    if (cur?.act === 'sleep') continue;
    if (game.world.playerConversation(player)) continue;
    if (personPlace(person, player) !== match.place) continue;
    interruptActivity(life, pid, person, gm, player);
    person.cur = { act: 'watch', obj: '', slot: -1, phase: 'watch', since: gm, retries: 0 };
    delete person.idleSince;
    face(player, cx, cy);
    player.activity = { description: '看切磋', emoji: '👀', until };
    match.spectators.push(pid);
    pushLog(life, { t: gm, who: person.cid, act: 'watch_spar', obj: match.ca, place: match.place });
  }
}

function finishFight(game: Game, now: number, gm: number, life: LifeState, state: SparState, match: SparMatch) {
  const w = game.world.wuxia!;
  const out = boutOutcome(match.bout!);
  const winner = out.winner === 'draw' ? undefined : out.winner === 0 ? match.ca : match.cb;
  const loser = out.winner === 'draw' ? undefined : out.winner === 0 ? match.cb : match.ca;
  const memories: Record<string, number> = {};
  const mind = w.enabled[W05_MIND] ? (w.elements[W05_MIND] as MindState | undefined) : undefined;
  const pidOf = (cid: string) => (cid === match.ca ? match.a : match.b);
  if (mind) {
    const put = (pid: string, cid: string, kind: any, extra: any) => {
      const id = remember(mind, pid, gm, kind, { place: match.place, ...extra });
      if (id !== undefined) memories[cid] = id;
    };
    if (winner && loser) {
      put(pidOf(winner), winner, 'spar_won', { other: loser });
      put(pidOf(loser), loser, 'spar_lost', { other: winner });
    } else {
      put(match.a, match.ca, 'spar_draw', { other: match.cb });
      put(match.b, match.cb, 'spar_draw', { other: match.ca });
    }
    for (const sp of match.spectators) {
      const cid = life.people[sp]?.cid;
      if (!cid) continue;
      put(sp, cid, 'spar_seen', { other: winner ?? match.ca, what: loser ?? match.cb, n: winner ? 1 : 0 });
    }
  }
  // 小量成長：雙方拳腳 + 打樁 2 小時的量（W4 公式，不含教頭加成）
  const growth: Record<string, number> = {};
  const dojo = w.elements[W04_DOJO] as DojoState | undefined;
  if (dojo) {
    for (const [pid, cid] of [
      [match.a, match.ca],
      [match.b, match.cb],
    ]) {
      const level = skillsOf(w, cid)[SPAR.growth.key];
      const fatigue = life.people[pid]?.needs.fatigue ?? 0;
      const g = gainPerMinute(SPAR.growth.act, SPAR.growth.key, level, false, fatigue) * SPAR.growth.minutes;
      growth[cid] = addGain(dojo, cid, SPAR.growth.key, g);
    }
  }
  match.result = { winner, loser, draw: !winner, rounds: out.rounds, endAt: now, endGm: gm, memories, growth };
  match.phase = 'rest';
  // 旁觀者放回 w03-life（下一個遊戲分鐘自己選下一件事）
  for (const sp of match.spectators) {
    const person = life.people[sp];
    if (person?.cur?.phase === 'watch') delete person.cur;
    const player = game.world.players.get(sp as any);
    if (player) delete player.activity;
  }
  // 收勢的標籤
  const pa = game.world.players.get(match.a as any);
  const pb = game.world.players.get(match.b as any);
  const until = now + Math.max(0, match.untilGm - gm) * msPerGameMinute(game);
  for (const [p, cid] of [
    [pa, match.ca],
    [pb, match.cb],
  ] as const) {
    if (!p) continue;
    const label = !winner ? '平手收勢' : cid === winner ? '勝・收勢' : '認輸・喘氣';
    p.activity = { description: label, emoji: !winner ? '🤝' : cid === winner ? '🙌' : '😮‍💨', until };
  }
  // 旁白：先放模板句（規則不等 LLM），再排 operation 讓 LLM 寫一句
  const names = (cid: string) => nameOfCid(game, life, cid);
  const lastMove = boutView(match.bout!).last?.move ?? SPAR.moves[0];
  match.narration = {
    text: sparNarrationTemplate(match.id, { winner, loser, a: match.ca, b: match.cb, rounds: out.rounds, move: lastMove }, names),
    source: 'template',
  };
  game.scheduleOperation('wuxiaSparNarrate', {
    worldId: game.worldId,
    matchId: match.id,
    place: match.place,
    a: names(match.ca),
    b: names(match.cb),
    winner: winner ? names(winner) : undefined,
    loser: loser ? names(loser) : undefined,
    rounds: out.rounds,
    move: lastMove,
    spectators: match.spectators.map((p) => NAME(game, p)),
    template: match.narration.text,
  });
  pushLog(life, { t: gm, who: match.ca, act: winner ? `spar_end:${winner}` : 'spar_end:draw', obj: match.cb, place: match.place });
}

function endMatch(game: Game, life: LifeState, state: SparState, match: SparMatch, gm: number) {
  for (const pid of [match.a, match.b]) {
    const person = life.people[pid];
    if (person?.cur?.phase === 'spar') {
      // 切磋算一個 30 遊戲分鐘的活動：結束時套用需求變化
      for (const [k, d] of Object.entries(SPAR.needsAfter)) {
        const v = (person.needs as any)[k];
        if (typeof v === 'number') (person.needs as any)[k] = Math.round(Math.max(0, Math.min(100, v + d)) * 100) / 100;
      }
      delete person.cur;
    }
    const player = game.world.players.get(pid as any);
    if (player) delete player.activity;
  }
  for (const sp of match.spectators) {
    const person = life.people[sp];
    if (person?.cur?.phase === 'watch') delete person.cur;
  }
  state.active = state.active.filter((m) => m.id !== match.id);
  if (match.result) {
    const bout = match.bout!;
    const rec: SparRecord = {
      id: match.id,
      day: readClock(match.startGm).day,
      startGm: match.startGm,
      place: match.place,
      a: match.ca,
      b: match.cb,
      first: bout.log[0] ? (bout.log[0].att === 0 ? match.ca : match.cb) : match.ca,
      winner: match.result.winner,
      draw: match.result.draw,
      rounds: match.result.rounds,
      log: bout.log.map((e) => [e.att === 0 ? match.ca : match.cb, e.move, e.p, e.hit]),
      spectators: match.spectators.map((p) => life.people[p]?.cid ?? p),
      memories: match.result.memories,
      growth: match.result.growth,
      narration: match.narration,
    };
    state.history.push(rec);
    if (state.history.length > SPAR_RULES.historySize)
      state.history.splice(0, state.history.length - SPAR_RULES.historySize);
  }
  pushLog(life, { t: gm, who: match.ca, act: 'spar_rest_end', obj: match.cb, place: match.place });
}

/** LLM 旁白回來：場次還在（收勢中）或已在紀錄裡，就換成 LLM 的句子。 */
export function applyNarration(game: Game, args: { matchId: number; text: string; guard: string }) {
  const state = game.world.wuxia?.elements[W06_SPAR] as SparState | undefined;
  if (!state) return null;
  const n: Narration = { text: args.text, source: args.guard === 'template' ? 'template' : 'llm', guard: args.guard };
  const m = state.active.find((x) => x.id === args.matchId);
  if (m) m.narration = n;
  const r = state.history.find((x) => x.id === args.matchId);
  if (r) r.narration = n;
  return null;
}
